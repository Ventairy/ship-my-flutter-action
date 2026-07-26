import { CommitParser } from "conventional-commits-parser";
import semver from "semver";
const platformScopes = new Set([
    "ios",
    "android",
    "macos",
    "windows",
    "linux",
    "web",
]);
const parser = new CommitParser();
function platformForScope(scope) {
    if (!scope)
        return ["ios"];
    const scopes = scope
        .toLowerCase()
        .split(/[,/\\|]/u)
        .map((value) => value.trim())
        .filter(Boolean);
    const explicitPlatforms = scopes.filter((value) => platformScopes.has(value));
    if (explicitPlatforms.length === 0)
        return ["ios"];
    return explicitPlatforms.includes("ios") ? ["ios"] : [];
}
function bumpFor(type, breaking) {
    if (breaking)
        return "major";
    switch (type?.toLowerCase()) {
        case "feat":
            return "minor";
        case "fix":
        case "perf":
        case "deps":
            return "patch";
        default:
            return null;
    }
}
function footerValue(message, platform) {
    const platformMatch = message.match(new RegExp(`^Release-As-${platform}:\\s*(\\S+)\\s*$`, "imu"));
    const globalMatch = message.match(/^Release-As:\s*(\S+)\s*$/imu);
    const value = platformMatch?.[1] ?? globalMatch?.[1];
    return value &&
        semver.valid(value) &&
        semver.prerelease(value) === null &&
        (semver.parse(value)?.build.length ?? 0) === 0
        ? value
        : undefined;
}
export function parseConventionalCommit(sha, message) {
    const parsed = parser.parse(message);
    const conventionalHeader = message
        .split("\n", 1)[0]
        ?.match(/^([a-z][a-z0-9-]*)(?:\(([^)]+)\))?(!)?:\s*(.+)$/iu);
    const breaking = conventionalHeader?.[3] === "!" ||
        parsed.notes.some((note) => /^(?:BREAKING CHANGE|BREAKING-CHANGE)$/iu.test(note.title));
    const scope = conventionalHeader?.[2] ?? parsed.scope ?? null;
    const type = conventionalHeader?.[1] ?? parsed.type ?? "other";
    const platforms = platformForScope(scope);
    const releaseAs = footerValue(message, "ios");
    return {
        sha,
        type,
        scope,
        description: conventionalHeader?.[4] ??
            parsed.subject ??
            parsed.header ??
            message.split("\n")[0] ??
            "",
        body: parsed.body ?? null,
        breaking,
        bump: bumpFor(type, breaking),
        platforms,
        ...(releaseAs ? { releaseAs } : {}),
    };
}
export function highestBump(changes) {
    const rank = { patch: 1, minor: 2, major: 3 };
    let result = null;
    for (const change of changes) {
        if (change.bump && (!result || rank[change.bump] > rank[result])) {
            result = change.bump;
        }
    }
    return result;
}
//# sourceMappingURL=conventional.js.map
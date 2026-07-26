import type { ChangelogRelease, ConventionalChange, Platform } from "./types.js";
export declare function formatChange(change: ConventionalChange): string;
export declare function releaseNotesMarkdown(platform: Platform, release: ChangelogRelease): string;
export declare function releasePullRequestBody(platform: Platform, release: ChangelogRelease): string;
//# sourceMappingURL=changelog.d.ts.map
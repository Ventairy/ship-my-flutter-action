import path from "node:path";
export const shipDirectoryName = ".ship-my-flutter";
export function resolveShipPaths(root = process.cwd()) {
    const directory = path.join(root, shipDirectoryName);
    return {
        root,
        directory,
        config: path.join(directory, "config.json"),
        manifest: path.join(directory, "manifest.json"),
        changelog: path.join(directory, "changelog.json"),
        storeReleaseNotes: path.join(directory, "store-release-notes.json"),
        candidates: path.join(directory, "candidates"),
    };
}
export function candidatePath(root, platform, version) {
    return path.join(resolveShipPaths(root).candidates, `${platform}-${version}.json`);
}
//# sourceMappingURL=paths.js.map
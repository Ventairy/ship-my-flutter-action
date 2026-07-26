export declare const shipDirectoryName = ".ship-my-flutter";
export interface ShipPaths {
    root: string;
    directory: string;
    config: string;
    manifest: string;
    changelog: string;
    storeReleaseNotes: string;
    candidates: string;
}
export declare function resolveShipPaths(root?: string): ShipPaths;
export declare function candidatePath(root: string, platform: "ios", version: string): string;
//# sourceMappingURL=paths.d.ts.map
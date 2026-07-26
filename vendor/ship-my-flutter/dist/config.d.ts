import type { ChangelogManifest, ShipConfig, ShipManifest, StoreReleaseNotes } from "./types.js";
export declare function loadConfig(root?: string): Promise<ShipConfig>;
export declare function loadManifest(root?: string): Promise<ShipManifest>;
export declare function loadChangelog(root?: string): Promise<ChangelogManifest>;
export declare function loadStoreReleaseNotes(root?: string): Promise<StoreReleaseNotes>;
export declare function validateConfig(value: unknown): ShipConfig;
export declare function validateManifest(value: unknown): ShipManifest;
export declare function validateChangelog(value: unknown): ChangelogManifest;
export declare function validateStoreReleaseNotes(value: unknown): StoreReleaseNotes;
//# sourceMappingURL=config.d.ts.map
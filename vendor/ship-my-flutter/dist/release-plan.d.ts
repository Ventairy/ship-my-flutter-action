import type { Platform, ReleasePlan, ShipManifest } from "./types.js";
export declare function releaseTag(platform: Platform, version: string): string;
export declare function releaseNeedsPromotion(root: string, manifest: ShipManifest, platform: Platform): Promise<boolean>;
export declare function createReleasePlan(root: string, manifest: ShipManifest, platform: Platform): Promise<ReleasePlan | null>;
//# sourceMappingURL=release-plan.d.ts.map
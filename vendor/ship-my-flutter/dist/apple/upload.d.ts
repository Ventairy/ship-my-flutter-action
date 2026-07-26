import type { AppleCredentials } from "../types.js";
export declare function buildFlutterIpa(options: {
    projectRoot: string;
    version: string;
    buildNumber: string;
    exportOptionsPath: string;
    scheme?: string;
    buildArgs: string[];
}): Promise<string>;
export declare function prepareFlutterDependencies(projectRoot: string): Promise<void>;
export declare function uploadIpa(ipaPath: string, credentials: AppleCredentials): Promise<void>;
//# sourceMappingURL=upload.d.ts.map
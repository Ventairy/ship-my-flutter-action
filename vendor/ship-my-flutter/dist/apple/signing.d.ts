import type { SigningCredentials } from "../types.js";
export interface InstalledProfile {
    bundleId: string;
    uuid: string;
    name: string;
    teamId: string;
    installedPath: string;
}
export interface SigningSession {
    keychainPath: string;
    keychainPassword: string;
    profiles: InstalledProfile[];
    exportOptionsPath: string;
    cleanup(): Promise<void>;
}
export declare function installSigningAssets(credentials: SigningCredentials, bundleId: string): Promise<SigningSession>;
//# sourceMappingURL=signing.d.ts.map
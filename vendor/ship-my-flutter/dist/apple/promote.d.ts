import { AppStoreConnectClient } from "./client.js";
import type { AppleCredentials, GitHubContext } from "../types.js";
export interface PromotionResult {
    version: string;
    tag: string;
    buildId: string;
    appStoreVersionId?: string;
    reviewSubmissionId?: string;
    githubReleaseUrl: string;
}
export declare function promoteIosRelease(options: {
    root: string;
    appleCredentials: AppleCredentials;
    github: GitHubContext;
    client?: AppStoreConnectClient;
}): Promise<PromotionResult>;
//# sourceMappingURL=promote.d.ts.map
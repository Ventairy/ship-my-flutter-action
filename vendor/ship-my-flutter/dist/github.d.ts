import { Octokit } from "@octokit/rest";
import type { GitHubContext, Platform, ReleasePlan, ShipConfig } from "./types.js";
export interface ReleasePullRequestResult {
    branch: string;
    pullRequestNumber: number;
}
export declare function createOrUpdateReleasePullRequest(root: string, config: ShipConfig, plan: ReleasePlan, context: GitHubContext, octokit?: Octokit): Promise<ReleasePullRequestResult>;
export declare function findReleasePullRequest(context: GitHubContext, config: ShipConfig, platform: Platform): Promise<number | undefined>;
//# sourceMappingURL=github.d.ts.map
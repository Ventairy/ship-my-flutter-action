export interface GitCommit {
    sha: string;
    message: string;
}
export declare function git(root: string, args: string[], options?: {
    silent?: boolean;
    allowFailure?: boolean;
}): Promise<string>;
export declare function currentSha(root: string): Promise<string>;
export declare function currentBranch(root: string): Promise<string>;
export declare function isClean(root: string): Promise<boolean>;
export declare function tagExists(root: string, tag: string): Promise<boolean>;
export declare function tagSha(root: string, tag: string): Promise<string>;
export declare function commitsBetween(root: string, baseSha: string, headSha?: string): Promise<GitCommit[]>;
export declare function configureBotIdentity(root: string): Promise<void>;
//# sourceMappingURL=git.d.ts.map
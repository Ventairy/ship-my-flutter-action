export interface RunOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    input?: string;
    silent?: boolean;
    allowFailure?: boolean;
}
export interface RunResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}
export declare function run(command: string, args: string[], options?: RunOptions): Promise<RunResult>;
//# sourceMappingURL=process.d.ts.map
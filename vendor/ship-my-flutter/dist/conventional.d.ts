import type { Bump, ConventionalChange } from "./types.js";
export declare function parseConventionalCommit(sha: string, message: string): ConventionalChange;
export declare function highestBump(changes: ConventionalChange[]): Bump | null;
//# sourceMappingURL=conventional.d.ts.map
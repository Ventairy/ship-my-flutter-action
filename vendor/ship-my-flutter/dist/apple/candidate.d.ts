import { AppStoreConnectClient } from "./client.js";
import type { AppleCredentials, CandidateReceipt, SigningCredentials } from "../types.js";
export interface CandidateOptions {
    root: string;
    appleCredentials: AppleCredentials;
    signingCredentials: SigningCredentials;
    commitReceipt?: boolean;
    client?: AppStoreConnectClient;
}
export declare function createIosCandidate(options: CandidateOptions): Promise<CandidateReceipt>;
//# sourceMappingURL=candidate.d.ts.map
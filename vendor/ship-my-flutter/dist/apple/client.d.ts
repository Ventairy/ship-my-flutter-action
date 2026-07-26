import type { AppleCredentials, StoreReleaseType } from "../types.js";
export interface ApiResource<TAttributes = Record<string, unknown>> {
    type: string;
    id: string;
    attributes: TAttributes;
}
export interface AppAttributes {
    name: string;
    bundleId: string;
    sku: string;
    primaryLocale: string;
}
export interface BuildAttributes {
    version: string;
    uploadedDate: string;
    processingState: "PROCESSING" | "FAILED" | "INVALID" | "VALID";
    expired: boolean;
    usesNonExemptEncryption?: boolean;
}
export interface PrereleaseVersionAttributes {
    version: string;
    platform: "IOS";
}
export interface BetaGroupAttributes {
    name: string;
    isInternalGroup: boolean;
}
export interface AppStoreVersionAttributes {
    platform: "IOS";
    versionString: string;
    appStoreState: string;
    releaseType: "MANUAL" | "AFTER_APPROVAL" | "SCHEDULED";
    earliestReleaseDate?: string;
}
export interface ReviewSubmissionAttributes {
    platform?: "IOS";
    state: string;
    submittedDate?: string;
}
export declare class AppStoreConnectClient {
    private readonly credentials;
    private readonly fetchImplementation;
    readonly baseUrl = "https://api.appstoreconnect.apple.com";
    constructor(credentials: AppleCredentials, fetchImplementation?: typeof fetch);
    private token;
    request<T>(method: string, path: string, body?: unknown): Promise<T>;
    private collection;
    findApp(bundleId: string): Promise<ApiResource<AppAttributes>>;
    listPrereleaseVersions(appId: string, version?: string): Promise<Array<ApiResource<PrereleaseVersionAttributes>>>;
    listBuildsForPrereleaseVersion(prereleaseVersionId: string): Promise<Array<ApiResource<BuildAttributes>>>;
    buildsForVersion(appId: string, version: string): Promise<Array<ApiResource<BuildAttributes>>>;
    nextBuildNumber(appId: string, version: string): Promise<string>;
    waitForBuild(appId: string, version: string, buildNumber: string, timeoutMinutes: number, intervalMilliseconds?: number): Promise<ApiResource<BuildAttributes>>;
    setBetaBuildLocalization(buildId: string, locale: string, whatsNew: string): Promise<void>;
    addBuildToGroups(appId: string, buildId: string, names: string[]): Promise<void>;
    findOrCreateAppStoreVersion(appId: string, version: string, releaseType: StoreReleaseType, earliestReleaseDate?: string): Promise<ApiResource<AppStoreVersionAttributes>>;
    attachBuildToVersion(appStoreVersionId: string, buildId: string): Promise<void>;
    appStoreVersionBuildId(appStoreVersionId: string): Promise<string | undefined>;
    setAppStoreReleaseNotes(appStoreVersionId: string, locale: string, whatsNew: string): Promise<void>;
    submitVersionForReview(appId: string, appStoreVersionId: string): Promise<string>;
}
//# sourceMappingURL=client.d.ts.map
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import path from "node:path";
import { fileURLToPath } from "node:url";

type JsonObject = Record<string, unknown>;

enum ReleasePhase {
  pullRequest = "pull-request",
  releaseCandidate = "release-candidate",
  ship = "ship",
}

const Platform = {
  ios: "ios",
  android: "android",
} as const;
type Platform = (typeof Platform)[keyof typeof Platform];

enum PullRequestResultPhase {
  noop = "noop",
  releaseCandidate = ReleasePhase.releaseCandidate,
  ship = ReleasePhase.ship,
}

const ResultField = {
  nextPhase: "nextPhase",
  targets: "targets",
  releaseBranch: "releaseBranch",
  pullRequestNumber: "pullRequestNumber",
  releaseCandidateReceipts: "releaseCandidateReceipts",
  shippedReleases: "shippedReleases",
  platform: "platform",
  version: "version",
  artifactId: "artifactId",
  buildNumber: "buildNumber",
  githubReleaseUrl: "githubReleaseUrl",
} as const;
type ResultField = (typeof ResultField)[keyof typeof ResultField];

const OutputName = {
  nextPhase: "next-phase",
  targets: "targets",
  releaseBranch: "release-branch",
  pullRequestNumber: "pull-request-number",
  candidates: "candidates",
  releases: "releases",
  platform: "platform",
  version: "version",
  artifactId: "artifact-id",
  buildNumber: "build-number",
  releaseUrl: "release-url",
} as const;

const CredentialEnvironmentName = {
  githubToken: "SMF_GITHUB_TOKEN",
  appStoreConnectKeyId: "SMF_APP_STORE_CONNECT_KEY_ID",
  appStoreConnectIssuerId: "SMF_APP_STORE_CONNECT_ISSUER_ID",
  appStoreConnectAuthKeyBase64: "SMF_APP_STORE_CONNECT_AUTH_KEY_BASE64",
  iosCertificateBase64: "SMF_IOS_CERTIFICATE_BASE64",
  iosCertificatePassword: "SMF_IOS_CERTIFICATE_PASSWORD",
  googlePlayServiceAccountJson: "SMF_GOOGLE_PLAY_SERVICE_ACCOUNT_JSON",
  androidKeystoreBase64: "SMF_ANDROID_KEYSTORE_BASE64",
  androidKeyAlias: "SMF_ANDROID_KEY_ALIAS",
  androidKeystorePassword: "SMF_ANDROID_KEYSTORE_PASSWORD",
  androidKeyPassword: "SMF_ANDROID_KEY_PASSWORD",
} as const;

const sensitiveEnvironmentNames = Object.values(CredentialEnvironmentName);

function maskSensitiveInputs(): void {
  for (const name of sensitiveEnvironmentNames) {
    const value = process.env[name];
    if (value) core.setSecret(value);
  }
}

function phase(): ReleasePhase {
  const value = process.env.INPUT_PHASE?.trim();
  if (
    value === ReleasePhase.pullRequest ||
    value === ReleasePhase.releaseCandidate ||
    value === ReleasePhase.ship
  ) {
    return value;
  }
  throw new Error(`Unsupported phase "${value ?? ""}".`);
}

function repository(): string {
  const value = process.env.GITHUB_REPOSITORY?.trim();
  const parts = value?.split("/");
  if (
    parts?.length !== 2 ||
    parts[0]?.trim() === "" ||
    parts[1]?.trim() === ""
  ) {
    throw new Error("GitHub repository context is missing or invalid.");
  }
  return `${parts[0]}/${parts[1]}`;
}

function selectedPlatform(): Platform | undefined {
  const value = process.env.INPUT_PLATFORM?.trim();
  if (!value) return undefined;
  if (value === Platform.ios || value === Platform.android) return value;
  throw new Error('platform must be "ios" or "android" when provided.');
}

function smfPath(): string | undefined {
  const value = process.env.INPUT_SMF_PATH?.trim();
  return value === "" || value === undefined ? undefined : value;
}

function childEnvironment(): Record<string, string> {
  const environment: Record<string, string> = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (value !== undefined) environment[name] = value;
  }
  const token = process.env[CredentialEnvironmentName.githubToken]?.trim();
  if (!token) throw new Error("github-token is required.");
  environment[CredentialEnvironmentName.githubToken] = token;
  for (const name of sensitiveEnvironmentNames) {
    delete process.env[name];
  }
  return environment;
}

function runtimeDirectory(): string {
  const actionPath =
    process.env.GITHUB_ACTION_PATH ??
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  return path.join(actionPath, "vendor", "smf");
}

function dartExecutable(): string {
  const value = process.env.SMF_DART?.trim();
  if (!value) {
    throw new Error("The smf Dart toolchain is missing.");
  }
  return value;
}

function parseResult(stdout: string): JsonObject {
  let value: unknown;
  try {
    value = JSON.parse(stdout);
  } catch {
    throw new Error("smf returned invalid JSON.");
  }
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new Error("smf returned an invalid result.");
  }
  return value as JsonObject;
}

function requiredString(
  result: JsonObject,
  name: ResultField,
  context: string,
): string {
  const value = result[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `smf returned an invalid ${context} result: ` +
        `"${name}" must be a non-empty string.`,
    );
  }
  return value;
}

function optionalPositiveInteger(
  result: JsonObject,
  name: ResultField,
  context: string,
): number | undefined {
  const value = result[name];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      `smf returned an invalid ${context} result: ` +
        `"${name}" must be a positive integer.`,
    );
  }
  return value;
}

function platform(result: JsonObject, context: string): Platform {
  const value = result[ResultField.platform];
  if (value !== Platform.ios && value !== Platform.android) {
    throw new Error(
      `smf returned an invalid ${context} result: ` +
        '"platform" must be "ios" or "android".',
    );
  }
  return value;
}

function pullRequestResultPhase(result: JsonObject): PullRequestResultPhase {
  const value = result[ResultField.nextPhase];
  if (
    value === PullRequestResultPhase.noop ||
    value === PullRequestResultPhase.releaseCandidate ||
    value === PullRequestResultPhase.ship
  ) {
    return value;
  }
  throw new Error(
    'smf returned an invalid pull-request result: "nextPhase" must be ' +
      '"noop", "release-candidate", or "ship".',
  );
}

function mapPullRequestOutputs(result: JsonObject): void {
  const nextPhase = pullRequestResultPhase(result);
  if (nextPhase === PullRequestResultPhase.noop) {
    core.setOutput(OutputName.nextPhase, nextPhase);
    return;
  }

  const targets = releaseTargetMatrix(result);
  let releaseBranch: string | undefined;
  let pullRequestNumber: number | undefined;
  if (nextPhase === PullRequestResultPhase.releaseCandidate) {
    releaseBranch = requiredString(
      result,
      ResultField.releaseBranch,
      ReleasePhase.pullRequest,
    );
    pullRequestNumber = optionalPositiveInteger(
      result,
      ResultField.pullRequestNumber,
      ReleasePhase.pullRequest,
    );
  }

  core.setOutput(OutputName.nextPhase, nextPhase);
  core.setOutput(OutputName.targets, JSON.stringify(targets));
  if (targets.length === 1) {
    core.setOutput(OutputName.platform, targets[0]!.platform);
    core.setOutput(OutputName.version, targets[0]!.version);
  }
  if (releaseBranch !== undefined) {
    core.setOutput(OutputName.releaseBranch, releaseBranch);
  }
  if (pullRequestNumber !== undefined) {
    core.setOutput(OutputName.pullRequestNumber, String(pullRequestNumber));
  }
}

function releaseTargetMatrix(
  result: JsonObject,
): Array<{ platform: Platform; version: string }> {
  const values = objectResults(
    result,
    ResultField.targets,
    "pull-request",
    "target",
  );
  const seen = new Set<Platform>();
  return values.map((release) => {
    const releasePlatform = platform(release, "pull-request release");
    if (seen.has(releasePlatform)) {
      throw new Error(
        `smf returned duplicate ${releasePlatform} release targets.`,
      );
    }
    seen.add(releasePlatform);
    return {
      platform: releasePlatform,
      version: requiredString(
        release,
        ResultField.version,
        "pull-request release",
      ),
    };
  });
}

function objectResults(
  result: JsonObject,
  field: ResultField,
  context: string,
  itemName: string,
): JsonObject[] {
  const values = result[field];
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(
      `smf returned an invalid ${context} result: "${field}" must be a ` +
        "non-empty list.",
    );
  }
  return values.map((value) => {
    if (value === null || Array.isArray(value) || typeof value !== "object") {
      throw new Error(
        `smf returned an invalid ${context} result: each ${itemName} must be ` +
          "an object.",
      );
    }
    return value as JsonObject;
  });
}

type PlatformReleaseResult = {
  result: JsonObject;
  platform: Platform;
  version: string;
  artifactId: string;
  buildNumber: string;
};

type ShippedReleaseResult = PlatformReleaseResult & {
  githubReleaseUrl: string;
};

function platformReleaseResults(
  result: JsonObject,
  context: ReleasePhase.releaseCandidate,
): PlatformReleaseResult[];
function platformReleaseResults(
  result: JsonObject,
  context: ReleasePhase.ship,
): ShippedReleaseResult[];
function platformReleaseResults(
  result: JsonObject,
  context: ReleasePhase.releaseCandidate | ReleasePhase.ship,
): Array<PlatformReleaseResult | ShippedReleaseResult> {
  const isReleaseCandidate = context === ReleasePhase.releaseCandidate;
  const values = objectResults(
    result,
    isReleaseCandidate
      ? ResultField.releaseCandidateReceipts
      : ResultField.shippedReleases,
    context,
    isReleaseCandidate ? "release candidate receipt" : "shipped release",
  );
  const seen = new Set<Platform>();
  return values.map((value) => {
    const releasePlatform = platform(value, context);
    if (seen.has(releasePlatform)) {
      throw new Error(
        `smf returned duplicate ${releasePlatform} ${context} results.`,
      );
    }
    seen.add(releasePlatform);
    const release = {
      result: value,
      platform: releasePlatform,
      version: requiredString(value, ResultField.version, context),
      artifactId: requiredString(value, ResultField.artifactId, context),
      buildNumber: requiredString(value, ResultField.buildNumber, context),
    };
    if (isReleaseCandidate) return release;
    return {
      ...release,
      githubReleaseUrl: requiredString(
        value,
        ResultField.githubReleaseUrl,
        context,
      ),
    };
  });
}

function verifySelectedPlatformResult(
  results: PlatformReleaseResult[],
  selectedPlatform: Platform | undefined,
  context: ReleasePhase.releaseCandidate | ReleasePhase.ship,
): void {
  if (selectedPlatform === undefined) return;
  if (results.length !== 1 || results[0]!.platform !== selectedPlatform) {
    throw new Error(
      `smf returned an invalid ${context} result: expected exactly one ` +
        `${selectedPlatform} result.`,
    );
  }
}

function mapReleaseCandidateOutputs(
  result: JsonObject,
  selectedPlatform: Platform | undefined,
): void {
  const candidates = platformReleaseResults(
    result,
    ReleasePhase.releaseCandidate,
  );
  verifySelectedPlatformResult(
    candidates,
    selectedPlatform,
    ReleasePhase.releaseCandidate,
  );
  core.setOutput(
    OutputName.candidates,
    JSON.stringify(candidates.map((candidate) => candidate.result)),
  );
  if (candidates.length !== 1) return;
  const candidate = candidates[0]!;

  core.setOutput(OutputName.platform, candidate.platform);
  core.setOutput(OutputName.version, candidate.version);
  core.setOutput(OutputName.artifactId, candidate.artifactId);
  core.setOutput(OutputName.buildNumber, candidate.buildNumber);
}

function mapShipOutputs(
  result: JsonObject,
  selectedPlatform: Platform | undefined,
): void {
  const releases = platformReleaseResults(result, ReleasePhase.ship);
  verifySelectedPlatformResult(releases, selectedPlatform, ReleasePhase.ship);
  core.setOutput(
    OutputName.releases,
    JSON.stringify(releases.map((release) => release.result)),
  );
  if (releases.length !== 1) return;
  const release = releases[0]!;

  core.setOutput(OutputName.platform, release.platform);
  core.setOutput(OutputName.version, release.version);
  core.setOutput(OutputName.artifactId, release.artifactId);
  core.setOutput(OutputName.buildNumber, release.buildNumber);
  core.setOutput(OutputName.releaseUrl, release.githubReleaseUrl);
}

function mapOutputs(
  selected: ReleasePhase,
  result: JsonObject,
  selectedPlatform: Platform | undefined,
): void {
  switch (selected) {
    case ReleasePhase.pullRequest:
      mapPullRequestOutputs(result);
      return;
    case ReleasePhase.releaseCandidate:
      mapReleaseCandidateOutputs(result, selectedPlatform);
      return;
    case ReleasePhase.ship:
      mapShipOutputs(result, selectedPlatform);
      return;
    default:
      /* v8 ignore next -- ReleasePhase makes this statically unreachable. */
      assertNever(selected);
  }
}

/* v8 ignore start -- compile-time exhaustiveness guard. */
function assertNever(value: never): never {
  throw new Error(`Unsupported exhaustive value "${String(value)}".`);
}
/* v8 ignore stop */

export async function run(): Promise<void> {
  maskSensitiveInputs();
  const selected = phase();
  const targetPlatform = selectedPlatform();
  if (
    selected === ReleasePhase.releaseCandidate &&
    targetPlatform === Platform.ios &&
    process.platform !== "darwin"
  ) {
    throw new Error("An iOS release candidate requires a macOS runner.");
  }
  const repositoryRoot = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const repositoryName = repository();
  const selectedSmfPath = smfPath();
  const executable = dartExecutable();
  const environment = childEnvironment();
  const consumerPath = process.env.SMF_CONSUMER_PATH;
  if (consumerPath) environment.PATH = consumerPath;
  core.info(`Running ${selected} for ${repositoryName}`);
  const arguments_ = [
    "run",
    "smf_cli:smf",
    "release",
    "--phase",
    selected,
    "--working-directory",
    repositoryRoot,
    "--repository",
    repositoryName,
  ];
  if (selectedSmfPath !== undefined) {
    arguments_.push("--smf-path", selectedSmfPath);
  }
  if (targetPlatform !== undefined) {
    arguments_.push("--platform", targetPlatform);
  }
  const result = await exec.getExecOutput(executable, arguments_, {
    cwd: runtimeDirectory(),
    env: environment,
    silent: true,
    ignoreReturnCode: true,
  });
  if (result.exitCode !== 0) {
    const message =
      result.stderr.trim() || "The Dart action executable failed.";
    throw new Error(message);
  }
  mapOutputs(selected, parseResult(result.stdout), targetPlatform);
}

/* v8 ignore start -- exercised by GitHub's process-level Action entrypoint. */
if (process.env.NODE_ENV !== "test") {
  run().catch((error: unknown) => {
    core.setFailed(error instanceof Error ? error.message : String(error));
  });
}
/* v8 ignore stop */

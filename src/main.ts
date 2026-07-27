import * as core from "@actions/core";
import * as exec from "@actions/exec";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Phase = "pull-request" | "release-candidate" | "ship";
type Platform = "ios" | "android";
type JsonObject = Record<string, unknown>;
type PullRequestResultPhase = "noop" | "release-candidate" | "ship";

const sensitiveEnvironmentNames = [
  "INPUT_GITHUB_TOKEN",
  "SMF_GITHUB_TOKEN",
  "SMF_APP_STORE_CONNECT_KEY_ID",
  "SMF_APP_STORE_CONNECT_ISSUER_ID",
  "SMF_APP_STORE_CONNECT_PRIVATE_KEY_BASE64",
  "SMF_IOS_CERTIFICATE_BASE64",
  "SMF_IOS_CERTIFICATE_PASSWORD",
  "SMF_IOS_PROVISIONING_PROFILES_BASE64",
  "SMF_GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64",
  "SMF_ANDROID_KEYSTORE_BASE64",
  "SMF_ANDROID_KEY_ALIAS",
  "SMF_ANDROID_KEYSTORE_PASSWORD",
  "SMF_ANDROID_KEY_PASSWORD",
] as const;

function maskSensitiveInputs(): void {
  for (const name of sensitiveEnvironmentNames) {
    const value = process.env[name];
    if (value) core.setSecret(value);
  }
}

function phase(): Phase {
  const value = process.env.INPUT_PHASE?.trim();
  if (
    value === "pull-request" ||
    value === "release-candidate" ||
    value === "ship"
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

function selectedPlatform(selected: Phase): Platform | undefined {
  const value = process.env.INPUT_PLATFORM?.trim();
  if (selected === "pull-request") {
    if (value) {
      throw new Error("platform must be omitted for the pull-request phase.");
    }
    return undefined;
  }
  if (value === "ios" || value === "android") return value;
  throw new Error(
    `platform must be "ios" or "android" for the ${selected} phase.`,
  );
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
  const token = process.env.INPUT_GITHUB_TOKEN?.trim();
  if (!token) throw new Error("github-token is required.");
  delete environment.INPUT_GITHUB_TOKEN;
  environment.SMF_GITHUB_TOKEN = token;
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
  name: string,
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
  name: string,
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
  if (result.platform !== "ios" && result.platform !== "android") {
    throw new Error(
      `smf returned an invalid ${context} result: ` +
        '"platform" must be "ios" or "android".',
    );
  }
  return result.platform;
}

function pullRequestResultPhase(result: JsonObject): PullRequestResultPhase {
  const value = result.phase;
  if (value === "noop" || value === "release-candidate" || value === "ship") {
    return value;
  }
  throw new Error(
    'smf returned an invalid pull-request result: "phase" must be ' +
      '"noop", "release-candidate", or "ship".',
  );
}

function mapPullRequestOutputs(result: JsonObject): void {
  const nextPhase = pullRequestResultPhase(result);
  if (nextPhase === "noop") {
    core.setOutput("phase", nextPhase);
    return;
  }

  const releases = releaseMatrix(result);
  let branch: string | undefined;
  let pullRequestNumber: number | undefined;
  if (nextPhase === "release-candidate") {
    branch = requiredString(result, "branch", "pull-request");
    pullRequestNumber = optionalPositiveInteger(
      result,
      "pullRequestNumber",
      "pull-request",
    );
  }

  core.setOutput("phase", nextPhase);
  core.setOutput("releases", JSON.stringify(releases));
  if (releases.length === 1) {
    core.setOutput("platform", releases[0]!.platform);
    core.setOutput("version", releases[0]!.version);
  }
  if (branch !== undefined) core.setOutput("branch", branch);
  if (pullRequestNumber !== undefined) {
    core.setOutput("pull-request-number", String(pullRequestNumber));
  }
}

function releaseMatrix(
  result: JsonObject,
): Array<{ platform: Platform; version: string }> {
  if (!Array.isArray(result.releases) || result.releases.length === 0) {
    throw new Error(
      'smf returned an invalid pull-request result: "releases" must be a ' +
        "non-empty list.",
    );
  }
  const seen = new Set<Platform>();
  return result.releases.map((value) => {
    if (value === null || Array.isArray(value) || typeof value !== "object") {
      throw new Error(
        "smf returned an invalid pull-request result: each release must be " +
          "an object.",
      );
    }
    const release = value as JsonObject;
    const releasePlatform = platform(release, "pull-request release");
    if (seen.has(releasePlatform)) {
      throw new Error(
        `smf returned duplicate ${releasePlatform} release targets.`,
      );
    }
    seen.add(releasePlatform);
    return {
      platform: releasePlatform,
      version: requiredString(release, "version", "pull-request release"),
    };
  });
}

function mapReleaseCandidateOutputs(result: JsonObject): void {
  const selected = platform(result, "release-candidate");
  const version = requiredString(result, "version", "release-candidate");
  const artifactId = requiredString(result, "artifactId", "release-candidate");
  const buildNumber = requiredString(
    result,
    "buildNumber",
    "release-candidate",
  );

  core.setOutput("phase", "release-candidate");
  core.setOutput("platform", selected);
  core.setOutput("version", version);
  core.setOutput("artifact-id", artifactId);
  core.setOutput("build-number", buildNumber);
}

function mapShipOutputs(result: JsonObject): void {
  const selected = platform(result, "ship");
  const version = requiredString(result, "version", "ship");
  const artifactId = requiredString(result, "artifactId", "ship");
  const buildNumber = requiredString(result, "buildNumber", "ship");
  const githubReleaseUrl = requiredString(result, "githubReleaseUrl", "ship");

  core.setOutput("phase", "ship");
  core.setOutput("platform", selected);
  core.setOutput("version", version);
  core.setOutput("artifact-id", artifactId);
  core.setOutput("build-number", buildNumber);
  core.setOutput("release-url", githubReleaseUrl);
}

function mapOutputs(selected: Phase, result: JsonObject): void {
  switch (selected) {
    case "pull-request":
      mapPullRequestOutputs(result);
      return;
    case "release-candidate":
      mapReleaseCandidateOutputs(result);
      return;
    case "ship":
      mapShipOutputs(result);
  }
}

export async function run(): Promise<void> {
  maskSensitiveInputs();
  const selected = phase();
  const targetPlatform = selectedPlatform(selected);
  if (
    selected === "release-candidate" &&
    targetPlatform === "ios" &&
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
    "action",
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
  mapOutputs(selected, parseResult(result.stdout));
}

/* v8 ignore start -- exercised by GitHub's process-level Action entrypoint. */
if (process.env.NODE_ENV !== "test") {
  run().catch((error: unknown) => {
    core.setFailed(error instanceof Error ? error.message : String(error));
  });
}
/* v8 ignore stop */

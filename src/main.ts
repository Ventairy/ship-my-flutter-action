import * as core from "@actions/core";
import * as exec from "@actions/exec";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Phase = "pull-request" | "release-candidate" | "ship";
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

function coreDirectory(): string {
  const actionPath =
    process.env.GITHUB_ACTION_PATH ??
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  return path.join(actionPath, "vendor", "smf");
}

function coreDartExecutable(): string {
  const value = process.env.SMF_CORE_DART?.trim();
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

function iosPlatform(result: JsonObject, context: string): "ios" {
  if (result.platform !== "ios") {
    throw new Error(
      `smf returned an invalid ${context} result: ` +
        '"platform" must be "ios".',
    );
  }
  return "ios";
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

  const platform = iosPlatform(result, "pull-request");
  const version = requiredString(result, "version", "pull-request");
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
  core.setOutput("platform", platform);
  core.setOutput("version", version);
  if (branch !== undefined) core.setOutput("branch", branch);
  if (pullRequestNumber !== undefined) {
    core.setOutput("pull-request-number", String(pullRequestNumber));
  }
}

function mapReleaseCandidateOutputs(result: JsonObject): void {
  const platform = iosPlatform(result, "release-candidate");
  const version = requiredString(result, "version", "release-candidate");
  const buildId = requiredString(result, "buildId", "release-candidate");
  const buildNumber = requiredString(
    result,
    "buildNumber",
    "release-candidate",
  );

  core.setOutput("phase", "release-candidate");
  core.setOutput("platform", platform);
  core.setOutput("version", version);
  core.setOutput("build-id", buildId);
  core.setOutput("build-number", buildNumber);
}

function mapShipOutputs(result: JsonObject): void {
  const version = requiredString(result, "version", "ship");
  const buildId = requiredString(result, "buildId", "ship");
  const githubReleaseUrl = requiredString(result, "githubReleaseUrl", "ship");

  core.setOutput("phase", "ship");
  core.setOutput("platform", "ios");
  core.setOutput("version", version);
  core.setOutput("build-id", buildId);
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
  if (selected === "release-candidate" && process.platform !== "darwin") {
    throw new Error("The release-candidate phase requires a macOS runner.");
  }
  const repositoryRoot = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const repositoryName = repository();
  const selectedSmfPath = smfPath();
  const executable = coreDartExecutable();
  const environment = childEnvironment();
  const consumerPath = process.env.SMF_CONSUMER_PATH;
  if (consumerPath) environment.PATH = consumerPath;
  core.info(`Running ${selected} for ${repositoryName}`);
  const arguments_ = [
    "run",
    "smf",
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
  const result = await exec.getExecOutput(executable, arguments_, {
    cwd: coreDirectory(),
    env: environment,
    silent: true,
    ignoreReturnCode: true,
  });
  if (result.exitCode !== 0) {
    const message = result.stderr.trim() || "The Dart CLI failed.";
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

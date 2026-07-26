import * as core from "@actions/core";
import * as exec from "@actions/exec";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Phase = "plan" | "candidate" | "promote";
type JsonObject = Record<string, unknown>;
type PlannedPhase = "noop" | "candidate" | "promote";

const sensitiveEnvironmentNames = [
  "INPUT_GITHUB_TOKEN",
  "SHIP_MY_FLUTTER_GITHUB_TOKEN",
  "SHIP_MY_FLUTTER_APP_STORE_CONNECT_KEY_ID",
  "SHIP_MY_FLUTTER_APP_STORE_CONNECT_ISSUER_ID",
  "SHIP_MY_FLUTTER_APP_STORE_CONNECT_PRIVATE_KEY_BASE64",
  "SHIP_MY_FLUTTER_IOS_CERTIFICATE_BASE64",
  "SHIP_MY_FLUTTER_IOS_CERTIFICATE_PASSWORD",
  "SHIP_MY_FLUTTER_IOS_PROVISIONING_PROFILES_BASE64",
] as const;

function maskSensitiveInputs(): void {
  for (const name of sensitiveEnvironmentNames) {
    const value = process.env[name];
    if (value) core.setSecret(value);
  }
}

function phase(): Phase {
  const value = process.env.INPUT_PHASE?.trim();
  if (value === "plan" || value === "candidate" || value === "promote") {
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

function childEnvironment(): Record<string, string> {
  const environment: Record<string, string> = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (value !== undefined) environment[name] = value;
  }
  const token = process.env.INPUT_GITHUB_TOKEN?.trim();
  if (!token) throw new Error("github-token is required.");
  delete environment.INPUT_GITHUB_TOKEN;
  environment.SHIP_MY_FLUTTER_GITHUB_TOKEN = token;
  for (const name of sensitiveEnvironmentNames) {
    delete process.env[name];
  }
  return environment;
}

function coreDirectory(): string {
  const actionPath =
    process.env.GITHUB_ACTION_PATH ??
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  return path.join(actionPath, "vendor", "ship-my-flutter");
}

function parseResult(stdout: string): JsonObject {
  let value: unknown;
  try {
    value = JSON.parse(stdout);
  } catch {
    throw new Error("ship-my-flutter returned invalid JSON.");
  }
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new Error("ship-my-flutter returned an invalid result.");
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
      `ship-my-flutter returned an invalid ${context} result: ` +
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
      `ship-my-flutter returned an invalid ${context} result: ` +
        `"${name}" must be a positive integer.`,
    );
  }
  return value;
}

function iosPlatform(result: JsonObject, context: string): "ios" {
  if (result.platform !== "ios") {
    throw new Error(
      `ship-my-flutter returned an invalid ${context} result: ` +
        '"platform" must be "ios".',
    );
  }
  return "ios";
}

function plannedPhase(result: JsonObject): PlannedPhase {
  const value = result.phase;
  if (value === "noop" || value === "candidate" || value === "promote") {
    return value;
  }
  throw new Error(
    'ship-my-flutter returned an invalid plan result: "phase" must be ' +
      '"noop", "candidate", or "promote".',
  );
}

function mapPlanOutputs(result: JsonObject): void {
  const nextPhase = plannedPhase(result);
  if (nextPhase === "noop") {
    core.setOutput("phase", nextPhase);
    return;
  }

  const platform = iosPlatform(result, "plan");
  const version = requiredString(result, "version", "plan");
  let branch: string | undefined;
  let pullRequestNumber: number | undefined;
  if (nextPhase === "candidate") {
    branch = requiredString(result, "branch", "plan");
    pullRequestNumber = optionalPositiveInteger(
      result,
      "pullRequestNumber",
      "plan",
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

function mapCandidateOutputs(result: JsonObject): void {
  const platform = iosPlatform(result, "candidate");
  const version = requiredString(result, "version", "candidate");
  const buildId = requiredString(result, "buildId", "candidate");
  const buildNumber = requiredString(result, "buildNumber", "candidate");

  core.setOutput("phase", "candidate");
  core.setOutput("platform", platform);
  core.setOutput("version", version);
  core.setOutput("build-id", buildId);
  core.setOutput("build-number", buildNumber);
}

function mapPromoteOutputs(result: JsonObject): void {
  const version = requiredString(result, "version", "promote");
  const buildId = requiredString(result, "buildId", "promote");
  const githubReleaseUrl = requiredString(
    result,
    "githubReleaseUrl",
    "promote",
  );

  core.setOutput("phase", "promote");
  core.setOutput("platform", "ios");
  core.setOutput("version", version);
  core.setOutput("build-id", buildId);
  core.setOutput("release-url", githubReleaseUrl);
}

function mapOutputs(selected: Phase, result: JsonObject): void {
  switch (selected) {
    case "plan":
      mapPlanOutputs(result);
      return;
    case "candidate":
      mapCandidateOutputs(result);
      return;
    case "promote":
      mapPromoteOutputs(result);
  }
}

export async function run(): Promise<void> {
  maskSensitiveInputs();
  const selected = phase();
  if (selected === "candidate" && process.platform !== "darwin") {
    throw new Error("The candidate phase requires a macOS runner.");
  }
  const repositoryRoot = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const repositoryName = repository();
  core.info(`Running ${selected} for ${repositoryName}`);
  const result = await exec.getExecOutput(
    "dart",
    [
      "run",
      "ship_my_flutter",
      "action",
      "--phase",
      selected,
      "--root",
      repositoryRoot,
      "--repository",
      repositoryName,
    ],
    {
      cwd: coreDirectory(),
      env: childEnvironment(),
      silent: true,
      ignoreReturnCode: true,
    },
  );
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

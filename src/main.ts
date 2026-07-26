import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as github from "@actions/github";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Phase = "plan" | "candidate" | "promote";
type JsonObject = Record<string, unknown>;

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
  const owner = github.context.repo.owner;
  const repo = github.context.repo.repo;
  if (!owner || !repo) throw new Error("GitHub repository context is missing.");
  return `${owner}/${repo}`;
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

function setOptionalOutput(name: string, value: unknown): void {
  if (value !== undefined && value !== null && value !== "") {
    core.setOutput(name, String(value));
  }
}

function mapOutputs(selected: Phase, result: JsonObject): void {
  if (selected === "plan") {
    core.setOutput("phase", String(result.phase ?? "noop"));
    setOptionalOutput("platform", result.platform);
    setOptionalOutput("version", result.version);
    setOptionalOutput("branch", result.branch);
    setOptionalOutput("pull-request-number", result.pullRequestNumber);
    return;
  }
  core.setOutput("phase", selected);
  core.setOutput("platform", String(result.platform ?? "ios"));
  setOptionalOutput("version", result.version);
  setOptionalOutput("build-id", result.buildId);
  if (selected === "candidate") {
    setOptionalOutput("build-number", result.buildNumber);
  } else {
    setOptionalOutput("release-url", result.githubReleaseUrl);
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

if (process.env.NODE_ENV !== "test") {
  run().catch((error: unknown) => {
    core.setFailed(error instanceof Error ? error.message : String(error));
  });
}

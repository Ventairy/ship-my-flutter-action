import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  appleCredentialsFromEnvironment,
  createIosCandidate,
  planGitHubRelease,
  promoteIosRelease,
  signingCredentialsFromEnvironment,
  type GitHubContext,
} from "ship-my-flutter";

type Phase = "plan" | "candidate" | "promote";

const sensitiveEnvironmentNames = [
  "INPUT_GITHUB_TOKEN",
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

function clearSensitiveInputs(): void {
  for (const name of sensitiveEnvironmentNames) {
    delete process.env[name];
  }
}

function phase(): Phase {
  const value = process.env.INPUT_PHASE?.trim();
  if (value === "plan" || value === "candidate" || value === "promote") {
    return value;
  }
  throw new Error(`Unsupported phase "${value ?? ""}".`);
}

function githubContext(): GitHubContext {
  const token = process.env.INPUT_GITHUB_TOKEN?.trim();
  if (!token) throw new Error("github-token is required.");
  return {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    token,
  };
}

function setOptionalOutput(name: string, value: unknown): void {
  if (value !== undefined && value !== null && value !== "") {
    core.setOutput(name, String(value));
  }
}

export async function run(): Promise<void> {
  maskSensitiveInputs();
  const selected = phase();
  const repositoryRoot = process.env.GITHUB_WORKSPACE ?? process.cwd();
  core.info(
    `Running ${selected} for ${github.context.repo.owner}/${github.context.repo.repo}`,
  );

  if (selected === "plan") {
    const githubApi = githubContext();
    clearSensitiveInputs();
    const result = await planGitHubRelease({
      root: repositoryRoot,
      github: githubApi,
    });
    core.setOutput("phase", result.phase);
    setOptionalOutput("platform", result.platform);
    setOptionalOutput("version", result.version);
    setOptionalOutput("branch", result.branch);
    setOptionalOutput("pull-request-number", result.pullRequestNumber);
    return;
  }

  if (selected === "candidate") {
    if (process.platform !== "darwin") {
      throw new Error("The candidate phase requires a macOS runner.");
    }
    const appleCredentials = appleCredentialsFromEnvironment();
    const signingCredentials = signingCredentialsFromEnvironment();
    clearSensitiveInputs();
    const receipt = await createIosCandidate({
      root: repositoryRoot,
      appleCredentials,
      signingCredentials,
    });
    core.setOutput("phase", "candidate");
    core.setOutput("platform", receipt.platform);
    core.setOutput("version", receipt.version);
    core.setOutput("build-id", receipt.buildId);
    core.setOutput("build-number", receipt.buildNumber);
    return;
  }

  const appleCredentials = appleCredentialsFromEnvironment();
  const githubApi = githubContext();
  clearSensitiveInputs();
  const result = await promoteIosRelease({
    root: repositoryRoot,
    appleCredentials,
    github: githubApi,
  });
  core.setOutput("phase", "promote");
  core.setOutput("platform", "ios");
  core.setOutput("version", result.version);
  core.setOutput("build-id", result.buildId);
  core.setOutput("release-url", result.githubReleaseUrl);
}

if (process.env.NODE_ENV !== "test") {
  run().catch((error: unknown) => {
    core.setFailed(error instanceof Error ? error.message : String(error));
  });
}

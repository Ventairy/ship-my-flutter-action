import { beforeEach, describe, expect, it, vi } from "vitest";

const setOutput = vi.fn();
const setFailed = vi.fn();
const setSecret = vi.fn();
const info = vi.fn();
const planGitHubRelease = vi.fn();
const createIosCandidate = vi.fn();
const promoteIosRelease = vi.fn();

vi.mock("@actions/core", () => ({ setOutput, setFailed, setSecret, info }));
vi.mock("@actions/github", () => ({
  context: { repo: { owner: "ventairy", repo: "example" } },
}));
vi.mock("ship-my-flutter", () => ({
  appleCredentialsFromEnvironment: vi.fn(() => ({
    keyId: "key",
    issuerId: "issuer",
    privateKey: "private",
  })),
  signingCredentialsFromEnvironment: vi.fn(() => ({
    certificateBase64: "certificate",
    certificatePassword: "password",
    provisioningProfiles: "profile",
  })),
  createIosCandidate,
  planGitHubRelease,
  promoteIosRelease,
}));

const { run } = await import("../src/main.js");

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GITHUB_WORKSPACE = "/workspace";
  process.env.INPUT_GITHUB_TOKEN = "token";
});

describe("action entrypoint", () => {
  it("maps release planning to action outputs", async () => {
    process.env.INPUT_PHASE = "plan";
    planGitHubRelease.mockResolvedValue({
      phase: "candidate",
      platform: "ios",
      version: "1.2.0",
      branch: "ship-my-flutter/ios",
      pullRequestNumber: 12,
    });

    await run();

    expect(planGitHubRelease).toHaveBeenCalledWith({
      root: "/workspace",
      github: {
        owner: "ventairy",
        repo: "example",
        token: "token",
      },
    });
    expect(setOutput).toHaveBeenCalledWith("phase", "candidate");
    expect(setOutput).toHaveBeenCalledWith("pull-request-number", "12");
    expect(setSecret).toHaveBeenCalledWith("token");
    expect(process.env.INPUT_GITHUB_TOKEN).toBeUndefined();
  });

  it("rejects candidate builds on a non-macOS runner", async () => {
    process.env.INPUT_PHASE = "candidate";
    if (process.platform === "darwin") return;
    await expect(run()).rejects.toThrow(/macOS runner/);
    expect(createIosCandidate).not.toHaveBeenCalled();
  });

  it("maps promotion results to immutable release outputs", async () => {
    process.env.INPUT_PHASE = "promote";
    promoteIosRelease.mockResolvedValue({
      version: "2.0.0",
      buildId: "build-42",
      githubReleaseUrl:
        "https://github.com/ventairy/example/releases/ios-v2.0.0",
    });

    await run();

    expect(setOutput).toHaveBeenCalledWith("phase", "promote");
    expect(setOutput).toHaveBeenCalledWith("build-id", "build-42");
    expect(setOutput).toHaveBeenCalledWith(
      "release-url",
      "https://github.com/ventairy/example/releases/ios-v2.0.0",
    );
  });

  it("rejects unknown phases", async () => {
    process.env.INPUT_PHASE = "destroy";
    await expect(run()).rejects.toThrow('Unsupported phase "destroy"');
  });
});

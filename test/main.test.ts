import { beforeEach, describe, expect, it, vi } from "vitest";

const setOutput = vi.fn();
const setFailed = vi.fn();
const setSecret = vi.fn();
const info = vi.fn();
const getExecOutput = vi.fn();

vi.mock("@actions/core", () => ({ setOutput, setFailed, setSecret, info }));
vi.mock("@actions/exec", () => ({ getExecOutput }));
vi.mock("@actions/github", () => ({
  context: { repo: { owner: "ventairy", repo: "example" } },
}));

const { run } = await import("../src/main.js");

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GITHUB_WORKSPACE = "/workspace";
  process.env.GITHUB_ACTION_PATH = "/action";
  process.env.INPUT_GITHUB_TOKEN = "token";
});

describe("action adapter", () => {
  it("invokes Dart and maps release planning to native action outputs", async () => {
    process.env.INPUT_PHASE = "plan";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        phase: "candidate",
        platform: "ios",
        version: "1.2.0",
        branch: "ship-my-flutter/ios",
        pullRequestNumber: 12,
      }),
    });

    await run();

    expect(getExecOutput).toHaveBeenCalledWith(
      "dart",
      [
        "run",
        "ship_my_flutter",
        "action",
        "--phase",
        "plan",
        "--root",
        "/workspace",
        "--repository",
        "ventairy/example",
      ],
      expect.objectContaining({
        cwd: "/action/vendor/ship-my-flutter",
        silent: true,
      }),
    );
    expect(setOutput).toHaveBeenCalledWith("phase", "candidate");
    expect(setOutput).toHaveBeenCalledWith("pull-request-number", "12");
    expect(setSecret).toHaveBeenCalledWith("token");
    expect(process.env.INPUT_GITHUB_TOKEN).toBeUndefined();
  });

  it("rejects candidate builds on a non-macOS runner", async () => {
    process.env.INPUT_PHASE = "candidate";
    if (process.platform === "darwin") return;
    await expect(run()).rejects.toThrow(/macOS runner/);
    expect(getExecOutput).not.toHaveBeenCalled();
  });

  it("maps promotion results without implementing promotion logic", async () => {
    process.env.INPUT_PHASE = "promote";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        version: "2.0.0",
        buildId: "build-42",
        githubReleaseUrl:
          "https://github.com/ventairy/example/releases/ios-v2.0.0",
      }),
    });

    await run();

    expect(setOutput).toHaveBeenCalledWith("phase", "promote");
    expect(setOutput).toHaveBeenCalledWith("build-id", "build-42");
    expect(setOutput).toHaveBeenCalledWith(
      "release-url",
      "https://github.com/ventairy/example/releases/ios-v2.0.0",
    );
  });

  it("surfaces a failed Dart command without parsing output", async () => {
    process.env.INPUT_PHASE = "plan";
    getExecOutput.mockResolvedValue({
      exitCode: 1,
      stderr: "ship-my-flutter [CONFIG]: invalid configuration",
      stdout: "",
    });
    await expect(run()).rejects.toThrow("[CONFIG]: invalid configuration");
    expect(setOutput).not.toHaveBeenCalled();
  });

  it("rejects unknown phases before launching Dart", async () => {
    process.env.INPUT_PHASE = "destroy";
    await expect(run()).rejects.toThrow('Unsupported phase "destroy"');
    expect(getExecOutput).not.toHaveBeenCalled();
  });
});

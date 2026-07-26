import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setOutput = vi.fn();
const setFailed = vi.fn();
const setSecret = vi.fn();
const info = vi.fn();
const getExecOutput = vi.fn();
const originalEnvironment = { ...process.env };

vi.mock("@actions/core", () => ({ setOutput, setFailed, setSecret, info }));
vi.mock("@actions/exec", () => ({ getExecOutput }));

const { run } = await import("../src/main.js");

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GITHUB_WORKSPACE = "/workspace";
  process.env.GITHUB_ACTION_PATH = "/action";
  process.env.GITHUB_REPOSITORY = "ventairy/example";
  process.env.INPUT_GITHUB_TOKEN = "token";
  process.env.SHIP_MY_FLUTTER_CORE_DART = "/toolchains/dart-3.10/bin/dart";
  process.env.SHIP_MY_FLUTTER_CONSUMER_PATH = "/project/flutter/bin:/usr/bin";
});

afterEach(() => {
  for (const name of Object.keys(process.env)) {
    if (!(name in originalEnvironment)) delete process.env[name];
  }
  Object.assign(process.env, originalEnvironment);
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
      "/toolchains/dart-3.10/bin/dart",
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
        env: expect.objectContaining({
          PATH: "/project/flutter/bin:/usr/bin",
        }),
        silent: true,
      }),
    );
    expect(setOutput).toHaveBeenCalledWith("phase", "candidate");
    expect(setOutput).toHaveBeenCalledWith("pull-request-number", "12");
    expect(setSecret).toHaveBeenCalledWith("token");
    expect(process.env.INPUT_GITHUB_TOKEN).toBeUndefined();
  });

  it("rejects candidate builds on a non-macOS runner", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("linux");
    process.env.INPUT_PHASE = "candidate";

    await expect(run()).rejects.toThrow(/macOS runner/);
    expect(getExecOutput).not.toHaveBeenCalled();
  });

  it("maps a complete candidate result on macOS", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
    process.env.INPUT_PHASE = "candidate";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        platform: "ios",
        version: "1.2.0",
        buildId: "build-7",
        buildNumber: "7",
      }),
    });

    await run();

    expect(setOutput).toHaveBeenCalledWith("phase", "candidate");
    expect(setOutput).toHaveBeenCalledWith("build-id", "build-7");
    expect(setOutput).toHaveBeenCalledWith("build-number", "7");
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

  it("maps a terminal noop plan without optional outputs", async () => {
    process.env.INPUT_PHASE = "plan";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({ phase: "noop" }),
    });

    await run();

    expect(setOutput).toHaveBeenCalledTimes(1);
    expect(setOutput).toHaveBeenCalledWith("phase", "noop");
  });

  it("maps a promotion plan without candidate-only outputs", async () => {
    process.env.INPUT_PHASE = "plan";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        phase: "promote",
        platform: "ios",
        version: "2.0.0",
      }),
    });

    await run();

    expect(setOutput).toHaveBeenCalledWith("phase", "promote");
    expect(setOutput).toHaveBeenCalledWith("platform", "ios");
    expect(setOutput).toHaveBeenCalledWith("version", "2.0.0");
    expect(setOutput).not.toHaveBeenCalledWith("branch", expect.anything());
  });

  it("rejects a plan result without an explicit supported phase", async () => {
    process.env.INPUT_PHASE = "plan";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({ platform: "ios" }),
    });

    await expect(run()).rejects.toThrow('invalid plan result: "phase" must be');
    expect(setOutput).not.toHaveBeenCalled();
  });

  it("rejects an incomplete candidate plan", async () => {
    process.env.INPUT_PHASE = "plan";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        phase: "candidate",
        platform: "ios",
        version: "1.2.0",
      }),
    });

    await expect(run()).rejects.toThrow(
      'invalid plan result: "branch" must be a non-empty string',
    );
  });

  it("rejects a malformed pull request number", async () => {
    process.env.INPUT_PHASE = "plan";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        phase: "candidate",
        platform: "ios",
        version: "1.2.0",
        branch: "ship-my-flutter/ios",
        pullRequestNumber: "12",
      }),
    });

    await expect(run()).rejects.toThrow(
      'invalid plan result: "pullRequestNumber" must be a positive integer',
    );
  });

  it("rejects an incomplete direct candidate result", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
    process.env.INPUT_PHASE = "candidate";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        platform: "ios",
        version: "1.2.0",
        buildNumber: "7",
      }),
    });

    await expect(run()).rejects.toThrow(
      'invalid candidate result: "buildId" must be a non-empty string',
    );
  });

  it("rejects a non-iOS platform result", async () => {
    process.env.INPUT_PHASE = "plan";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        phase: "promote",
        platform: "android",
        version: "2.0.0",
      }),
    });

    await expect(run()).rejects.toThrow('"platform" must be "ios"');
  });

  it("rejects an incomplete promotion result", async () => {
    process.env.INPUT_PHASE = "promote";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        version: "2.0.0",
        buildId: "build-42",
      }),
    });

    await expect(run()).rejects.toThrow(
      'invalid promote result: "githubReleaseUrl" must be a non-empty string',
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

  it("uses a stable fallback when Dart fails without diagnostics", async () => {
    process.env.INPUT_PHASE = "plan";
    getExecOutput.mockResolvedValue({
      exitCode: 1,
      stderr: "",
      stdout: "",
    });

    await expect(run()).rejects.toThrow("The Dart CLI failed.");
  });

  it("rejects invalid JSON returned by Dart", async () => {
    process.env.INPUT_PHASE = "plan";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: "not-json",
    });

    await expect(run()).rejects.toThrow("returned invalid JSON");
  });

  it.each(["null", "[]", '"text"'])(
    "rejects a non-object Dart result: %s",
    async (stdout) => {
      process.env.INPUT_PHASE = "plan";
      getExecOutput.mockResolvedValue({
        exitCode: 0,
        stderr: "",
        stdout,
      });

      await expect(run()).rejects.toThrow("returned an invalid result");
    },
  );

  it("requires the GitHub token before launching Dart", async () => {
    process.env.INPUT_PHASE = "plan";
    process.env.INPUT_GITHUB_TOKEN = " ";

    await expect(run()).rejects.toThrow("github-token is required");
    expect(getExecOutput).not.toHaveBeenCalled();
  });

  it("requires the isolated Dart toolchain before launching the core", async () => {
    process.env.INPUT_PHASE = "plan";
    delete process.env.SHIP_MY_FLUTTER_CORE_DART;

    await expect(run()).rejects.toThrow("Dart toolchain is missing");
    expect(getExecOutput).not.toHaveBeenCalled();
  });

  it("requires a complete GitHub repository context", async () => {
    process.env.INPUT_PHASE = "plan";
    process.env.GITHUB_REPOSITORY = "ventairy";

    await expect(run()).rejects.toThrow(
      "repository context is missing or invalid",
    );
    expect(getExecOutput).not.toHaveBeenCalled();
  });

  it("masks every supplied release credential before execution", async () => {
    process.env.INPUT_PHASE = "plan";
    process.env.SHIP_MY_FLUTTER_IOS_CERTIFICATE_PASSWORD = "p12-password";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({ phase: "noop" }),
    });

    await run();

    expect(setSecret).toHaveBeenCalledWith("token");
    expect(setSecret).toHaveBeenCalledWith("p12-password");
  });

  it("rejects unknown phases before launching Dart", async () => {
    process.env.INPUT_PHASE = "destroy";
    await expect(run()).rejects.toThrow('Unsupported phase "destroy"');
    expect(getExecOutput).not.toHaveBeenCalled();
  });
});

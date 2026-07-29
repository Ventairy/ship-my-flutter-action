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
  process.env.SMF_GITHUB_TOKEN = "token";
  process.env.SMF_DART = "/toolchains/dart-3.10/bin/dart";
  process.env.SMF_CONSUMER_PATH = "/project/flutter/bin:/usr/bin";
});

afterEach(() => {
  for (const name of Object.keys(process.env)) {
    if (!(name in originalEnvironment)) delete process.env[name];
  }
  Object.assign(process.env, originalEnvironment);
});

describe("action adapter", () => {
  it("invokes Dart and maps pull-request planning to native action outputs", async () => {
    process.env.INPUT_PHASE = "pull-request";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        nextPhase: "release-candidate",
        targets: [{ platform: "ios", version: "1.2.0" }],
        releaseBranch: "smf/release",
        pullRequestNumber: 12,
      }),
    });

    await run();

    expect(getExecOutput).toHaveBeenCalledWith(
      "/toolchains/dart-3.10/bin/dart",
      [
        "run",
        "smf_cli:smf",
        "release",
        "--phase",
        "pull-request",
        "--working-directory",
        "/workspace",
        "--repository",
        "ventairy/example",
      ],
      expect.objectContaining({
        cwd: "/action/vendor/smf",
        env: expect.objectContaining({
          PATH: "/project/flutter/bin:/usr/bin",
        }),
        silent: true,
      }),
    );
    expect(setOutput).toHaveBeenCalledWith("next-phase", "release-candidate");
    expect(setOutput).toHaveBeenCalledWith(
      "targets",
      JSON.stringify([{ platform: "ios", version: "1.2.0" }]),
    );
    expect(setOutput).toHaveBeenCalledWith("pull-request-number", "12");
    expect(setSecret).toHaveBeenCalledWith("token");
    expect(process.env.SMF_GITHUB_TOKEN).toBeUndefined();
  });

  it("forwards an explicit SMF directory for a multi-app repository", async () => {
    process.env.INPUT_PHASE = "pull-request";
    process.env.INPUT_SMF_PATH = "apps/mobile/smf";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({ nextPhase: "noop" }),
    });

    await run();

    expect(getExecOutput).toHaveBeenCalledWith(
      "/toolchains/dart-3.10/bin/dart",
      expect.arrayContaining(["--smf-path", "apps/mobile/smf"]),
      expect.anything(),
    );
  });

  it("forwards a platform filter for the pull-request phase", async () => {
    process.env.INPUT_PHASE = "pull-request";
    process.env.INPUT_PLATFORM = "ios";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({ nextPhase: "noop" }),
    });

    await run();

    expect(getExecOutput).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining(["--platform", "ios"]),
      expect.anything(),
    );
  });

  it("rejects an unsupported optional platform", async () => {
    process.env.INPUT_PHASE = "ship";
    process.env.INPUT_PLATFORM = "web";

    await expect(run()).rejects.toThrow(
      'platform must be "ios" or "android" when provided',
    );
    expect(getExecOutput).not.toHaveBeenCalled();
  });

  it("rejects release-candidate builds on a non-macOS runner", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("linux");
    process.env.INPUT_PHASE = "release-candidate";
    process.env.INPUT_PLATFORM = "ios";

    await expect(run()).rejects.toThrow(/macOS runner/);
    expect(getExecOutput).not.toHaveBeenCalled();
  });

  it("maps a complete release-candidate result on macOS", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
    process.env.INPUT_PHASE = "release-candidate";
    process.env.INPUT_PLATFORM = "ios";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        releaseCandidateReceipts: [
          {
            platform: "ios",
            version: "1.2.0",
            artifactId: "build-7",
            buildNumber: "7",
          },
        ],
      }),
    });

    await run();

    expect(setOutput).toHaveBeenCalledWith(
      "candidates",
      expect.stringContaining('"platform":"ios"'),
    );
    expect(setOutput).toHaveBeenCalledWith("artifact-id", "build-7");
    expect(setOutput).toHaveBeenCalledWith("build-number", "7");
  });

  it("runs Android release candidates on Linux", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("linux");
    process.env.INPUT_PHASE = "release-candidate";
    process.env.INPUT_PLATFORM = "android";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        releaseCandidateReceipts: [
          {
            platform: "android",
            version: "1.2.0",
            artifactId: "42",
            buildNumber: "42",
          },
        ],
      }),
    });

    await run();

    expect(getExecOutput).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining(["--platform", "android"]),
      expect.anything(),
    );
    expect(setOutput).toHaveBeenCalledWith("artifact-id", "42");
  });

  it("maps multiple release candidates when platform is omitted", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
    process.env.INPUT_PHASE = "release-candidate";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        releaseCandidateReceipts: [
          {
            platform: "ios",
            version: "1.2.0",
            artifactId: "build-7",
            buildNumber: "7",
          },
          {
            platform: "android",
            version: "2.0.0",
            artifactId: "42",
            buildNumber: "42",
          },
        ],
      }),
    });

    await run();

    expect(setOutput).toHaveBeenCalledWith(
      "candidates",
      expect.stringContaining('"platform":"android"'),
    );
    expect(setOutput).not.toHaveBeenCalledWith("platform", expect.anything());
  });

  it("maps ship results without implementing shipping logic", async () => {
    process.env.INPUT_PHASE = "ship";
    process.env.INPUT_PLATFORM = "ios";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        shippedReleases: [
          {
            platform: "ios",
            version: "2.0.0",
            artifactId: "build-42",
            buildNumber: "42",
            githubReleaseUrl:
              "https://github.com/ventairy/example/releases/ios-v2.0.0",
          },
        ],
      }),
    });

    await run();

    expect(setOutput).toHaveBeenCalledWith(
      "releases",
      expect.stringContaining('"platform":"ios"'),
    );
    expect(setOutput).toHaveBeenCalledWith("artifact-id", "build-42");
    expect(setOutput).toHaveBeenCalledWith(
      "release-url",
      "https://github.com/ventairy/example/releases/ios-v2.0.0",
    );
  });

  it("maps a terminal noop pull-request result without optional outputs", async () => {
    process.env.INPUT_PHASE = "pull-request";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({ nextPhase: "noop" }),
    });

    await run();

    expect(setOutput).toHaveBeenCalledTimes(1);
    expect(setOutput).toHaveBeenCalledWith("next-phase", "noop");
  });

  it("maps a ship result without release-candidate-only outputs", async () => {
    process.env.INPUT_PHASE = "pull-request";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        nextPhase: "ship",
        targets: [{ platform: "ios", version: "2.0.0" }],
      }),
    });

    await run();

    expect(setOutput).toHaveBeenCalledWith("next-phase", "ship");
    expect(setOutput).toHaveBeenCalledWith("platform", "ios");
    expect(setOutput).toHaveBeenCalledWith("version", "2.0.0");
    expect(setOutput).not.toHaveBeenCalledWith(
      "release-branch",
      expect.anything(),
    );
  });

  it("rejects a pull-request result without an explicit supported phase", async () => {
    process.env.INPUT_PHASE = "pull-request";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({ platform: "ios" }),
    });

    await expect(run()).rejects.toThrow(
      'invalid pull-request result: "nextPhase" must be',
    );
    expect(setOutput).not.toHaveBeenCalled();
  });

  it("rejects an incomplete release-candidate result", async () => {
    process.env.INPUT_PHASE = "pull-request";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        nextPhase: "release-candidate",
        targets: [{ platform: "ios", version: "1.2.0" }],
      }),
    });

    await expect(run()).rejects.toThrow(
      'invalid pull-request result: "releaseBranch" must be a non-empty string',
    );
  });

  it("rejects a malformed pull request number", async () => {
    process.env.INPUT_PHASE = "pull-request";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        nextPhase: "release-candidate",
        targets: [{ platform: "ios", version: "1.2.0" }],
        releaseBranch: "smf/release",
        pullRequestNumber: "12",
      }),
    });

    await expect(run()).rejects.toThrow(
      'invalid pull-request result: "pullRequestNumber" must be a positive integer',
    );
  });

  it("rejects an incomplete direct release-candidate result", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
    process.env.INPUT_PHASE = "release-candidate";
    process.env.INPUT_PLATFORM = "ios";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        releaseCandidateReceipts: [
          {
            platform: "ios",
            version: "1.2.0",
            buildNumber: "7",
          },
        ],
      }),
    });

    await expect(run()).rejects.toThrow(
      'invalid release-candidate result: "artifactId" must be a non-empty string',
    );
  });

  it("validates every release candidate when multiple platforms are returned", async () => {
    process.env.INPUT_PHASE = "release-candidate";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        releaseCandidateReceipts: [
          {
            platform: "ios",
            version: "1.2.0",
            artifactId: "build-7",
            buildNumber: "7",
          },
          {
            platform: "android",
            version: "2.0.0",
            buildNumber: "42",
          },
        ],
      }),
    });

    await expect(run()).rejects.toThrow(
      'invalid release-candidate result: "artifactId" must be a non-empty string',
    );
  });

  it("rejects duplicate release candidate platforms", async () => {
    process.env.INPUT_PHASE = "release-candidate";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        releaseCandidateReceipts: [
          {
            platform: "android",
            version: "2.0.0",
            artifactId: "42",
            buildNumber: "42",
          },
          {
            platform: "android",
            version: "2.0.1",
            artifactId: "43",
            buildNumber: "43",
          },
        ],
      }),
    });

    await expect(run()).rejects.toThrow(
      "duplicate android release-candidate results",
    );
  });

  it("rejects a result that differs from the selected platform", async () => {
    process.env.INPUT_PHASE = "release-candidate";
    process.env.INPUT_PLATFORM = "android";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        releaseCandidateReceipts: [
          {
            platform: "ios",
            version: "1.2.0",
            artifactId: "build-7",
            buildNumber: "7",
          },
        ],
      }),
    });

    await expect(run()).rejects.toThrow("expected exactly one android result");
  });

  it("rejects an unsupported platform result", async () => {
    process.env.INPUT_PHASE = "pull-request";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        nextPhase: "ship",
        targets: [{ platform: "web", version: "2.0.0" }],
      }),
    });

    await expect(run()).rejects.toThrow(
      '"platform" must be "ios" or "android"',
    );
  });

  it("rejects a pull-request result with no targets", async () => {
    process.env.INPUT_PHASE = "pull-request";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        nextPhase: "ship",
        targets: [],
      }),
    });

    await expect(run()).rejects.toThrow('"targets" must be a non-empty list');
  });

  it("rejects a pull-request result with a non-object target", async () => {
    process.env.INPUT_PHASE = "pull-request";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        nextPhase: "ship",
        targets: ["ios"],
      }),
    });

    await expect(run()).rejects.toThrow("each target must be an object");
  });

  it("rejects duplicate platform targets", async () => {
    process.env.INPUT_PHASE = "pull-request";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        nextPhase: "ship",
        targets: [
          { platform: "android", version: "1.0.0" },
          { platform: "android", version: "1.0.1" },
        ],
      }),
    });

    await expect(run()).rejects.toThrow("duplicate android release targets");
  });

  it("rejects an incomplete ship result", async () => {
    process.env.INPUT_PHASE = "ship";
    process.env.INPUT_PLATFORM = "android";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        shippedReleases: [
          {
            platform: "android",
            version: "2.0.0",
            artifactId: "42",
            buildNumber: "42",
          },
        ],
      }),
    });

    await expect(run()).rejects.toThrow(
      'invalid ship result: "githubReleaseUrl" must be a non-empty string',
    );
  });

  it("validates every shipped release when multiple platforms are returned", async () => {
    process.env.INPUT_PHASE = "ship";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        shippedReleases: [
          {
            platform: "ios",
            version: "2.0.0",
            artifactId: "build-42",
            buildNumber: "42",
            githubReleaseUrl:
              "https://github.com/ventairy/example/releases/ios-v2.0.0",
          },
          {
            platform: "android",
            version: "2.0.0",
            artifactId: "42",
            buildNumber: "42",
          },
        ],
      }),
    });

    await expect(run()).rejects.toThrow(
      'invalid ship result: "githubReleaseUrl" must be a non-empty string',
    );
  });

  it("rejects duplicate shipped release platforms", async () => {
    process.env.INPUT_PHASE = "ship";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        shippedReleases: [
          {
            platform: "ios",
            version: "2.0.0",
            artifactId: "build-42",
            buildNumber: "42",
            githubReleaseUrl:
              "https://github.com/ventairy/example/releases/ios-v2.0.0",
          },
          {
            platform: "ios",
            version: "2.0.1",
            artifactId: "build-43",
            buildNumber: "43",
            githubReleaseUrl:
              "https://github.com/ventairy/example/releases/ios-v2.0.1",
          },
        ],
      }),
    });

    await expect(run()).rejects.toThrow("duplicate ios ship results");
  });

  it("rejects a shipped release that differs from the selected platform", async () => {
    process.env.INPUT_PHASE = "ship";
    process.env.INPUT_PLATFORM = "android";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        shippedReleases: [
          {
            platform: "ios",
            version: "2.0.0",
            artifactId: "build-42",
            buildNumber: "42",
            githubReleaseUrl:
              "https://github.com/ventairy/example/releases/ios-v2.0.0",
          },
        ],
      }),
    });

    await expect(run()).rejects.toThrow(
      "invalid ship result: expected exactly one android result",
    );
  });

  it("surfaces a failed Dart command without parsing output", async () => {
    process.env.INPUT_PHASE = "pull-request";
    getExecOutput.mockResolvedValue({
      exitCode: 1,
      stderr: "smf [CONFIG]: invalid configuration",
      stdout: "",
    });
    await expect(run()).rejects.toThrow("[CONFIG]: invalid configuration");
    expect(setOutput).not.toHaveBeenCalled();
  });

  it("uses a stable fallback when Dart fails without diagnostics", async () => {
    process.env.INPUT_PHASE = "pull-request";
    getExecOutput.mockResolvedValue({
      exitCode: 1,
      stderr: "",
      stdout: "",
    });

    await expect(run()).rejects.toThrow("The Dart action executable failed.");
  });

  it("rejects invalid JSON returned by Dart", async () => {
    process.env.INPUT_PHASE = "pull-request";
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
      process.env.INPUT_PHASE = "pull-request";
      getExecOutput.mockResolvedValue({
        exitCode: 0,
        stderr: "",
        stdout,
      });

      await expect(run()).rejects.toThrow("returned an invalid result");
    },
  );

  it("requires the GitHub token before launching Dart", async () => {
    process.env.INPUT_PHASE = "pull-request";
    process.env.SMF_GITHUB_TOKEN = " ";

    await expect(run()).rejects.toThrow("github-token is required");
    expect(getExecOutput).not.toHaveBeenCalled();
  });

  it("requires the isolated Dart toolchain before launching SMF", async () => {
    process.env.INPUT_PHASE = "pull-request";
    delete process.env.SMF_DART;

    await expect(run()).rejects.toThrow("Dart toolchain is missing");
    expect(getExecOutput).not.toHaveBeenCalled();
  });

  it("requires a complete GitHub repository context", async () => {
    process.env.INPUT_PHASE = "pull-request";
    process.env.GITHUB_REPOSITORY = "ventairy";

    await expect(run()).rejects.toThrow(
      "repository context is missing or invalid",
    );
    expect(getExecOutput).not.toHaveBeenCalled();
  });

  it("masks every supplied release credential before execution", async () => {
    process.env.INPUT_PHASE = "pull-request";
    process.env.SMF_APP_STORE_CONNECT_AUTH_KEY_BASE64 = "encoded-auth-key";
    process.env.SMF_IOS_CERTIFICATE_PASSWORD = "p12-password";
    process.env.SMF_GOOGLE_PLAY_SERVICE_ACCOUNT_JSON =
      '{\n  "type": "service_account"\n}';
    process.env.SMF_ANDROID_KEYSTORE_PASSWORD = "keystore-password";
    getExecOutput.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({ nextPhase: "noop" }),
    });

    await run();

    expect(setSecret).toHaveBeenCalledWith("token");
    expect(setSecret).toHaveBeenCalledWith("encoded-auth-key");
    expect(setSecret).toHaveBeenCalledWith("p12-password");
    expect(setSecret).toHaveBeenCalledWith('{\n  "type": "service_account"\n}');
    expect(setSecret).toHaveBeenCalledWith("keystore-password");
    expect(getExecOutput).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({
        env: expect.objectContaining({
          SMF_APP_STORE_CONNECT_AUTH_KEY_BASE64: "encoded-auth-key",
          SMF_GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:
            '{\n  "type": "service_account"\n}',
        }),
      }),
    );
  });

  it("rejects unknown phases before launching Dart", async () => {
    process.env.INPUT_PHASE = "destroy";
    await expect(run()).rejects.toThrow('Unsupported phase "destroy"');
    expect(getExecOutput).not.toHaveBeenCalled();
  });
});

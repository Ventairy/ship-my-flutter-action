import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, it } from "vitest";

const exec = promisify(execFile);
const actionRoot = path.resolve(import.meta.dirname, "..");
const coreRoot = path.join(actionRoot, "vendor", "smf");
const originalEnvironment = { ...process.env };

async function dartExecutable(): Promise<string> {
  if (process.env.SMF_TEST_DART) {
    return process.env.SMF_TEST_DART;
  }
  const command = (await exec("which", ["dart"])).stdout.trim();
  const sdkBinary = path.resolve(
    path.dirname(await fs.realpath(command)),
    "cache",
    "dart-sdk",
    "bin",
    "dart",
  );
  try {
    await fs.access(sdkBinary);
    return sdkBinary;
  } catch {
    return command;
  }
}

afterEach(() => {
  for (const name of Object.keys(process.env)) {
    if (!(name in originalEnvironment)) delete process.env[name];
  }
  Object.assign(process.env, originalEnvironment);
});

it("runs the vendored Dart planner through the native Action adapter", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "smf-action-dart-"));
  try {
    const dart = await dartExecutable();
    process.env.CI = "true";
    await fs.mkdir(path.join(root, "ios"));
    await fs.writeFile(
      path.join(root, "pubspec.yaml"),
      "name: example\nversion: 1.0.0+1\n",
    );
    await fs.writeFile(path.join(root, "pubspec.lock"), "# fixture lockfile\n");
    await exec("git", ["init", "-b", "main"], { cwd: root });
    await exec("git", ["config", "user.name", "Test"], { cwd: root });
    await exec("git", ["config", "user.email", "test@example.com"], {
      cwd: root,
    });
    await exec("git", ["add", "."], { cwd: root });
    await exec("git", ["commit", "-m", "chore: bootstrap"], { cwd: root });
    await exec(
      dart,
      [
        "run",
        path.join(coreRoot, "bin", "init.dart"),
        "--bundle-id",
        "dev.example.app",
      ],
      { cwd: root },
    );
    await exec("git", ["add", "."], { cwd: root });
    await exec("git", ["commit", "-m", "chore: configure releases"], {
      cwd: root,
    });

    const output = path.join(root, "github-output.txt");
    await fs.writeFile(output, "");
    process.env.GITHUB_ACTION_PATH = actionRoot;
    process.env.GITHUB_OUTPUT = output;
    process.env.GITHUB_REPOSITORY = "ventairy/example";
    process.env.GITHUB_WORKSPACE = root;
    process.env.INPUT_GITHUB_TOKEN = "not-a-real-token";
    process.env.INPUT_PHASE = "pull-request";
    process.env.PATH = `${path.dirname(dart)}${path.delimiter}${process.env.PATH ?? ""}`;
    process.env.SMF_CORE_DART = dart;
    process.env.SMF_CONSUMER_PATH = process.env.PATH;
    const { run } = await import("../src/main.js");
    await run();

    expect(await fs.readFile(output, "utf8")).toMatch(/^phase<<.+\nnoop\n.+$/m);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

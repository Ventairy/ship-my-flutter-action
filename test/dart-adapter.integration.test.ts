import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, it } from "vitest";

const exec = promisify(execFile);
const actionRoot = path.resolve(import.meta.dirname, "..");
const originalEnvironment = { ...process.env };

async function smfExecutable(): Promise<string> {
  if (process.env.SMF_TEST_EXECUTABLE) {
    return process.env.SMF_TEST_EXECUTABLE;
  }
  return (await exec("which", ["smf"])).stdout.trim();
}

afterEach(() => {
  for (const name of Object.keys(process.env)) {
    if (!(name in originalEnvironment)) delete process.env[name];
  }
  Object.assign(process.env, originalEnvironment);
});

it("runs the installed SMF CLI through the native Action adapter", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "smf-action-dart-"));
  const origin = await fs.mkdtemp(path.join(os.tmpdir(), "smf-action-origin-"));
  try {
    const smf = await smfExecutable();
    process.env.CI = "true";
    await exec("git", ["init", "--bare"], { cwd: origin });
    await fs.mkdir(path.join(root, "ios"));
    await fs.writeFile(path.join(root, "ios", ".keep"), "");
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
    await exec(smf, ["init", "--ios-bundle-id", "dev.example.app"], {
      cwd: root,
    });
    await exec("git", ["add", "."], { cwd: root });
    await exec("git", ["commit", "-m", "chore: configure releases"], {
      cwd: root,
    });
    await exec("git", ["remote", "add", "origin", origin], { cwd: root });
    await exec("git", ["push", "-u", "origin", "main"], { cwd: root });
    await exec("git", ["symbolic-ref", "HEAD", "refs/heads/main"], {
      cwd: origin,
    });

    const output = path.join(root, "github-output.txt");
    await fs.writeFile(output, "");
    process.env.GITHUB_ACTION_PATH = actionRoot;
    process.env.GITHUB_OUTPUT = output;
    process.env.GITHUB_REPOSITORY = "ventairy/example";
    process.env.GITHUB_WORKSPACE = root;
    process.env.SMF_GITHUB_TOKEN = "not-a-real-token";
    process.env.INPUT_PHASE = "pull-request";
    process.env.SMF_EXECUTABLE = smf;
    process.env.SMF_CONSUMER_PATH = process.env.PATH;
    const { run } = await import("../src/main.js");
    await run();

    expect(await fs.readFile(output, "utf8")).toMatch(
      /^next-phase<<.+\nnoop\n.+$/m,
    );
  } finally {
    await Promise.all([
      fs.rm(root, { recursive: true, force: true }),
      fs.rm(origin, { recursive: true, force: true }),
    ]);
  }
}, 30_000);

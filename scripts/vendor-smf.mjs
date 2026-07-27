import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const actionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const workspaceRoot = path.resolve(actionRoot, "..", "smf");
const destination = path.join(actionRoot, "vendor", "smf");
const packages = [
  "smf_hooks",
  "smf_engine",
  "smf_apple",
  "smf_android",
  "smf_cli",
];

const [{ stdout: smfCommit }, { stdout: smfStatus }] = await Promise.all([
  execFileAsync("git", ["rev-parse", "HEAD"], { cwd: workspaceRoot }),
  execFileAsync("git", ["status", "--porcelain"], { cwd: workspaceRoot }),
]);
if (smfStatus.trim()) {
  throw new Error(
    "The SMF checkout must be clean before vendoring so SMF_COMMIT " +
      "identifies the copied source exactly.",
  );
}

await fs.rm(destination, { recursive: true, force: true });
await fs.mkdir(destination, { recursive: true });
await fs.writeFile(
  path.join(destination, "pubspec.yaml"),
  `name: smf_action_runtime
publish_to: none
environment:
  sdk: ">=3.10.0 <4.0.0"
workspace:
${packages.map((name) => `  - packages/${name}`).join("\n")}
`,
);

for (const packageName of packages) {
  const source = path.join(workspaceRoot, "packages", packageName);
  const target = path.join(destination, "packages", packageName);
  await fs.mkdir(target, { recursive: true });
  const entries = ["lib", "pubspec.yaml", "LICENSE", "NOTICE"];
  if (packageName === "smf_cli") entries.push("bin");
  for (const entry of entries) {
    await fs.cp(path.join(source, entry), path.join(target, entry), {
      recursive: true,
    });
  }
}

await fs.writeFile(
  path.join(destination, "SMF_COMMIT"),
  smfCommit.trim() + "\n",
);

await execFileAsync("dart", ["pub", "get"], { cwd: destination });

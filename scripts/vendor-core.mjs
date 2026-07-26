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
const coreRoot = path.resolve(actionRoot, "..", "ship-my-flutter");
const destination = path.join(actionRoot, "vendor", "ship-my-flutter");

const [{ stdout: coreCommit }, { stdout: coreStatus }] = await Promise.all([
  execFileAsync("git", ["rev-parse", "HEAD"], { cwd: coreRoot }),
  execFileAsync("git", ["status", "--porcelain"], { cwd: coreRoot }),
]);
if (coreStatus.trim()) {
  throw new Error(
    "The core checkout must be clean before vendoring so CORE_COMMIT " +
      "identifies the copied source exactly.",
  );
}

await fs.rm(destination, { recursive: true, force: true });
await fs.mkdir(destination, { recursive: true });
await Promise.all([
  fs.cp(path.join(coreRoot, "bin"), path.join(destination, "bin"), {
    recursive: true,
  }),
  fs.cp(path.join(coreRoot, "lib"), path.join(destination, "lib"), {
    recursive: true,
  }),
  fs.copyFile(
    path.join(coreRoot, "pubspec.yaml"),
    path.join(destination, "pubspec.yaml"),
  ),
  fs.copyFile(
    path.join(coreRoot, "pubspec.lock"),
    path.join(destination, "pubspec.lock"),
  ),
  fs.copyFile(
    path.join(coreRoot, "LICENSE"),
    path.join(destination, "LICENSE"),
  ),
  fs.copyFile(path.join(coreRoot, "NOTICE"), path.join(destination, "NOTICE")),
  fs.writeFile(path.join(destination, "CORE_COMMIT"), coreCommit.trim() + "\n"),
]);

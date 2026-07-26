import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const actionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const coreRoot = path.resolve(actionRoot, "..", "ship-my-flutter");
const destination = path.join(actionRoot, "vendor", "ship-my-flutter");

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
]);

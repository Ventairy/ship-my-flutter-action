import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const actionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const dist = path.join(actionRoot, "dist");

await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist);

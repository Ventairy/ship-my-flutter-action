import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const actionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const coreRoot = path.resolve(actionRoot, "..", "ship-my-flutter");
const destination = path.join(actionRoot, "vendor", "ship-my-flutter");
const sourcePackage = JSON.parse(
  await fs.readFile(path.join(coreRoot, "package.json"), "utf8"),
);

await fs.rm(destination, { recursive: true, force: true });
await fs.mkdir(destination, { recursive: true });
await Promise.all([
  fs.cp(path.join(coreRoot, "dist"), path.join(destination, "dist"), {
    recursive: true,
  }),
  fs.cp(path.join(coreRoot, "schemas"), path.join(destination, "schemas"), {
    recursive: true,
  }),
  fs.cp(path.join(coreRoot, "templates"), path.join(destination, "templates"), {
    recursive: true,
  }),
  fs.copyFile(
    path.join(coreRoot, "LICENSE"),
    path.join(destination, "LICENSE"),
  ),
  fs.copyFile(path.join(coreRoot, "NOTICE"), path.join(destination, "NOTICE")),
]);
await fs.writeFile(
  path.join(destination, "package.json"),
  `${JSON.stringify(
    {
      name: sourcePackage.name,
      version: sourcePackage.version,
      type: sourcePackage.type,
      main: sourcePackage.main,
      types: sourcePackage.types,
      exports: sourcePackage.exports,
      dependencies: sourcePackage.dependencies,
    },
    null,
    2,
  )}\n`,
);

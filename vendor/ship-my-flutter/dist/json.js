import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
export async function readJson(filePath) {
    const source = await fs.readFile(filePath, "utf8");
    return JSON.parse(source);
}
export async function writeJson(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
export async function readYaml(filePath) {
    const source = await fs.readFile(filePath, "utf8");
    return YAML.parse(source);
}
export async function writeYaml(filePath, value, schemaUrl) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const schemaDirective = schemaUrl
        ? `# yaml-language-server: $schema=${schemaUrl}\n\n`
        : "";
    await fs.writeFile(filePath, `${schemaDirective}${YAML.stringify(value)}`, "utf8");
}
export async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=json.js.map
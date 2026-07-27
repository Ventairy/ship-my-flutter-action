import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const actionPath = path.resolve(import.meta.dirname, "..", "action.yml");

describe("composite action contract", () => {
  it("leaves Flutter installation to the consumer workflow", async () => {
    const action = await fs.readFile(actionPath, "utf8");

    expect(action).not.toContain("subosito/flutter-action");
    expect(action).not.toContain("flutter-version:");
    expect(action).not.toContain("flutter-version-file:");
  });

  it("isolates the core Dart SDK from the consumer toolchain", async () => {
    const action = await fs.readFile(actionPath, "utf8");

    expect(action).toContain("Preserve consumer toolchain");
    expect(action).toContain("dart-lang/setup-dart@");
    expect(action).toContain("SMF_CORE_DART:");
    expect(action).toContain("SMF_CONSUMER_PATH:");
  });

  it("documents the complete workflow phase protocol", async () => {
    const action = await fs.readFile(actionPath, "utf8");

    expect(action).toContain(
      "Workflow phase: pull-request, release-candidate, or ship.",
    );
    expect(action).not.toContain(
      "Workflow phase: plan, candidate, or promote.",
    );
  });

  it("exposes explicit SMF app selection without app-path configuration", async () => {
    const action = await fs.readFile(actionPath, "utf8");

    expect(action).toContain("smf-path:");
    expect(action).toContain("INPUT_SMF_PATH:");
    expect(action).not.toContain("app-path:");
  });
});

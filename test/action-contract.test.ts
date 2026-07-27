import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const actionPath = path.resolve(import.meta.dirname, "..", "action.yml");
const resolveProjectPath = path.resolve(
  import.meta.dirname,
  "..",
  "resolve-project",
  "action.yml",
);
const setupFlutterPath = path.resolve(
  import.meta.dirname,
  "..",
  "setup-flutter",
  "action.yml",
);

describe("composite action contract", () => {
  it("leaves Flutter installation to the consumer workflow", async () => {
    const action = await fs.readFile(actionPath, "utf8");

    expect(action).not.toContain("subosito/flutter-action");
    expect(action).not.toContain("flutter-version:");
    expect(action).not.toContain("flutter-version-file:");
  });

  it("isolates the SMF Dart SDK from the consumer toolchain", async () => {
    const action = await fs.readFile(actionPath, "utf8");

    expect(action).toContain("Preserve consumer toolchain");
    expect(action).toContain("dart-lang/setup-dart@");
    expect(action).toContain("SMF_DART:");
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

  it("exposes both platform credentials and generic artifact outputs", async () => {
    const action = await fs.readFile(actionPath, "utf8");

    expect(action).toContain("platform:");
    expect(action).toContain("google-play-service-account-json-base64:");
    expect(action).toContain("android-keystore-base64:");
    expect(action).toContain("releases:");
    expect(action).toContain("artifact-id:");
    expect(action).not.toContain("build-id:");
  });

  it("ships the project resolution and Flutter setup sub-actions", async () => {
    const resolveProject = await fs.readFile(resolveProjectPath, "utf8");
    const setupFlutter = await fs.readFile(setupFlutterPath, "utf8");

    expect(resolveProject).toContain("has-before-create-hook:");
    expect(resolveProject).toContain(
      "smf-path must stay inside the repository.",
    );
    expect(setupFlutter).toContain("subosito/flutter-action@");
    expect(setupFlutter).toContain("dart pub global activate fvm");
  });
});

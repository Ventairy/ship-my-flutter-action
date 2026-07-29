import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const exec = promisify(execFile);

const actionPath = path.resolve(import.meta.dirname, "..", "action.yml");
const releaseWorkflowPath = path.resolve(
  import.meta.dirname,
  "..",
  ".github",
  "workflows",
  "release-please.yml",
);
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

type ActionDocument = {
  name?: unknown;
  runs?: {
    using?: unknown;
    steps?: Array<{ run?: unknown }>;
  };
};

async function readActionDocument(filePath: string): Promise<ActionDocument> {
  const value: unknown = parse(await fs.readFile(filePath, "utf8"));
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`${filePath} must contain a YAML object.`);
  }
  return value as ActionDocument;
}

describe("composite action contract", () => {
  it("parses every action metadata file as a composite action", async () => {
    const documents = await Promise.all(
      [actionPath, resolveProjectPath, setupFlutterPath].map(
        readActionDocument,
      ),
    );

    expect(
      documents.map((document) => ({
        name: document.name,
        using: document.runs?.using,
        hasSteps:
          Array.isArray(document.runs?.steps) && document.runs.steps.length > 0,
      })),
    ).toEqual([
      { name: "SMF", using: "composite", hasSteps: true },
      { name: "Resolve SMF project", using: "composite", hasSteps: true },
      { name: "Set up consumer Flutter", using: "composite", hasSteps: true },
    ]);
  });

  it("describes app-scoped release automation", async () => {
    const action = await fs.readFile(actionPath, "utf8");

    expect(action).toContain("Open app-scoped Flutter release PRs");
    expect(action).not.toContain("Open shared Flutter release PRs");
  });

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

  it("leaves release PR validation to the normal pull request checks", async () => {
    const workflow = await fs.readFile(releaseWorkflowPath, "utf8");

    expect(workflow).not.toContain("gh workflow run");
  });

  it("exposes explicit SMF app selection without app-path configuration", async () => {
    const action = await fs.readFile(actionPath, "utf8");

    expect(action).toContain("smf-path:");
    expect(action).toContain("INPUT_SMF_PATH:");
    expect(action).not.toContain("app-path:");
  });

  it("exposes phase-specific results and common artifact outputs", async () => {
    const action = await fs.readFile(actionPath, "utf8");

    expect(action).toContain("platform:");
    expect(action).toContain("app-store-connect-auth-key-base64:");
    expect(action).not.toContain("ios-provisioning-profiles-base64:");
    expect(action).not.toContain("app-store-connect-private-key-base64:");
    expect(action).toContain("google-play-service-account-json:");
    expect(action).not.toContain("google-play-service-account-json-base64:");
    expect(action).toContain("android-keystore-base64:");
    expect(action).toContain("next-phase:");
    expect(action).toContain("targets:");
    expect(action).toContain("release-branch:");
    expect(action).toContain("candidates:");
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
    expect(setupFlutter).toContain("FVM_CACHE_PATH=%s/fvm");
    expect(setupFlutter).toContain("path: ~/fvm/versions");
    expect(setupFlutter).toContain("fvm install --skip-pub-get");
  });

  it("rejects an smf directory that resolves outside the repository", async () => {
    const workspace = await fs.mkdtemp(
      path.join(os.tmpdir(), "smf-action-workspace-"),
    );
    const external = await fs.mkdtemp(
      path.join(os.tmpdir(), "smf-action-external-"),
    );
    try {
      const externalSmf = path.join(external, "smf");
      const linkedParent = path.join(workspace, "linked");
      await fs.mkdir(externalSmf);
      await fs.mkdir(linkedParent);
      await fs.writeFile(
        path.join(externalSmf, "config.yaml"),
        "app_id: test\n",
      );
      await fs.symlink(externalSmf, path.join(linkedParent, "smf"));
      const output = path.join(workspace, "output.txt");
      await fs.writeFile(output, "");
      const document = await readActionDocument(resolveProjectPath);
      const script = document.runs?.steps?.find(
        (step) => typeof step.run === "string",
      )?.run;
      if (typeof script !== "string") {
        throw new Error("Resolve project action must contain a shell script.");
      }

      let stderr = "";
      try {
        await exec("bash", ["-e", "-o", "pipefail", "-c", script], {
          cwd: workspace,
          env: {
            ...process.env,
            GITHUB_OUTPUT: output,
            GITHUB_WORKSPACE: workspace,
            INPUT_SMF_PATH: "linked/smf",
          },
        });
      } catch (error: unknown) {
        if (
          error !== null &&
          typeof error === "object" &&
          "stderr" in error &&
          typeof error.stderr === "string"
        ) {
          stderr = error.stderr;
        }
      }

      expect(stderr).toContain("smf-path must resolve inside the repository.");
    } finally {
      await Promise.all([
        fs.rm(workspace, { recursive: true, force: true }),
        fs.rm(external, { recursive: true, force: true }),
      ]);
    }
  });
});

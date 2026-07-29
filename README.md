<div align="center">

# SMF Action

**Release Flutter apps through one reviewable pull request.**

[![CI](https://github.com/Ventairy/smf-action/actions/workflows/ci.yml/badge.svg)](https://github.com/Ventairy/smf-action/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Ventairy/smf-action?display_name=tag&sort=semver)](https://github.com/Ventairy/smf-action/releases/latest)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

[Marketplace](https://github.com/marketplace/actions/smf-flutter-release) ·
[Quick start](#quick-start) · [How it works](#how-it-works) ·
[Inputs](#inputs) · [Outputs](#outputs) · [Security](#security)

</div>

The official GitHub Action for [SMF](https://github.com/Ventairy/smf).
It turns Conventional Commits into independently versioned iOS and Android
releases, uploads exact store artifacts for testing, and verifies or delivers
those same artifacts after the release pull request is approved and merged.

- One app-scoped release PR for versions, changelogs, candidates, and approval.
- Separate iOS and Android versions, release candidates, and delivery settings.
- TestFlight and Google Play testing before merge.
- Exact-artifact verification and optional delivery after merge—never a release
  rebuild.
- Safe defaults: generated configurations upload candidates but do not opt into
  App Review or Google Play production delivery.

## Quick start

SMF generates the complete workflow for your app. Install the CLI, then
initialize SMF from the Flutter app directory:

```bash
dart install smf_cli

smf init \
  --version 1.0.0 \
  --ios-bundle-id com.acme.myapp \
  --android-package-name com.acme.myapp
```

Replace the example version and store identifiers with the app's real current
version, production bundle ID, and production package name. The command creates:

```text
smf/config.yaml
.github/workflows/smf-<app-id>.yml
```

Next, follow the
[GitHub Actions setup guide](https://github.com/Ventairy/smf/blob/main/doc/github-actions-setup.md)
to configure the generated GitHub Environment, platform credentials, and
repository settings.

> [!IMPORTANT]
> Commit the generated workflow as one unit. It coordinates project discovery,
> runner selection, Flutter setup, phase routing, credentials, and release
> candidate serialization. A single `Ventairy/smf-action` step is not a complete
> release workflow.

For a nested Flutter app, initialize from the repository root:

```bash
smf init \
  --app-path apps/mobile \
  --app-id mobile \
  --version 1.0.0 \
  --ios-bundle-id com.acme.mobile \
  --android-package-name com.acme.mobile
```

If `smf/config.yaml` already exists and only the workflow is missing, regenerate
it without changing release state:

```bash
smf init --github-actions
```

## How it works

The generated workflow invokes the Action in three phases:

| Phase               | When it runs                                  | Result                                                                             |
| ------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `pull-request`      | A qualifying commit reaches the target branch | Opens or updates the app release PR and returns its platform matrix                |
| `release-candidate` | The release PR needs a candidate              | Builds, signs, uploads, verifies, and records one selected platform                |
| `ship`              | The approved release PR is merged             | Revalidates the artifact and applies its configured destination without rebuilding |

```text
qualifying commit
       |
       v
release pull request
   /             \
  v               v
iOS candidate   Android candidate
TestFlight      Play testing
   \             /
    v           v
     test and approve
            |
            v
      merge release PR
            |
            v
 verify, then keep or promote the same artifacts
```

The `pull-request` phase decides the next phase and returns a JSON platform
matrix. Release candidate and ship jobs then run once for each selected
platform. iOS and Android can release independently and may have different
versions.

### Runner model

| Work                       | Generated runner | Why                                                |
| -------------------------- | ---------------- | -------------------------------------------------- |
| Plan or update the PR      | Ubuntu           | Git and GitHub orchestration                       |
| Build an iOS candidate     | macOS            | Xcode, Apple signing, and IPA upload               |
| Build an Android candidate | Ubuntu           | Flutter/Gradle build, upload signing, and Play API |
| Ship either platform       | Ubuntu           | Store verification/promotion; no build             |

Candidate jobs are serialized because they commit platform receipts to the same
release branch. Ship jobs may run independently after merge.

The Action installs the exact published `smf_cli` version recorded by its
release and executes its compiled `smf` command in isolation. It does not use a
consumer-installed CLI, and it preserves the consumer Flutter/FVM toolchain
used to build the app.

## Usage

The generated workflow is the supported integration. Its core invocation looks
like this:

```yaml
- id: smf
  uses: Ventairy/smf-action@v1
  with:
    phase: pull-request
    smf-path: smf
```

Release candidate and ship jobs pass `platform` from the matrix and provide only
the credentials required by that phase. See the
[generated workflow template](https://github.com/Ventairy/smf/blob/main/packages/smf_engine/templates/smf.yml)
for the complete, current composition.

### Version pinning

Use the major tag to receive compatible v1 updates:

```yaml
- uses: Ventairy/smf-action@v1
```

To pin the repository-owned Action code, use the same full commit for the root
Action and both bundled sub-actions:

```yaml
- uses: Ventairy/smf-action@<full-commit-sha>
- uses: Ventairy/smf-action/resolve-project@<full-commit-sha>
- uses: Ventairy/smf-action/setup-flutter@<full-commit-sha>
```

Do not mix refs across these three Actions.

The pinned Action installs the exact immutable `smf_cli` package version
recorded by that commit. Pub resolves its compatible hosted dependencies during
installation, so runners require access to pub.dev.

## Inputs

### Workflow inputs

| Input          | Required | Default               | Description                                                       |
| -------------- | -------- | --------------------- | ----------------------------------------------------------------- |
| `phase`        | Yes      | —                     | `pull-request`, `release-candidate`, or `ship`                    |
| `platform`     | No       | All eligible targets  | Optional `ios` or `android` filter                                |
| `smf-path`     | No       | Auto-discovered       | Repository-relative path to the selected app's exact `smf` folder |
| `github-token` | No       | `${{ github.token }}` | Token used for release PRs, receipts, tags, and GitHub Releases   |

Use `smf-path` in repositories containing multiple initialized apps. For
example, the app under `apps/mobile` uses `apps/mobile/smf`.

### Apple credentials

| Input                               | Release candidate | Ship     | Description                               |
| ----------------------------------- | ----------------- | -------- | ----------------------------------------- |
| `app-store-connect-key-id`          | Required          | Required | App Store Connect API key ID              |
| `app-store-connect-issuer-id`       | Required          | Required | App Store Connect issuer ID               |
| `app-store-connect-auth-key-base64` | Required          | Required | Base64-encoded `AuthKey_*.p8`             |
| `ios-certificate-base64`            | Required          | —        | Base64-encoded Apple Distribution `.p12`  |
| `ios-certificate-password`          | Required          | —        | Password for the Distribution certificate |

### Android credentials

| Input                              | Release candidate | Ship     | Description                                |
| ---------------------------------- | ----------------- | -------- | ------------------------------------------ |
| `google-play-service-account-json` | Required          | Required | Complete Google Play service-account JSON  |
| `android-keystore-base64`          | Required          | —        | Base64-encoded Google Play upload keystore |
| `android-key-alias`                | Required          | —        | Upload-key alias                           |
| `android-keystore-password`        | Required          | —        | Upload-keystore password                   |
| `android-key-password`             | Required          | —        | Upload-key password                        |

The generated workflow reads these values from GitHub Environment
`smf-<app-id>`. Configure only the credentials for platforms enabled in
`smf/config.yaml`.

## Outputs

### Phase results

| Output                | Phase               | Value                                                       |
| --------------------- | ------------------- | ----------------------------------------------------------- |
| `next-phase`          | `pull-request`      | `noop`, `release-candidate`, or `ship`                      |
| `targets`             | `pull-request`      | JSON array for `strategy.matrix.include`                    |
| `release-branch`      | `pull-request`      | Release branch to check out for candidate creation          |
| `pull-request-number` | `pull-request`      | Release PR number when one is open                          |
| `candidates`          | `release-candidate` | JSON array of uploaded or reused release candidate receipts |
| `releases`            | `ship`              | JSON array of shipped platform evidence                     |

### Single-platform convenience outputs

These outputs are set when a phase produces exactly one target, candidate, or
release:

| Output         | Description                                             |
| -------------- | ------------------------------------------------------- |
| `platform`     | `ios` or `android`                                      |
| `version`      | Platform marketing version                              |
| `artifact-id`  | App Store Connect build ID or Google Play `versionCode` |
| `build-number` | Apple build number or Google Play `versionCode`         |
| `release-url`  | GitHub Release URL; ship phase only                     |

When multiple platforms are returned, consume `targets`, `candidates`, or
`releases` instead of the convenience outputs.

## Permissions

The generated workflow grants permissions per job:

| Phase               | Required `GITHUB_TOKEN` permissions                        |
| ------------------- | ---------------------------------------------------------- |
| `pull-request`      | `contents: write`, `pull-requests: write`, `issues: write` |
| `release-candidate` | `contents: write`                                          |
| `ship`              | `contents: write`                                          |

Enable **Settings → Actions → General → Workflow permissions → Allow GitHub
Actions to create and approve pull requests**.

The default token can create SMF resources, but GitHub may suppress unrelated
`pull_request` workflows for a PR created by that token. If the release PR must
run the same independent checks as a human-authored PR, use a GitHub App
installation token or a narrowly scoped fine-grained token. Follow the
[GitHub permissions guide](https://github.com/Ventairy/smf/blob/main/doc/security.md#github-permissions).

## Security

> [!WARNING]
> Release candidate jobs execute trusted application code with store and signing
> credentials. Never expose those credentials to untrusted fork code.

- Store credentials are accepted as Action inputs, masked before execution, and
  removed before repository hooks and project commands.
- Generated checkouts use `persist-credentials: false`.
- Temporary signing files are created outside the repository and cleaned up
  after use.
- Release candidate receipts contain identities and hashes, never private keys
  or passwords.
- Promotion validates the recorded source, platform identity, fingerprint, and
  store artifact before delivery.
- Base64 is transport encoding, not encryption. Store encoded credentials as
  secrets.

Start with candidate-only delivery. Add App Review or Google Play production
targets only after the complete testing flow succeeds. See the
[SMF security guide](https://github.com/Ventairy/smf/blob/main/doc/security.md)
for credential scopes, trusted-code boundaries, token choices, and incident
response.

## Troubleshooting

### The release PR was not created

Confirm the job grants the pull-request phase permissions above and that the
repository allows Actions to create pull requests. Then run `smf validate`
locally and inspect the stable SMF error code in the failed step.

### The release PR did not trigger our normal checks

This is expected when GitHub suppresses workflow events caused by its default
token. Use a GitHub App installation token or a fine-grained token consistently
across the SMF jobs.

### The iOS candidate fails before building

iOS release candidates require a macOS runner. Use the generated platform
matrix instead of forcing all candidates onto Ubuntu.

### SMF selected the wrong app

Pass the repository-relative `smf-path`, such as `apps/mobile/smf`, to the root
Action and `resolve-project` steps. Regenerate the workflow with:

```bash
smf init --app-path apps/mobile --github-actions
```

### A credential is reported missing

Add it to GitHub Environment `smf-<app-id>` using the exact name from the
[Apple](https://github.com/Ventairy/smf/blob/main/doc/apple-bootstrap.md)
or
[Android](https://github.com/Ventairy/smf/blob/main/doc/android-bootstrap.md)
setup guide. Do not move secrets to workflow-wide environment variables.

For retry, recovery, and release-PR merge checks, use the
[operations guide](https://github.com/Ventairy/smf/blob/main/doc/operations.md).

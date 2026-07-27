# smf-action

[![CI](https://github.com/Ventairy/smf-action/actions/workflows/ci.yml/badge.svg)](https://github.com/Ventairy/smf-action/actions/workflows/ci.yml)

The official GitHub Action for [smf](https://github.com/Ventairy/smf).

> [!WARNING]
> This action is in pre-release validation and has no `v1` tag yet. The public
> integration fixture is pinned to an exact tested commit; production `@v1`
> publication remains tracked in
> [action issue #1](https://github.com/Ventairy/smf-action/issues/1)
> after the live Apple acceptance gate. Examples below describe the intended
> stable interface. Non-Apple action behavior is exercised publicly in
> [`Ventairy/smf-e2e`](https://github.com/Ventairy/smf-e2e).

It exposes the full release lifecycle through one action:

- `pull-request` opens or updates the platform release PR;
- `release-candidate` builds, signs, uploads, and records the exact TestFlight build;
- `ship` verifies that recorded build after merge, optionally submits it
  when configured, and completes the platform GitHub Release.

The Action vendors the exact Dart core source and owns a generated deployment
lockfile for it. It installs its own pinned Dart SDK and enforces that lockfile
automatically, so consumer repositories do not install Node packages or
Fastlane. It does not install the app's Flutter or FVM toolchain.

## Use

Run the initializer from the Flutter app directory:

```bash
dart pub add --dev smf
dart run smf init \
  --current-version <current-ios-version> \
  --bundle-id com.example.myapp
```

`--current-version` is the latest iOS marketing version already represented by
the repository, not the next version you want to ship. For a never-released
app, use `0.0.0` and add `Release-As-ios: 1.0.0` to the first qualifying
Conventional Commit.

The generated `smf/config.yaml` includes a JSON Schema directive
for editor validation and autocomplete. The initializer also writes the
complete multi-job workflow and pins the exact app-local `smf/` path. Its
essential Action calls are:

```yaml
env:
  SMF_PATH: apps/mobile/smf

- uses: Ventairy/smf-action@v1
  with:
    phase: pull-request
    smf-path: ${{ env.SMF_PATH }}

- uses: Ventairy/smf-action@v1
  with:
    phase: release-candidate
    smf-path: ${{ env.SMF_PATH }}
    app-store-connect-key-id: ${{ secrets.APP_STORE_CONNECT_KEY_ID }}
    app-store-connect-issuer-id: ${{ secrets.APP_STORE_CONNECT_ISSUER_ID }}
    app-store-connect-private-key-base64: ${{ secrets.APP_STORE_CONNECT_PRIVATE_KEY_BASE64 }}
    ios-certificate-base64: ${{ secrets.IOS_CERTIFICATE_BASE64 }}
    ios-certificate-password: ${{ secrets.IOS_CERTIFICATE_PASSWORD }}
    ios-provisioning-profiles-base64: ${{ secrets.IOS_PROVISIONING_PROFILES_BASE64 }}

- uses: Ventairy/smf-action@v1
  with:
    phase: ship
    smf-path: ${{ env.SMF_PATH }}
    app-store-connect-key-id: ${{ secrets.APP_STORE_CONNECT_KEY_ID }}
    app-store-connect-issuer-id: ${{ secrets.APP_STORE_CONNECT_ISSUER_ID }}
    app-store-connect-private-key-base64: ${{ secrets.APP_STORE_CONNECT_PRIVATE_KEY_BASE64 }}
```

> [!IMPORTANT]
> The release-candidate phase requires macOS and the supported Xcode/Flutter toolchain.
> The generated workflow searches only the selected app and its ancestors for
> `.fvmrc` or legacy `.fvm/fvm_config.json`, then installs that declared SDK.
> Repositories without FVM receive current stable Flutter. When
> `before_create_pr.dart` exists, the pull-request job installs the same
> selected project toolchain before invoking the Action; otherwise that job
> avoids the unnecessary setup.
> Use an App Store Connect API key with `Developer` access only for `upload`
> delivery without TestFlight groups. Group assignment and App Review
> submission require at least `App Manager` access.
> The generated workflow uses GitHub-hosted `macos-26`; a compatible ephemeral
> self-hosted runner is also valid. Pull-request and ship can run on Ubuntu.

## Inputs

| Input                                  | Phase                  | Required      | Purpose                                                     |
| -------------------------------------- | ---------------------- | ------------- | ----------------------------------------------------------- |
| `phase`                                | all                    | yes           | `pull-request`, `release-candidate`, or `ship`              |
| `smf-path`                             | all                    | one app: no   | Exact app-local `smf` directory when discovery is ambiguous |
| `github-token`                         | all                    | default token | Maintains PRs, receipts, labels, tags, and releases         |
| `app-store-connect-key-id`             | release-candidate/ship | yes           | API key ID                                                  |
| `app-store-connect-issuer-id`          | release-candidate/ship | yes           | API issuer ID                                               |
| `app-store-connect-private-key-base64` | release-candidate/ship | yes           | Base64 `.p8`                                                |
| `ios-certificate-base64`               | release-candidate      | yes           | Base64 Apple Distribution `.p12`                            |
| `ios-certificate-password`             | release-candidate      | yes           | `.p12` password                                             |
| `ios-provisioning-profiles-base64`     | release-candidate      | yes           | Base64 profile or bundle-ID JSON map                        |

The Action intentionally has no Flutter-version inputs. Configure the exact
project toolchain in the workflow. smf automatically uses
`fvm flutter build ipa --release` when the selected app or an ancestor up to
the Git root has `.fvmrc` or legacy `.fvm/fvm_config.json`, and
`flutter build ipa --release` otherwise.

```yaml
platforms:
  ios:
    build_command: fvm dart run release:build_ios
    ipa_output_path: dist/ios
```

Both fields are optional. Override `build_command` only for a custom wrapper or
build system. Override `ipa_output_path` only when that command writes the IPA
outside Flutter's standard `build/ios/ipa` directory.

smf appends the planned version, next Apple build number, generated
export-options plist, and configured flavor automatically.
`build_command` must be one command invocation; put multi-step preparation,
logging, and verification in `smf/hooks/before_build.dart`.

Custom workflows must install the selected app's toolchain before any Action
phase that can run a hook or build the app. The generated workflow does this
automatically. The Action preserves whatever toolchain `PATH` exists when each
invocation begins.

One Git repository currently supports one independently released SMF app.
`smf-path` chooses the app/configuration but does not namespace the shared
`smf/ios` branch or `ios-vX.Y.Z` tags. Use separate repositories for
independently released apps until app-scoped namespaces are supported.

## Outputs

The action emits fields relevant to the selected phase:

| Selected phase      | Outputs                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `pull-request`      | `phase` (`noop`, `release-candidate`, or `ship`), plus `platform`, `version`, `branch`, and `pull-request-number` when relevant |
| `release-candidate` | `phase=release-candidate`, `platform`, `version`, `build-id`, and `build-number`                                                |
| `ship`              | `phase=ship`, `platform`, `version`, `build-id`, and `release-url`                                                              |

The generated workflow uses `phase` and `branch` to dispatch the macOS release-candidate job without depending on token-generated pushes to start another workflow.

When `pull-request` uses the default `GITHUB_TOKEN`, GitHub does not create new workflow
runs for the resulting PR event. This Action's release-candidate still runs because the
generated workflow dispatches it from the pull-request output. If the repository's
other `pull_request` workflows must run, pass a GitHub App installation token
(preferred) or a narrowly scoped personal access token through `github-token`.

The repository or organization must also allow GitHub Actions to create pull
requests. Enable **Settings → Actions → General → Workflow permissions → Allow
GitHub Actions to create and approve pull requests**. If organization policy
locks that option off, pass an allowed GitHub App installation token or
fine-grained personal access token to `github-token`; grant Contents, Pull
requests, and Issues read/write access.

Generated checkouts use `persist-credentials: false`. The action exposes its
token only to the individual authenticated Git operation that needs it, so
Flutter builds and repository hooks cannot reuse a checkout credential.

Do not merge the release PR until the release-candidate job has committed its receipt
and the exact TestFlight build has been tested. The initializer defaults App
Store behavior to `upload`; submission for review is an explicit
configuration opt-in.

## Development

The Action is deliberately hybrid:

- Dart owns release planning, GitHub operations, signing, TestFlight, App Store
  Connect, the public CLI, and the reusable library API.
- TypeScript only reads native Action inputs/context, masks secrets, launches
  Dart, maps failures, and writes outputs.

The Action captures the consumer's incoming `PATH` before installing its pinned
Dart SDK. The core runs through the isolated Dart executable, while repository
hooks and `build_command` inherit the original project toolchain path. This
prevents the Action's Dart from replacing the Dart bundled with the project's
Flutter SDK.

The repository checks in two generated artifacts:

- `vendor/smf`: exact Dart package source, Action-owned deployment
  lockfile, and `CORE_COMMIT` provenance record;
- `dist`: bundled thin TypeScript Action adapter.

Hosted CI checks out the recorded public core commit and compares every
vendored source/package file byte-for-byte. The Action-owned
`pubspec.lock` is verified separately with `--enforce-lockfile`.

After a core change, start from a clean adjacent core checkout. Run
`vendor-core` with Dart 3.10 so it copies the source, records its commit, and
generates the Action's deployment lockfile:

```bash
pnpm run vendor-core
pnpm install --frozen-lockfile
pnpm run format
dart pub get --enforce-lockfile -C vendor/smf
pnpm run check
```

Review both generated diffs before release. Follow this repository's
[Action release procedure](RELEASING.md) and the core
[release procedure](https://github.com/Ventairy/smf/blob/main/RELEASING.md).

# ship-my-flutter-action

[![CI](https://github.com/Ventairy/ship-my-flutter-action/actions/workflows/ci.yml/badge.svg)](https://github.com/Ventairy/ship-my-flutter-action/actions/workflows/ci.yml)

The official GitHub Action for [ship-my-flutter](https://github.com/Ventairy/ship-my-flutter).

> [!WARNING]
> This action is in pre-release validation and has no `v1` tag yet. The public
> integration fixture is pinned to an exact tested commit; production `@v1`
> publication remains tracked in
> [action issue #1](https://github.com/Ventairy/ship-my-flutter-action/issues/1)
> after the live Apple acceptance gate. Examples below describe the intended
> stable interface. Non-Apple action behavior is exercised publicly in
> [`Ventairy/ship-my-flutter-dart-e2e`](https://github.com/Ventairy/ship-my-flutter-dart-e2e).

It exposes the full release lifecycle through one action:

- `plan` opens or updates the platform release PR;
- `candidate` builds, signs, uploads, and records the exact TestFlight build;
- `promote` verifies that recorded build after merge, optionally submits it
  when configured, and completes the platform GitHub Release.

The Action vendors the exact Dart core source and owns a generated deployment
lockfile for it. It installs its own pinned Dart SDK and enforces that lockfile
automatically, so consumer repositories do not install Node packages or
Fastlane. It does not install Flutter or FVM: the app repository owns the
toolchain used by its configured `build_command`.

## Use

Run the initializer from the Flutter repository:

```bash
dart pub add --dev ship_my_flutter
dart run ship_my_flutter init \
  --current-version <current-ios-version> \
  --bundle-id com.example.myapp
```

`--current-version` is the latest iOS marketing version already represented by
the repository, not the next version you want to ship. For a never-released
app, use `0.0.0` and add `Release-As-ios: 1.0.0` to the first qualifying
Conventional Commit.

The generated `.ship-my-flutter/config.yaml` includes a JSON Schema directive
for editor validation and autocomplete. The initializer also writes the
complete multi-job workflow. Its essential action steps are:

```yaml
- uses: Ventairy/ship-my-flutter-action@v1
  with:
    phase: plan

- uses: subosito/flutter-action@1a449444c387b1966244ae4d4f8c696479add0b2 # v2.23.0
  with:
    flutter-version-file: ${{ hashFiles('.fvmrc') != '' && '.fvmrc' || '' }}
    cache: true
    pub-cache: true

- uses: Ventairy/ship-my-flutter-action@v1
  with:
    phase: candidate
    app-store-connect-key-id: ${{ secrets.APP_STORE_CONNECT_KEY_ID }}
    app-store-connect-issuer-id: ${{ secrets.APP_STORE_CONNECT_ISSUER_ID }}
    app-store-connect-private-key-base64: ${{ secrets.APP_STORE_CONNECT_PRIVATE_KEY_BASE64 }}
    ios-certificate-base64: ${{ secrets.IOS_CERTIFICATE_BASE64 }}
    ios-certificate-password: ${{ secrets.IOS_CERTIFICATE_PASSWORD }}
    ios-provisioning-profiles-base64: ${{ secrets.IOS_PROVISIONING_PROFILES_BASE64 }}

- uses: Ventairy/ship-my-flutter-action@v1
  with:
    phase: promote
    app-store-connect-key-id: ${{ secrets.APP_STORE_CONNECT_KEY_ID }}
    app-store-connect-issuer-id: ${{ secrets.APP_STORE_CONNECT_ISSUER_ID }}
    app-store-connect-private-key-base64: ${{ secrets.APP_STORE_CONNECT_PRIVATE_KEY_BASE64 }}
```

> [!IMPORTANT]
> The candidate phase requires macOS and the supported Xcode/Flutter toolchain.
> Install the project's exact Flutter/FVM toolchain before the candidate Action
> step. The generated workflow pins `subosito/flutter-action` to a reviewed
> commit; projects using FVM can replace that setup with their established
> bootstrap. A root `.fvmrc` is used automatically; repositories without one
> receive current stable Flutter.
> Use an App Store Connect API key with `Developer` access only for upload-only
> delivery without TestFlight groups. Group assignment and App Review
> submission require at least `App Manager` access.
> The generated workflow uses GitHub-hosted `macos-26`; a compatible ephemeral
> self-hosted runner is also valid. Plan and promote can run on Ubuntu.

## Inputs

| Input                                  | Phase             | Required      | Purpose                                             |
| -------------------------------------- | ----------------- | ------------- | --------------------------------------------------- |
| `phase`                                | all               | yes           | `plan`, `candidate`, or `promote`                   |
| `github-token`                         | all               | default token | Maintains PRs, receipts, labels, tags, and releases |
| `app-store-connect-key-id`             | candidate/promote | yes           | API key ID                                          |
| `app-store-connect-issuer-id`          | candidate/promote | yes           | API issuer ID                                       |
| `app-store-connect-private-key-base64` | candidate/promote | yes           | Base64 `.p8`                                        |
| `ios-certificate-base64`               | candidate         | yes           | Base64 Apple Distribution `.p12`                    |
| `ios-certificate-password`             | candidate         | yes           | `.p12` password                                     |
| `ios-provisioning-profiles-base64`     | candidate         | yes           | Base64 profile or bundle-ID JSON map                |

The Action intentionally has no Flutter-version inputs. Configure the exact
project toolchain in the workflow, then configure the project-owned shell build
invocation in `.ship-my-flutter/config.yaml`:

```yaml
platforms:
  ios:
    build_command: fvm flutter build ipa --release
    artifact_path: build/ios/ipa
```

ship-my-flutter appends the planned version, next Apple build number, generated
export-options plist, and configured flavor automatically.
`build_command` must be one command invocation; put multi-step preparation,
logging, and verification in `hooks.before_candidate`.

If `hooks.before_release_pr` invokes Flutter, FVM, or a newer project Dart SDK,
run the same project setup before the plan Action step. The Action preserves
whatever toolchain `PATH` exists when each invocation begins.

## Outputs

The action emits fields relevant to the selected phase:

| Selected phase | Outputs                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `plan`         | `phase` (`noop`, `candidate`, or `promote`), plus `platform`, `version`, `branch`, and `pull-request-number` when relevant |
| `candidate`    | `phase=candidate`, `platform`, `version`, `build-id`, and `build-number`                                                   |
| `promote`      | `phase=promote`, `platform`, `version`, `build-id`, and `release-url`                                                      |

The generated workflow uses `phase` and `branch` to dispatch the macOS candidate job without depending on token-generated pushes to start another workflow.

When `plan` uses the default `GITHUB_TOKEN`, GitHub does not create new workflow
runs for the resulting PR event. This Action's candidate still runs because the
generated workflow dispatches it from the plan output. If the repository's
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

Do not merge the release PR until the candidate job has committed its receipt
and the exact TestFlight build has been tested. The initializer defaults App
Store behavior to `upload-only`; submission for review is an explicit
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

- `vendor/ship-my-flutter`: exact Dart package source, Action-owned deployment
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
dart pub get --enforce-lockfile -C vendor/ship-my-flutter
pnpm run check
```

Review both generated diffs before release. Follow this repository's
[Action release procedure](RELEASING.md) and the core
[release procedure](https://github.com/Ventairy/ship-my-flutter/blob/main/RELEASING.md).

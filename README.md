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
Fastlane.

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
| `flutter-channel`                      | candidate         | no            | Flutter channel; defaults to `stable`               |
| `flutter-version`                      | candidate         | no            | Exact Flutter version/expression                    |
| `flutter-version-file`                 | candidate         | auto-detected | Explicit `pubspec.yaml`, `.fvmrc`, or FVM config    |
| `app-store-connect-key-id`             | candidate/promote | yes           | API key ID                                          |
| `app-store-connect-issuer-id`          | candidate/promote | yes           | API issuer ID                                       |
| `app-store-connect-private-key-base64` | candidate/promote | yes           | Base64 `.p8`                                        |
| `ios-certificate-base64`               | candidate         | yes           | Base64 Apple Distribution `.p12`                    |
| `ios-certificate-password`             | candidate         | yes           | `.p12` password                                     |
| `ios-provisioning-profiles-base64`     | candidate         | yes           | Base64 profile or bundle-ID JSON map                |

Set only one of `flutter-version` and `flutter-version-file`. When neither is
set, the action looks for `.fvmrc`, `.fvm/fvm_config.json`, or
`fvm_config.json` at the Git repository root, in that order; otherwise it
installs the selected channel's current version. In a monorepo with app-local
FVM configuration, pass its repository-relative path explicitly.

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

Review both generated diffs before release. See the core [release procedure](https://github.com/Ventairy/ship-my-flutter/blob/main/RELEASING.md).

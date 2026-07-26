# ship-my-flutter-action

The official GitHub Action for [ship-my-flutter](https://github.com/Ventairy/ship-my-flutter).

It exposes the full release lifecycle through one action:

- `plan` opens or updates the platform release PR;
- `candidate` builds, signs, uploads, and records the exact TestFlight build;
- `promote` submits that recorded build after the release PR merges.

The core CLI is vendored into the bundle, so consumer repositories do not install Node packages or Fastlane.

## Use

Run the initializer from the Flutter repository:

```bash
npx ship-my-flutter init \
  --current-version 1.0.0 \
  --bundle-id com.example.myapp
```

It writes the complete multi-job workflow. The essential action steps are:

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
> The candidate phase must run on `macos-26`. Plan and promote can run on Ubuntu.

## Inputs

| Input                                  | Phase             | Required      | Purpose                                             |
| -------------------------------------- | ----------------- | ------------- | --------------------------------------------------- |
| `phase`                                | all               | yes           | `plan`, `candidate`, or `promote`                   |
| `github-token`                         | plan/promote      | default token | Maintains PRs, receipts, labels, tags, and releases |
| `flutter-channel`                      | candidate         | no            | Flutter channel; defaults to `stable`               |
| `flutter-version`                      | candidate         | no            | Exact Flutter version/expression                    |
| `flutter-version-file`                 | candidate         | auto-detected | Explicit `pubspec.yaml`, `.fvmrc`, or FVM config    |
| `app-store-connect-key-id`             | candidate/promote | yes           | API key ID                                          |
| `app-store-connect-issuer-id`          | candidate/promote | yes           | API issuer ID                                       |
| `app-store-connect-private-key-base64` | candidate/promote | yes           | Base64 `.p8`                                        |
| `ios-certificate-base64`               | candidate         | yes           | Base64 Apple Distribution `.p12`                    |
| `ios-certificate-password`             | candidate         | yes           | `.p12` password                                     |
| `ios-provisioning-profiles-base64`     | candidate         | yes           | Base64 profile or bundle-ID JSON map                |

Set only one of `flutter-version` and `flutter-version-file`. When neither is set, the action uses `.fvmrc`, `.fvm/fvm_config.json`, or `fvm_config.json` when present, in that order; otherwise it installs the selected channel’s current version.

## Outputs

The action emits the fields relevant to its phase:

`phase`, `platform`, `version`, `branch`, `pull-request-number`, `build-id`, `build-number`, and `release-url`.

The generated workflow uses `phase` and `branch` to dispatch the macOS candidate job without depending on token-generated pushes to start another workflow.

When `plan` uses the default `GITHUB_TOKEN`, GitHub creates runs for the release
PR's other `pull_request` workflows in an approval-required state. A maintainer
with write access selects **Approve workflows to run** in the PR. If those runs
must start automatically, pass a GitHub App installation token (preferred) or a
narrowly scoped personal access token through `github-token`.

## Development

The action checks in two generated artifacts:

- `vendor/ship-my-flutter`: compiled core snapshot;
- `dist`: the bundled action.

After a core change:

```bash
npm run vendor-core
npm install
npm run check
```

Review both generated diffs before release. See the core [release procedure](https://github.com/Ventairy/ship-my-flutter/blob/main/RELEASING.md).

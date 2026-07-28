# smf-action

[![CI](https://github.com/Ventairy/smf-action/actions/workflows/ci.yml/badge.svg)](https://github.com/Ventairy/smf-action/actions/workflows/ci.yml)

The official GitHub Action for [SMF](https://github.com/Ventairy/smf).

For one selected Flutter app, it runs one release PR with independent iOS and
Android candidates:

- `pull-request` plans every pending platform and maintains the app-scoped
  `smf/<app-id>/release` branch;
- `release-candidate` builds/uploads one selected platform candidate;
- `ship` verifies and delivers that same store artifact after merge.

The ship phase treats the configured remote target branch as authoritative. It
uses an isolated checkout of that branch and direct remote tag queries, so the
workflow runner's checkout or tag cache cannot change what is delivered.

> [!WARNING]
> The Action is in pre-release validation and has no `v1` tag yet. The
> interface below describes the intended stable release.

## Start with the generated workflow

Do not assemble a workflow from isolated Action snippets. Install the CLI and
run initialization from the Flutter app:

```bash
dart install smf_cli
smf init \
  --version 1.0.0 \
  --ios-bundle-id com.example.myapp \
  --android-package-name com.example.myapp
```

Then follow the definitive [SMF user guide](https://github.com/Ventairy/smf):

- [Getting started](https://github.com/Ventairy/smf/blob/main/doc/getting-started.md)
- [Apple setup](https://github.com/Ventairy/smf/blob/main/doc/apple-bootstrap.md)
- [Android and Google Play setup](https://github.com/Ventairy/smf/blob/main/doc/android-bootstrap.md)
- [Configuration](https://github.com/Ventairy/smf/blob/main/doc/configuration.md)
- [Typed hooks](https://github.com/Ventairy/smf/blob/main/doc/hooks.md)
- [Operations and recovery](https://github.com/Ventairy/smf/blob/main/doc/operations.md)
- [Security](https://github.com/Ventairy/smf/blob/main/doc/security.md)

If `smf/config.yaml` exists but the generated workflow was removed,
`smf init --github-actions` recreates only the GitHub Actions workflow.

## Platform execution

The generated workflow:

- plans on Ubuntu;
- uses a release matrix from the Action’s `releases` output;
- runs iOS candidates on macOS;
- runs Android candidates on Ubuntu;
- serializes candidate jobs so both receipts can be committed safely to the
  shared branch; and
- runs platform ship jobs after merge without rebuilding.

It also calls the bundled `resolve-project` and `setup-flutter` sub-actions so
the selected nested app and FVM/stable Flutter toolchain are consistent.

## Inputs

| Input          | Phase | Purpose                                        |
| -------------- | ----- | ---------------------------------------------- |
| `phase`        | all   | `pull-request`, `release-candidate`, or `ship` |
| `platform`     | all   | Optional `ios` or `android` filter             |
| `smf-path`     | all   | Exact nested app `smf` directory               |
| `github-token` | all   | PR, receipt, tag, and Release writes           |

Apple candidate/ship:

| Input                               | Candidate | Ship |
| ----------------------------------- | --------- | ---- |
| `app-store-connect-key-id`          | yes       | yes  |
| `app-store-connect-issuer-id`       | yes       | yes  |
| `app-store-connect-auth-key-base64` | yes       | yes  |
| `ios-certificate-base64`            | yes       | no   |
| `ios-certificate-password`          | yes       | no   |

Android candidate/ship:

| Input                              | Candidate | Ship |
| ---------------------------------- | --------- | ---- |
| `google-play-service-account-json` | yes       | yes  |
| `android-keystore-base64`          | yes       | no   |
| `android-key-alias`                | yes       | no   |
| `android-keystore-password`        | yes       | no   |
| `android-key-password`             | yes       | no   |

The generated workflow supplies these from secrets in GitHub Environment
`smf-<app-id>`. See the platform bootstrap guides before creating them.

## Outputs

| Phase               | Outputs                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `pull-request`      | `phase`, `releases` JSON matrix, optional `branch`, `pull-request-number`; `platform`/`version` only when one release is selected |
| `release-candidate` | `phase`, `platform`, `version`, `artifact-id`, `build-number`                                                                     |
| `ship`              | `phase`, `platform`, `version`, `artifact-id`, `build-number`, `release-url`                                                      |

`artifact-id` is the App Store Connect build ID for iOS and Google Play
`versionCode` for Android.

## Permissions and security

The repository/organization must allow GitHub Actions to create pull requests.
The generated jobs grant only the write scopes used by each phase.

Generated checkouts use `persist-credentials: false`. The Action masks
credentials and preserves the consumer Flutter toolchain separately from its
vendored Dart runtime.

Never run store credentials against untrusted fork code. Keep both store modes
at `upload` until candidate-only acceptance succeeds. Follow the
[before-merge checklist](https://github.com/Ventairy/smf/blob/main/doc/operations.md#before-merging).

## Development

The Action vendors the exact SMF runtime packages and records their source
commit. After committing a clean SMF workspace change:

```bash
pnpm run vendor-smf
pnpm install --frozen-lockfile
pnpm run format
dart pub get --enforce-lockfile -C vendor/smf
pnpm run check
```

Review `vendor/smf`, its lockfile/provenance, and `dist` before release. See
[RELEASING.md](RELEASING.md).

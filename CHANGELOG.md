# Changelog

All notable changes to smf-action are documented here.

## [Unreleased]

### Added

- Composite GitHub Action for planning, TestFlight candidate delivery, and exact-build promotion.
- Pinned Dart and Flutter setup dependencies, vendored Dart core/lockfile, and
  a thin native TypeScript adapter.
- Hosted byte-for-byte verification of vendored core provenance.
- Pinned pnpm development workflow with frozen installs, registry trust and
  dependency-age safeguards, and enforced coverage thresholds.
- Pull-request dependency review for newly introduced high-severity
  vulnerabilities.
- Release Please automation for semantic releases and synchronized major/minor
  Action tags.

### Fixed

- Updated the vendored core to reject compound build commands that could receive
  automatically managed release arguments on the wrong shell command.
- Reject malformed or incomplete Dart phase results instead of emitting
  plausible default Action outputs.
- Document the App Store Connect roles required by upload-only and complete
  TestFlight/App Review workflows.
- Read and validate the native repository context directly instead of bundling
  an otherwise unused GitHub API client.

### Changed

- Renamed the Action phases to `pull-request`, `release-candidate`, and `ship`.
- Auto-detect FVM builds from repository configuration and renamed the optional
  IPA location setting to `ipa_output_path`.
- Left Flutter/FVM installation to consumer workflows and preserved the
  incoming project `PATH` for hooks and builds while running the vendored core
  through an isolated pinned Dart SDK.
- Defaulted projects to automatic FVM/Flutter selection and `build/ios/ipa`, so
  build overrides are needed only for custom wrappers or IPA locations.

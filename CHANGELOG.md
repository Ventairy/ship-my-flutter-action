# Changelog

All notable changes to ship-my-flutter-action are documented here.

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

- Reject malformed or incomplete Dart phase results instead of emitting
  plausible default Action outputs.
- Document the App Store Connect roles required by upload-only and complete
  TestFlight/App Review workflows.
- Read and validate the native repository context directly instead of bundling
  an otherwise unused GitHub API client.

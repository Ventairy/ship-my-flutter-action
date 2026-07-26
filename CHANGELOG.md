# Changelog

All notable changes to ship-my-flutter-action are documented here.

## [Unreleased]

### Added

- Composite GitHub Action for planning, TestFlight candidate delivery, and exact-build promotion.
- Pinned Dart and Flutter setup dependencies, vendored Dart core/lockfile, and
  a thin native TypeScript adapter.
- Hosted byte-for-byte verification of vendored core provenance.

### Fixed

- Reject malformed or incomplete Dart phase results instead of emitting
  plausible default Action outputs.
- Document the App Store Connect roles required by upload-only and complete
  TestFlight/App Review workflows.

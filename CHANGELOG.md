# Changelog

All notable changes to smf-action are documented here.

## [1.2.1](https://github.com/Ventairy/smf-action/compare/v1.2.0...v1.2.1) (2026-08-07)


### Bug Fixes

* **deps:** pin patched brace-expansion ([#19](https://github.com/Ventairy/smf-action/issues/19)) ([6eab86b](https://github.com/Ventairy/smf-action/commit/6eab86be3c0cfad0ee70f640ed91572f3d255cef))
* **runtime:** use smf_cli 1.1.0 ([#20](https://github.com/Ventairy/smf-action/issues/20)) ([2cfea8e](https://github.com/Ventairy/smf-action/commit/2cfea8e708b794324b1c2049c197a236606833d9))

## [1.2.0](https://github.com/Ventairy/smf-action/compare/v1.1.0...v1.2.0) (2026-07-29)


### Features

* install released SMF CLI ([34952a1](https://github.com/Ventairy/smf-action/commit/34952a1a9af7b01e6f22334d46a5ce8107f1f3e3))


### Bug Fixes

* publish Action tags atomically ([#15](https://github.com/Ventairy/smf-action/issues/15)) ([25b8023](https://github.com/Ventairy/smf-action/commit/25b8023d0a03be2558d7c313d3b9127adbbce274))

## [1.1.0](https://github.com/Ventairy/smf-action/compare/v1.0.0...v1.1.0) (2026-07-29)


### Features

* publish SMF through GitHub Marketplace ([#11](https://github.com/Ventairy/smf-action/issues/11)) ([896063a](https://github.com/Ventairy/smf-action/commit/896063aee437aa52f2ea4c0006a89c366298193c))


### Bug Fixes

* allow generated changelog formatting ([#13](https://github.com/Ventairy/smf-action/issues/13)) ([2447b2c](https://github.com/Ventairy/smf-action/commit/2447b2cad0034112964e31f6b7a411da4915bbdc))

## [1.0.0](https://github.com/Ventairy/smf-action/compare/v0.1.0...v1.0.0) (2026-07-29)

### ⚠ BREAKING CHANGES

- harden the v1 Action runtime ([#6](https://github.com/Ventairy/smf-action/issues/6))
- invoke the public release command
- use the public phased SMF CLI
- align action with app-scoped SMF runtime
- support Android and shared release matrices
- vendor modular SMF workspace
- rename action to SMF
- support global Flutter flavor
- support schema v3 app and hooks
- add explicit App Store delivery modes
- simplify App Store delivery modes
- remove flutter-channel, flutter-version, and flutter-version-file Action inputs; workflows must install their project Flutter or FVM toolchain before candidate or Flutter-dependent plan steps.
- delegate action workflow to Dart

### Features

- add explicit App Store delivery modes ([efa2749](https://github.com/Ventairy/smf-action/commit/efa27490583fff3bfa68b7b72f6b5d2182bdafdb))
- align action with app-scoped SMF runtime ([361875e](https://github.com/Ventairy/smf-action/commit/361875eb6a5a200f2617c28de1258a509dd34e2a))
- align action with SMF CLI ([#5](https://github.com/Ventairy/smf-action/issues/5)) ([b76b229](https://github.com/Ventairy/smf-action/commit/b76b229d1667467ef7808d5b0d41dfd5e91acc9f))
- auto-detect FVM builds ([9ad99cd](https://github.com/Ventairy/smf-action/commit/9ad99cddc01596cfa144dfdf1bb7f709e5c61167))
- bundle YAML configuration support ([74a1de3](https://github.com/Ventairy/smf-action/commit/74a1de371e027b030f27a005326cae1a893fa9a0))
- default standard Flutter IPA builds ([28fb0cf](https://github.com/Ventairy/smf-action/commit/28fb0cf9f8230a8122abd06d72fc7db85172b19b))
- delegate action workflow to Dart ([7f741be](https://github.com/Ventairy/smf-action/commit/7f741be84436e1f1e4edccc86fa8382d5fda1685))
- generate release state only when needed ([5ab2eac](https://github.com/Ventairy/smf-action/commit/5ab2eac9d16a08d8d1d76b30a8b1cf50ee0dc630))
- harden the v1 Action runtime ([#6](https://github.com/Ventairy/smf-action/issues/6)) ([6f5cb54](https://github.com/Ventairy/smf-action/commit/6f5cb54f21e5ef777e172d9fd4dc29569b934205))
- make Flutter setup consumer-owned ([a4d46a5](https://github.com/Ventairy/smf-action/commit/a4d46a556363b332a3a9699a2f0a03a30160d927))
- rename action to SMF ([8971b68](https://github.com/Ventairy/smf-action/commit/8971b68a66ae0ecc05d3d0f059a4b3b5c9126379))
- simplify App Store delivery modes ([06c2b4a](https://github.com/Ventairy/smf-action/commit/06c2b4aec2a656fb62097062138daae6d27d68fd))
- support Android and shared release matrices ([7ded9bf](https://github.com/Ventairy/smf-action/commit/7ded9bfd86453698e10a1b900564c072a53b765f))
- support global Flutter flavor ([2d55e0e](https://github.com/Ventairy/smf-action/commit/2d55e0ee789251388bd457b75ca52c73a5cc2ab2))
- support schema v3 app and hooks ([619cc3b](https://github.com/Ventairy/smf-action/commit/619cc3b29d301f519df7ed5cd8577dc0fb7a0735))
- use the public phased SMF CLI ([b5c8242](https://github.com/Ventairy/smf-action/commit/b5c82425235d7dd5440cc7411fae7981b34853dc))

### Bug Fixes

- bundle hardened release authentication ([7e238cd](https://github.com/Ventairy/smf-action/commit/7e238cde4243d5e1123c75fc55133f18bb7935b3))
- constrain vendored test tooling ([42ed0a2](https://github.com/Ventairy/smf-action/commit/42ed0a2da6b2b80bc208ec6da76de62cfdf3355a))
- document and record core provenance ([9c2a683](https://github.com/Ventairy/smf-action/commit/9c2a683865e6a9066e105b748701dc2d6233be99))
- harden Apple release adapter ([decd79e](https://github.com/Ventairy/smf-action/commit/decd79e2feef1488b67eb7d145d5999baf966a31))
- keep managed build arguments on one command ([0d4f296](https://github.com/Ventairy/smf-action/commit/0d4f2962624cbe24f8f630cabcbec1f3b7fddbf0))
- own the action runtime lockfile ([ccc7cd1](https://github.com/Ventairy/smf-action/commit/ccc7cd1ae2d938c09d230e3f046ead598ff97f11))
- preserve Node 20 pnpm compatibility ([ac0facd](https://github.com/Ventairy/smf-action/commit/ac0facdd4a550409b834ae6a55e5db67e8381263))
- rely on release pull request checks ([#10](https://github.com/Ventairy/smf-action/issues/10)) ([e9c879a](https://github.com/Ventairy/smf-action/commit/e9c879ac9507d1195e32b9502d26c73e3f6fa722))
- scope generated workflows to selected app ([988c687](https://github.com/Ventairy/smf-action/commit/988c687004c9ef9304d4b4fcb45c7d3c8446a24c))
- support Dart 3.10 in action runtime ([c285341](https://github.com/Ventairy/smf-action/commit/c285341d48f554411d18c0245e2721ce4710683e))
- support hosted release branch updates ([2cb8fa7](https://github.com/Ventairy/smf-action/commit/2cb8fa7d391407ede0aff772053ef12a598467d3))
- target repository for release validation ([#9](https://github.com/Ventairy/smf-action/issues/9)) ([652a0a5](https://github.com/Ventairy/smf-action/commit/652a0a534fb92d6f23f03793af9f0bd0fc26b8e4))
- use pre-release config schema version 1 ([73bbc81](https://github.com/Ventairy/smf-action/commit/73bbc81cec8b177e6c120e799e7ede656566b3a1))
- vendor strict build command validation ([5a1451d](https://github.com/Ventairy/smf-action/commit/5a1451d33709c81646e72230193aa6b956531093))

### Code Refactoring

- invoke the public release command ([6252a1c](https://github.com/Ventairy/smf-action/commit/6252a1c335c2529555f89fd6bf6574c723dd6a1f))
- vendor modular SMF workspace ([b5a613f](https://github.com/Ventairy/smf-action/commit/b5a613feda6e78c58d1b5c8a01da0c8ca6a4d0bf))

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

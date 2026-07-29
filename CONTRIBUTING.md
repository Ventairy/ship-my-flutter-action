# Contributing

Install Node.js, pnpm 10, and Dart 3.10 or newer, then run:

```bash
pnpm install --frozen-lockfile
dart install smf_cli "$(cat SMF_CLI_VERSION)"
pnpm run check
```

Use Conventional Commits and keep source, tests, `SMF_CLI_VERSION`, and the
checked-in `dist` bundle synchronized. CI installs that exact published CLI
version and exercises it through the native Action adapter.

The hourly `Sync SMF` workflow performs this refresh from the newest published
stable `smf_cli` GitHub Release and opens or updates `automation/sync-smf`. It
never merges or publishes the result. Review the exact CLI version and the
Action-facing release type before merging its pull request. Its default
`fix(runtime)` title intentionally requests a patch; change the pull request
title when the Action contract requires a minor or major release.

Never use production certificates, profiles, API keys, or app records in tests. Pull requests that change action inputs or outputs must update `action.yml`, tests, and the README together.

Release behavior belongs in the Dart packages. Keep TypeScript limited to GitHub
Actions integration and add a process-level adapter test for protocol changes.

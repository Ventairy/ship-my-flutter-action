# Contributing

Install Node.js, pnpm 10, and Dart 3.10 or newer, then run:

```bash
pnpm install --frozen-lockfile
dart pub get --enforce-lockfile -C vendor/smf
pnpm run check
```

Use Conventional Commits and keep source, tests, the vendored SMF workspace,
its Action-owned deployment lockfile and `SMF_COMMIT` provenance record, and the
checked-in `dist` bundle synchronized.
CI resolves `SMF_COMMIT` from the public SMF repository and compares the
vendored source byte-for-byte.

To refresh SMF from the clean sibling checkout, run `vendor-smf` with Dart
3.10. It copies the runtime workspace and generates the Action's committed
lockfile:

```bash
pnpm run vendor-smf
pnpm install --frozen-lockfile
dart pub get --enforce-lockfile -C vendor/smf
pnpm run check
```

Never use production certificates, profiles, API keys, or app records in tests. Pull requests that change action inputs or outputs must update `action.yml`, tests, and the README together.

Release behavior belongs in the Dart packages. Keep TypeScript limited to GitHub
Actions integration and add a process-level adapter test for protocol changes.

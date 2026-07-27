# Contributing

Install Node.js, pnpm 10, and Dart 3.10 or newer, then run:

```bash
pnpm install --frozen-lockfile
dart pub get --enforce-lockfile -C vendor/smf
pnpm run check
```

Use Conventional Commits and keep source, tests, the vendored core, its
Action-owned deployment lockfile and `CORE_COMMIT` provenance record, and the
checked-in `dist` bundle synchronized.
CI resolves `CORE_COMMIT` from the public core repository and compares the
vendored source byte-for-byte.

To refresh the core from the clean sibling checkout, run `vendor-core` with
Dart 3.10. It copies the core and generates the Action's committed lockfile:

```bash
pnpm run vendor-core
pnpm install --frozen-lockfile
dart pub get --enforce-lockfile -C vendor/smf
pnpm run check
```

Never use production certificates, profiles, API keys, or app records in tests. Pull requests that change action inputs or outputs must update `action.yml`, tests, and the README together.

Release behavior belongs in the Dart core. Keep TypeScript limited to GitHub
Actions integration and add a process-level adapter test for protocol changes.

# Contributing

Install Node.js, npm, and Dart 3.10 or newer, then run:

```bash
npm ci
dart pub get --enforce-lockfile -C vendor/ship-my-flutter
npm run check
```

Use Conventional Commits and keep source, tests, the vendored core, and the checked-in `dist` bundle synchronized.

To refresh the core from the sibling checkout:

```bash
npm run vendor-core
npm install
dart pub get --enforce-lockfile -C vendor/ship-my-flutter
npm run check
```

Never use production certificates, profiles, API keys, or app records in tests. Pull requests that change action inputs or outputs must update `action.yml`, tests, and the README together.

Release behavior belongs in the Dart core. Keep TypeScript limited to GitHub
Actions integration and add a process-level adapter test for protocol changes.

# Contributing

Install Node.js and npm, then run:

```bash
npm ci
npm run check
```

Use Conventional Commits and keep source, tests, the vendored core, and the checked-in `dist` bundle synchronized.

To refresh the core from the sibling checkout:

```bash
npm run vendor-core
npm install
npm run check
```

Never use production certificates, profiles, API keys, or app records in tests. Pull requests that change action inputs or outputs must update `action.yml`, tests, and the README together.

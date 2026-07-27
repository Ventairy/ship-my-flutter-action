# Releasing smf-action

Release Please owns `package.json` versions, `CHANGELOG.md`, immutable semantic
version tags, and GitHub Releases. The Action is not published to npm; users
consume the committed `action.yml`, `dist`, and vendored SMF Dart workspace from a Git
ref.

## Release credential

The Ventairy organization prevents the default `GITHUB_TOKEN` from opening pull
requests. Add a repository secret named `RELEASE_PLEASE_TOKEN` before enabling
releases. Until it exists, the Release Please workflow succeeds as a deliberate
no-op and emits a warning.

Prefer a GitHub App installation token for long-lived automation. A
fine-grained personal access token is also supported when it is limited to this
repository and grants:

- Actions: read and write, to dispatch CI for the generated release PR;
- Contents: read and write, to update versions, tags, and GitHub Releases;
- Issues: read and write, for Release Please's release metadata;
- Pull requests: read and write, to open and update the release PR.

Never reuse a broad developer CLI token. Treat token creation, rotation, and
revocation as repository administration.

## Release flow

1. Use Conventional Commits on `main`.
2. CI validates Node 20, 22, and 24, the Dart adapter, the bundled `dist`,
   dependency audits, and vendored-workspace provenance.
3. After CI succeeds, Release Please opens or updates its release PR and
   dispatches the same CI workflow on that PR branch.
4. Review the proposed version, changelog, `package.json`, and manifest.
5. Merge the release PR only after every required release gate passes.
6. Release Please creates `vX.Y.Z` and its GitHub Release, then moves the `vX`
   and `vX.Y` compatibility tags to the same tested commit.

The first stable release must remain unmerged until the live Apple acceptance
test succeeds. When that gate is complete, include this footer in a
Conventional Commit if the open release PR does not already target `1.0.0`:

```text
Release-As: 1.0.0
```

Before merging the first stable release PR:

- confirm the Action CI and public non-Apple fixture are green;
- exercise signing, upload, receipt recording, and exact-build promotion with
  real Apple credentials;
- remove the README pre-release warning;
- verify `dist` and `vendor/smf` match their reviewed sources;
- confirm the generated tag is `v1.0.0`.

Do not manually edit `.release-please-manifest.json`, release versions, or
generated release tags. A GitHub Marketplace publication is a separate manual
choice on the semantic GitHub Release.

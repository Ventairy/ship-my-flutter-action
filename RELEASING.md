# Releasing smf-action

Release Please owns `package.json` versions, `CHANGELOG.md`, immutable semantic
version tags, and GitHub Releases. The Action is not published to npm; users
consume the committed `action.yml`, `dist`, and vendored SMF Dart workspace from a Git
ref.

## Release credential

The Ventairy organization prevents the default `GITHUB_TOKEN` from opening pull
requests. Add a repository secret named `RELEASE_PLEASE_TOKEN` before enabling
releases. If it is missing or invalid, Release Please fails so the broken release
configuration remains visible.

Use a fine-grained personal access token limited to this repository and grant:

- Actions: read and write, to dispatch CI for the generated release PR;
- Contents: read and write, to update versions, tags, and GitHub Releases;
- Issues: read and write, for Release Please's release metadata;
- Pull requests: read and write, to open and update the release PR.

Never reuse a broad developer CLI token. Set an explicit expiration and treat
token creation, rotation, and revocation as repository administration.

A GitHub App is also suitable, but do not store an installation token in
`RELEASE_PLEASE_TOKEN`: installation tokens expire after one hour. Supporting a
GitHub App requires storing its App credentials and changing the workflow to
[mint a fresh installation token for each
run](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/making-authenticated-api-requests-with-a-github-app-in-a-github-actions-workflow).

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

The first stable release must remain unmerged until the live Apple and Google
Play acceptance tests succeed. When those gates are complete, include this footer in a
Conventional Commit if the open release PR does not already target `1.0.0`:

```text
Release-As: 1.0.0
```

Before merging the first stable release PR:

- confirm the Action CI and public fixture are green;
- exercise signing, upload, receipt recording, and exact-build promotion with
  real Apple credentials;
- exercise upload-key signing, internal-testing upload, receipt recording, and
  same-`versionCode` production promotion with real Google Play credentials;
- remove the README pre-release warning;
- verify `dist` and `vendor/smf` match their reviewed sources;
- confirm the generated tag is `v1.0.0`.

Do not manually edit `.release-please-manifest.json`, release versions, or
generated release tags. A GitHub Marketplace publication is a separate manual
choice on the semantic GitHub Release.

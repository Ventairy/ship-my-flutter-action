# Releasing smf-action

Release Please owns the version in `package.json`, `CHANGELOG.md`, and draft
GitHub Releases. Publishing the draft creates the immutable `vX.Y.Z` tag, and
the Publish Action workflow moves the compatible `vX` and `vX.Y` tags only
after it verifies the published release. The Action is not published to npm.
Consumers run the committed `action.yml`, `dist`, and vendored SMF workspace
from a Git ref.

## One-time repository setup

Add a repository secret named `RELEASE_PLEASE_TOKEN`. Use a fine-grained token
limited to this repository with:

- Actions: read and write;
- Contents: read and write;
- Issues: read and write;
- Pull requests: read and write.

The token lets Release Please-created pull requests and releases trigger the
repository's normal workflows. Set an expiration and rotate it as repository
administration. Do not use a broad developer CLI token.

Before the first Marketplace release:

1. Accept the GitHub Marketplace Developer Agreement for the repository owner.
2. Enable two-factor authentication for the publishing account.
3. Use `Publishing` as the primary Marketplace category and `Mobile CI` as the
   secondary category.

GitHub does not expose a supported public API for the Marketplace publication
flag or categories. Do not automate its private web endpoints.

## Release flow

1. Merge Conventional Commits to `main`.
2. Wait for CI to validate the Action on Node 20, 22, and 24, analyze the
   vendored Dart runtime, run tests and audits, rebuild `dist`, and verify SMF
   provenance.
3. Review the Release Please pull request. Confirm the proposed version,
   changelog, `package.json`, and `.release-please-manifest.json`.
4. Merge the release pull request after all required checks pass.
5. Wait for Release Please to create the draft GitHub Release.
6. Edit the draft, select **Publish this Action to the GitHub
   Marketplace**, confirm the categories, and publish it.
7. Wait for Publish Action to verify the release contents and move `vX` and
   `vX.Y` to the immutable `vX.Y.Z` commit.
8. Verify the release is visible on the
   [SMF Marketplace listing](https://github.com/marketplace/actions/smf-flutter-release) and
   that its installation snippet uses the new major tag.

The draft is intentional: publishing it is the single operation that makes the
GitHub Release, immutable semantic tag, and that Marketplace version public.
Compatible Action tags do not move until the published release passes its
contract checks.

## Version policy

- `fix:` produces a patch release.
- `feat:` produces a minor release.
- `feat!:` or a `BREAKING CHANGE:` footer produces a major release.
- `Release-As: X.Y.Z` is reserved for an intentional one-off version override.

Never edit `.release-please-manifest.json`, release versions, or generated tags
by hand.

## Verification

For a release `vX.Y.Z`, verify the immutable and moving tags:

```bash
release_sha="$(git rev-list -n 1 vX.Y.Z)"
test "$(git rev-list -n 1 vX)" = "$release_sha"
test "$(git rev-list -n 1 vX.Y)" = "$release_sha"
git show "vX.Y.Z:action.yml" >/dev/null
git show "vX.Y.Z:dist/index.js" >/dev/null
git show "vX.Y.Z:vendor/smf/SMF_COMMIT" >/dev/null
```

Also confirm the GitHub Release is not a draft or prerelease and that CI passed
for the release commit.

## Recovery

Do not move or recreate an immutable `vX.Y.Z` tag. If a release is defective:

1. document the impact in the GitHub Release;
2. revert or fix the defect through a normal pull request;
3. publish a new semantic release;
4. let automation move only the compatible `vX` and `vX.Y` tags.

If Marketplace publication was missed, edit that semantic GitHub Release,
select the Marketplace checkbox and categories, then update the release.

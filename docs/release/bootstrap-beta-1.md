# Bootstrap Publish Runbook for `5.0.0-beta.1`

This is a one-time, interactive runbook. Issue #33 prepares and verifies the
Release Candidate but must not publish it. A later authorized ticket executes
this runbook against the exact `.tgz` downloaded from the successful protected
Release Candidate run.

## Preconditions

- The candidate manifest records `5.0.0-beta.1`, the protected source commit,
  successful credential-free and Test Mode gates, SHA-256, SHA-512 integrity,
  Changesets plan, and workflow run identity.
- The downloaded exact `.tgz`, `candidate.json`, `artifact.json`, and
  `publish-plan.json` pass `candidate:verify` without rebuilding or repacking.
- The designated maintainer has confirmed npm scope ownership, account 2FA,
  offline recovery materials, and public scoped-package permission.
- No package registry version named `@terminalzero/lemonsqueezy@5.0.0-beta.1`
  exists.
- The repository-only `v5-release-workflow` deploy key has write access, its
  private key exists only as `RELEASE_TAG_DEPLOY_KEY` in the protected
  `npm-release` environment, and the tag creation ruleset grants deploy keys
  the workflow-only bypass. Governance pins its public SHA-256 fingerprint and
  rejects any additional writable deploy key.

## Interactive publication

1. Work in a new empty directory containing only the downloaded candidate
   bundle. Recompute SHA-256 and compare it with `candidate.json`.
2. Authenticate interactively without placing a credential or one-time code in
   a command, repository, Actions secret, artifact, log, or shell history.
3. Publish the exact tarball path once with `pnpm publish <exact.tgz> --access
public --tag beta`. Do not check out source, build, pack, patch, or compress.
4. Read back the exact version metadata, SHA-512 registry integrity, tarball
   bytes, and all dist-tags. If the new package automatically gained `latest`,
   remove the `latest` tag before any announcement; `beta` must resolve to the
   verified version.
5. Configure npm Trusted Publisher for repository
   `terminalzero-dev/lemonsqueezy.js`, workflow filename
   `registry-release.yml`, and environment `npm-release`.
6. Require 2FA and disallow token publishing for the package, then revoke the
   local bootstrap session or credential.
7. Dispatch `registry-release.yml` against the same Candidate. Its read-only
   `verify` job must pass registry metadata, integrity, exact tarball, and
   ESM/CJS installation checks before the protected `tag` job can use the
   repository-only deploy key to create `v5.0.0-beta.1` at the exact Candidate
   commit. The separate `finalize` job reads the protected tag back and creates
   an immutable prerelease with the tarball and evidence as assets without
   receiving the deploy key.

## Closeout recovery

The `registry-release.yml` workflow is restricted to `5.0.0-beta.1` and is
safe to rerun after publication without publishing the npm version again:

- With no tag or Release, it creates the protected tag at the recorded Candidate
  commit, reads it back, creates a draft with `--verify-tag`, uploads only the
  verified Candidate and registry evidence, then publishes the prerelease.
- With an existing draft, it verifies the target commit and uploads any missing
  assets from the newly verified closeout bundle before resuming publish.
- With an already published Release, it verifies the immutable flag, tag
  commit, prerelease state, and complete asset names without changing them.
- A tag without a Release is retained and used as-is only when it resolves to
  the recorded Candidate commit. A different target fails closed.

Never rerun the interactive npm publish after the registry version exists.
Resume only the protected registry verification and GitHub closeout.

Publication success followed by verification failure is not retried with the
same version. Preserve evidence, normalize affected dist-tags, and publish a new
fix version through the approved recovery path.

Rotate the release identity only outside a release run: generate the replacement,
merge its public fingerprint through the normal PR gate, replace the repository
deploy key and `npm-release` environment secret, revoke the old key, then rerun
governance verification. If the private key may be exposed, remove the deploy key
immediately and pause releases until the full rotation is verified.

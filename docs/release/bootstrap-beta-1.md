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
   `terminalzero-dev/lemonsqueezy.js`, the exact future registry-release
   workflow filename, and environment `npm-release`.
6. Require 2FA and disallow token publishing for the package, then revoke the
   local bootstrap session or credential.
7. Run protected registry verification against the same Candidate. Only after
   registry integrity passes may the controlled workflow create
   `v5.0.0-beta.1` and an immutable prerelease with the tarball and evidence as
   assets.

Publication success followed by verification failure is not retried with the
same version. Preserve evidence, normalize affected dist-tags, and publish a new
fix version through the approved recovery path.

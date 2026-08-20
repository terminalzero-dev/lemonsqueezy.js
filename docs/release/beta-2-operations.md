# beta.2 OIDC Release and Rollback Operations

This runbook covers the first normal Trusted Publishing release after the
beta.1 Bootstrap publish. The Release Candidate is immutable: version, source
commit, exact tarball, digests, and gate record move through the workflow as
one unit.

## Preconditions

- The version commit is merged through a pull request to the protected
  `release/v5-beta` branch.
- The successful Release Candidate run was dispatched from that exact commit.
- `5.0.0-beta.2` does not exist in npm, unless this is an explicit recovery of
  a publish-succeeded/finalization-failed run.
- npm Trusted Publishing matches this repository,
  `.github/workflows/registry-release.yml`, and the protected `npm-release`
  environment. The publish and dist-tag steps use only short-lived OIDC
  identities on GitHub-hosted runners.
- `5.0.0-beta.1` is the Last Known Good version and both
  `latest` and `beta` initially resolve to it.

Dispatch `registry-release.yml` from the exact version commit with the
Candidate run ID, version, commit, SHA-256, and Last Known Good version. Leave
`resume_published=false` for the first attempt.

The workflow performs these mutations in order:

1. rechecks Candidate bytes and registry absence;
2. performs a no-op `latest` write to prove OIDC dist-tag recovery authority
   while both tags still point to beta.1;
3. publishes the exact `.tgz` with pnpm under explicit `beta` using OIDC
   Trusted Publishing and provenance;
4. moves `latest` to the same verified `5.0.0-beta.2` Candidate;
5. verifies registry integrity, redownloaded bytes, npm signature and
   provenance, ESM/CJS consumption, minimum API behavior, and both tags;
6. moves both `latest` and `beta` to `5.0.0-beta.1`, verifies that state, then
   restores both tags to `5.0.0-beta.2` and verifies the restored state;
7. creates the protected tag and immutable non-latest GitHub prerelease only
   after every registry and rollback check passes.

## Failure recovery

If publication has not succeeded, fix the release path and create a new
Candidate when code or artifact bytes change.

If publish succeeded but finalization failed, inspect npm first. When the
published version, integrity, and redownloaded bytes match the recorded
Candidate, rerun the same workflow with `resume_published=true`. That mode
requires an exact registry-byte match and skips the publish command. Never
republish the same version. If bytes or identity do not match, stop, preserve
evidence, return both tags to the Last Known Good, deprecate when appropriate,
and release a new fix version.

The dist-tag drill is fail-closed. Once mutation begins, an error triggers a
best-effort restore of both tags to `5.0.0-beta.2`; the job still fails so the
maintainer must verify registry state before any Git tag or GitHub Release is
created.

## Tabletop decisions

### Publish succeeded, finalization failed

Do not rebuild or republish. Verify the immutable registry bytes against the
Candidate, repair only the failed closeout step, then use
`resume_published=true`. If a repair changes source or artifact bytes, publish
a new version instead.

### Deprecation

Deprecation is a warning for an already immutable version, not a replacement
for tag rollback. Use it for a severe defect or materially misleading package,
include the exact safe version, and publish the fix under a new version. Do not
deprecate old betas merely because a newer beta exists.

### Unpublish policy

Routine defects, failed finalization, and release mistakes do not justify
unpublish. Preserve the version for auditability, move recommended dist-tags
to the Last Known Good, deprecate if necessary, and publish a new fix version.
Escalate only a policy-eligible security or legal emergency.

### First Stable without a Last Known Good

Block Stable publication. A first Stable release without a verified rollback
target cannot satisfy recoverability. Complete beta.2 registry verification,
consumer smoke, provenance, and the real dist-tag drill first; beta.2 then
becomes the Last Known Good input to the Stable Readiness issue.

## Stable Readiness evidence

Retain and link these secret-free records in the public Stable Readiness issue:

- Candidate run and `candidate.json` for version, commit, gates, and artifact
  identity;
- Registry Release run showing GitHub-hosted OIDC permissions and exact pnpm
  upload;
- `registry-evidence.json` for registry integrity, redownloaded bytes,
  provenance subject, repository, workflow, commit, and final tags;
- `provenance-audit.json` for npm's cryptographic signature and attestation
  verification;
- `dist-tag-auth-probe-evidence.json`, `dist-tag-promotion-evidence.json`, and
  `dist-tag-rollback-evidence.json` for the complete movement timeline;
- immutable GitHub prerelease assets and tag-to-commit verification;
- secret-free maintainer confirmation that account recovery materials and
  release ownership remain available. Never record recovery material itself.

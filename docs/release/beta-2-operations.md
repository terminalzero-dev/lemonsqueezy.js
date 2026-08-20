# beta.2 OIDC Publish and Interactive Dist-tag Operations

This runbook covers the first normal Trusted Publishing release after the
beta.1 Bootstrap publish. The Release Candidate is immutable: version, source
commit, exact tarball, digests, and gate record move through the release as one
unit.

## Preconditions

- The version commit is merged through a pull request to the protected
  `release/v5-beta` branch.
- The successful Release Candidate run was dispatched from that exact commit.
- `5.0.0-beta.2` does not exist in npm, unless this is an explicit recovery of
  a publish-succeeded/finalization-failed run.
- npm Trusted Publishing matches this repository,
  `.github/workflows/registry-release.yml`, and the protected `npm-release`
  environment. OIDC is used only for immutable publication on a GitHub-hosted
  runner; npm does not support Trusted Publishing for dist-tag mutation.
- `5.0.0-beta.1` is the Last Known Good version and both `latest` and `beta`
  initially resolve to it.

Dispatch `registry-release.yml` from the exact version commit with the
Candidate run ID, version, commit, SHA-256, and Last Known Good version. Leave
`resume_published=false` and `dist_tag_evidence_comment_id` empty.

The first workflow run:

1. rechecks Candidate bytes and registry absence;
2. publishes the exact `.tgz` under explicit `beta` using pnpm, OIDC Trusted
   Publishing, and provenance;
3. verifies registry integrity, redownloaded bytes, npm signature and
   provenance, ESM/CJS consumption, minimum API behavior, `beta` at
   `5.0.0-beta.2`, and `latest` still at `5.0.0-beta.1`;
4. stops successfully before Git tag and GitHub Release finalization.

Then run `scripts/release-dist-tags-wizard.sh`. It verifies the exact Candidate,
requires the successful phase-one Registry Release run and its exact verified
artifact, opens a fresh `npm login --auth-type=web` session against the pinned
public npm registry with an isolated temporary userconfig, and requires
secret-free account recovery confirmation. It then performs the public drill:
promote `latest` to beta.2, roll both tags back to beta.1, and restore both tags
to beta.2. It logs out, posts `dist-tag-interactive-evidence.json` to Issue #35,
and dispatches the same workflow with `resume_published=true` and the Issue
comment ID.

The resumed workflow never republishes. It revalidates exact registry bytes,
provenance, the evidence comment author and contents, and live final tags. A
recovery may run from a newer protected `release/v5-beta` head after release
tooling repairs, but the workflow requires the exact Candidate commit to be its
ancestor and checks out that Candidate before any artifact verification. Only
then does it create the protected tag and immutable non-latest prerelease.

## Failure recovery

If publication has not succeeded, fix the release path and create a new
Candidate when code or artifact bytes change.

If publish succeeded but finalization failed, inspect npm first. When the
published version, integrity, and redownloaded bytes match the recorded
Candidate, complete the interactive drill and resume with
`resume_published=true` plus `dist_tag_evidence_comment_id`. That mode
requires an exact registry-byte match and skips the publish command. Never
republish the same version. If bytes or identity do not match, stop, preserve
evidence, return both tags to the Last Known Good, deprecate when appropriate,
and release a new fix version.

The dist-tag drill is fail-closed. Once mutation begins, an error triggers a
best-effort interactive restore of both tags to `5.0.0-beta.2`; the wizard
still exits unsuccessfully so the maintainer must verify registry state before
posting evidence or creating any Git tag or GitHub Release. The wizard never
captures npm credentials, OTPs, Passkeys, or account recovery material.
Completed and failed drill evidence remains under
`.artifacts/manual-dist-tag/` until the maintainer deliberately removes it.

## Tabletop decisions

### Publish succeeded, finalization failed

Do not rebuild or republish. Verify the immutable registry bytes against the
Candidate, repair only the failed closeout step, then use the evidence-backed
`resume_published=true` path. If a repair changes source or artifact bytes,
publish a new version instead.

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
- `dist-tag-interactive-evidence.json` for the authenticated promote,
  rollback, restore, account recovery confirmation, and complete timeline;
- immutable GitHub prerelease assets and tag-to-commit verification.

The evidence contains only a boolean account recovery confirmation. Never
record account recovery material itself.

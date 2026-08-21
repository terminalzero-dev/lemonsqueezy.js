# Recurring v5 Beta Publication

This runbook applies after the beta.2 release proved the normal OIDC publish,
interactive dist-tag authority, exact-byte recovery, protected tag, and
immutable prerelease path.

## Preconditions

- The version commit is merged through a pull request to the protected
  `release/v5-beta` branch and its push check succeeds.
- The exact version does not exist in npm.
- Both public npm `latest` and `beta` identify the verified Last Known Good
  version.
- The release has a dedicated public Issue under the v5 delivery Spec.
- The Candidate-specific release notes exist at
  `docs/release/<prerelease-name>-release-notes.md`, where dots in the
  prerelease name become hyphens.

## Candidate and phase-one publication

Dispatch `release-candidate.yml` from `release/v5-beta` with the exact version
and protected-branch commit. Preserve the completed Candidate run ID and the
SHA-256 from `candidate.json`.

Dispatch `registry-release.yml` from `release/v5-beta` with:

- the Candidate run ID, exact version, commit, and SHA-256;
- the Last Known Good version;
- the dedicated evidence Issue number;
- `resume_published=false` and an empty evidence comment ID.

The first Registry Release run publishes the exact Candidate through OIDC,
verifies registry bytes, signature, provenance, installed ESM/CJS consumers,
and the expected split tag state, then stops before manual evidence,
protected-tag creation, or GitHub Release finalization.

## Interactive rollback evidence and finalization

Run `scripts/release-dist-tags-wizard.sh` from the Candidate-capable release
branch. Supply the completed Candidate run, successful phase-one Registry
Release run, and evidence Issue number. The wizard derives the current version
and Last Known Good version from verified artifacts, uses an isolated npm web
session only for dist-tag mutations, confirms account recovery availability
without recording recovery material, and records the promote, rollback, and
restore timeline.

After logout and public tag convergence, the wizard posts secret-free evidence
to the selected Issue and dispatches the same Registry Release workflow with
`resume_published=true`. The resumed run must match the immutable registry
bytes, verify the exact Issue comment and restored tags, create or verify the
protected tag, attach byte-verified evidence, and publish the immutable
non-latest prerelease. It never republishes.

## Recovery

If publication has not succeeded, fix the release path and create a new
Candidate whenever source or artifact bytes change. If publication succeeded
but finalization failed, preserve the exact Candidate and use only the
evidence-backed `resume_published=true` path. Never rebuild or republish the
same version. Restore public tags to the Last Known Good version and stop if
registry identity or bytes do not match.

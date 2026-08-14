## Release Candidate

- Version: `5.0.0-beta.N`
- Source commit: `REQUIRED`
- Canonical Package Artifact SHA-256: `REQUIRED`
- Tagged migration guide: `https://github.com/terminalzero-dev/lemonsqueezy.js/blob/v5.0.0-beta.N/MIGRATION.md`

## Migration impact

Migration impact: `REQUIRED: choose exactly one of None, Additive, Behavior correction, or Breaking beta change`

Affected usage and required consumer action:

- `REQUIRED`

Verification performed:

- `REQUIRED`

For `Behavior correction`, link the applicable Migration Behavior Audit rows.
For `Breaking beta change`, include before/after usage and migration steps.

## Rollback

Exact rollback: `REQUIRED: immutable package version plus manifest and lockfile reference`

Rollback verification:

- [ ] Consumer tests pass with the exact rollback artifact.
- [ ] The Test Mode canary passes.
- [ ] Any completed remote business mutations have a separate recovery plan;
      package rollback does not reverse them.

## Gates

- [ ] The release uses the recorded source commit and Canonical Package
      Artifact digest.
- [ ] Credential-free checks pass.
- [ ] Protected Test Mode integration passes for this exact artifact.
- [ ] Registry integrity, provenance, installed-consumer smoke, and dist-tag
      state are verified after publication.

# @terminalzero/lemonsqueezy 5.0.0-beta.3

`@terminalzero/lemonsqueezy` is an experimental community-maintained Lemon
Squeezy SDK for JavaScript and TypeScript, maintained by Terminal Zero. It is
not affiliated with or endorsed by Lemon Squeezy.

Migration impact: No migration action

## Changes since beta.2

- Correct the README and packaged Migration guide so their exact installation
  commands select the current verified beta instead of beta.1.
- Generalize the protected recurring-beta release workflow and interactive
  dist-tag wizard so the Candidate version, Last Known Good version, evidence
  Issue, and release notes are release-bound rather than beta.2 constants.

There is no runtime, public API, package export, or supported-environment
change from `5.0.0-beta.2`.

## Verification

- Credential-free, runtime, type, bundler, and protected Test Mode gates run
  against one Canonical Package Artifact.
- Registry integrity, redownloaded bytes, signature, provenance subject, ESM,
  CJS, and minimum API behavior are verified after publication.
- Before announcement, both `latest` and `beta` are restored to this exact
  beta.3 Candidate after a live rollback to beta.2.
- The GitHub prerelease remains non-latest; npm `latest` and `beta` identify
  the current recommended package version before the first Stable release.

## Rollback

The exact rollback is `@terminalzero/lemonsqueezy@5.0.0-beta.2` with the
consumer's recorded manifest and lockfile. Package rollback does not reverse
remote Lemon Squeezy business mutations.

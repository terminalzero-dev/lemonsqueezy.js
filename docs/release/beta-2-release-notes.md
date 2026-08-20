# @terminalzero/lemonsqueezy 5.0.0-beta.2

`@terminalzero/lemonsqueezy` is an experimental community-maintained Lemon
Squeezy SDK for JavaScript and TypeScript, maintained by Terminal Zero. It is
not affiliated with or endorsed by Lemon Squeezy.

Migration impact: Behavior correction

## Changes since beta.1

- Correct pagination metadata reading so list responses expose the documented
  page counters from Lemon Squeezy's JSON:API response.
- Complete the v5 documentation indexes and executable documentation coverage
  for Explicit Client resources, Compatibility workflows, License operations,
  and Webhooks.
- Exercise the normal exact-tarball release path with pnpm, OIDC Trusted
  Publishing, npm provenance, installed-consumer smoke, and immutable release
  evidence.

Consumers that read pagination counters should verify the corrected values in
their list-response handling. No package-name, import, or public call-shape
change is required from `5.0.0-beta.1`.

## Verification

- Credential-free, runtime, type, bundler, and protected Test Mode gates run
  against one Canonical Package Artifact.
- Registry integrity, redownloaded bytes, signature, provenance subject, ESM,
  CJS, and minimum API behavior are verified after publication.
- Before announcement, both `latest` and `beta` are moved to
  `5.0.0-beta.1`, verified, and restored to this exact beta.2 Candidate.
- The GitHub prerelease remains non-latest; npm `latest` and `beta` identify
  the current recommended package version before the first Stable release.

## Rollback

The exact rollback is `@terminalzero/lemonsqueezy@5.0.0-beta.1` with the
consumer's recorded manifest and lockfile. Package rollback does not reverse
remote Lemon Squeezy business mutations.

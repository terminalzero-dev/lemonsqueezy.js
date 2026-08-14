# `@terminalzero/lemonsqueezy` 5.0.0-beta.1

This is the first public beta of the experimental, community-maintained
Terminal Zero Lemon Squeezy SDK. It is not affiliated with or endorsed by
Lemon Squeezy.

Install the exact beta version:

```sh
pnpm add --save-exact @terminalzero/lemonsqueezy@5.0.0-beta.1
```

## Migration impact

Migration impact: **Behavior correction**.

Existing applications should read the tagged `MIGRATION.md` before replacing
`@lemonsqueezy/lemonsqueezy.js`. The Compatibility facade preserves supported
v4 call shapes while correcting documented behavior for empty responses,
errors, optional fields, validation, and public declarations. Explicit Client
migration remains optional.

## Release evidence

- Source commit: `adb3c2b02d511ed997752a5085dca361e61bb030`
- Canonical Package Artifact SHA-256:
  `5ed08363370dddfb5b81d0f1b5aca4a30335237e680078f1cc23a6bb699f4662`
- Candidate workflow run: `31786097596`
- Credential-free runtime, type, bundler, and package gates: passed
- Protected Test Mode gate and hard-delete fixture cleanup: passed
- npm provenance: one-time bootstrap exception; registry integrity and exact
  downloaded bytes are recorded in the attached evidence

The attached tarball, Candidate manifest, publish plan, and registry evidence
are the permanent release record.

## Rollback

Before another Terminal Zero version becomes the Last Known Good release,
restore the recorded pre-migration dependency and lockfile using
`@lemonsqueezy/lemonsqueezy.js@4.0.0`. Package rollback does not reverse remote
business mutations.

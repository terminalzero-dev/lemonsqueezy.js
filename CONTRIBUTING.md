# Contributing

This repository uses Node.js 24 (24.11 or later) as its Build host and exactly
pnpm 11.21.0 as its Repository package manager. Enable Corepack before running
repository commands.

```sh
corepack enable
pnpm install --frozen-lockfile
```

The repository uses tsdown and TypeScript 6 for builds, Oxlint for linting,
Oxfmt for formatting, Vitest for deterministic tests, and Changesets for
version intent.

## Development checks

Run focused checks while working:

```sh
pnpm typecheck
pnpm test
pnpm test:repository
```

Run the complete credential-free gate before opening a pull request:

```sh
pnpm check
```

`pnpm check` builds twice to verify reproducibility, packs one Canonical Package
Artifact, and runs Type Contract, documentation, and Installed-package Smoke
tests against that exact tarball. It does not require Lemon Squeezy credentials
or network access to the Lemon Squeezy API. Package Smoke includes the Node/Bun
runtime entries, TypeScript 5.4/current declarations, closed exports, module
identity, and esbuild, Vite/Rollup, webpack, and Bun bundler graphs.

`pnpm test:integration` is reserved for a protected Test Mode environment. It
requires `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_TEST_STORE_ID`,
`LEMON_SQUEEZY_TEST_PRODUCT_ID`, `LEMON_SQUEEZY_TEST_LICENSE_KEY`, and a safe
`LEMON_SQUEEZY_TEST_RUN_ID`. The canary installs the Canonical Package Artifact,
proves Test Mode and the one allowed store before writing, then serially tests
read-only seeds and hard-delete Discount/Webhook fixtures. It immediately
records created fixture IDs in a secret-free journal and always cleans them in
reverse order.

`pnpm test:integration:reap` is the bounded recovery path for test fixtures
older than 24 hours. It re-runs the Test Mode/store preflight and only deletes
exactly identifiable `sdk-ci-*` Discount or Webhook records; it never sweeps
other resource types. Use the journal-based cleanup path first.

To inspect a sanitized API observation without changing public contracts, run:

```sh
pnpm report:contract-drift sanitized-observation.json
```

The command prints a candidate-only report for human review. It cannot edit the
Contract Catalog, public types, or serializers and omits opaque data values.

`pnpm test:docs` is the Installed-package Documentation Contract. After the
Canonical Package Artifact exists, it installs that exact tarball into an
isolated consumer, compiles documented TypeScript examples, and runs
credential-free example behavior on Node.js and Bun. It also checks catalog
coverage for the 21 namespaces, 61 Client methods, 59 Compatibility facade
functions, and 17 known webhook events, plus local links, official-reference
links, and documentation safety. It does not start a documentation server,
watcher, or real Lemon Squeezy request.

## Changes and releases

Use dedicated branches and Conventional Commit messages in the form
`type(scope): description`.

Use `pnpm changeset` for public API, behavior, type, or package-output changes.
Documentation, tests, and internal refactors do not require an empty changeset.

Build, version, pack, test, and publish are separate operations. Do not add
install, pack, or publish lifecycle hooks that rebuild the package. Release
gates and publishing must reuse the single tarball produced by
`pnpm pack:artifact`.

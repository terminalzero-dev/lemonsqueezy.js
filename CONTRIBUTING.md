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
Artifact, and runs Type Contract and Installed-package Smoke tests against that
exact tarball. It does not require Lemon Squeezy credentials or network access
to the Lemon Squeezy API.

`pnpm test:integration` is a separate, explicit Test Mode command. Do not run it
against a normal store or Live Mode credentials.

## Changes and releases

Use dedicated branches and Conventional Commit messages in the form
`type(scope): description`.

Use `pnpm changeset` for public API, behavior, type, or package-output changes.
Documentation, tests, and internal refactors do not require an empty changeset.

Build, version, pack, test, and publish are separate operations. Do not add
install, pack, or publish lifecycle hooks that rebuild the package. Release
gates and publishing must reuse the single tarball produced by
`pnpm pack:artifact`.

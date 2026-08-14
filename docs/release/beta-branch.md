# v5 Beta Branch and Version Pull Request

The beta release line is `release/v5-beta`. `main` never enters Changesets pre
mode. The internal `5.0.0-beta.0` baseline must not be published.

## Establish the protected beta branch

After the Issue #33 governance change is merged to `main`:

1. Fast-forward local `main` from `origin/main`.
2. Create `release/v5-beta` at that exact commit and push the new ref once.
3. Apply `.github/governance/repository.json` so subsequent changes require a
   pull request, the credential-free gate, and resolved conversations.

The initial branch contains no version or changelog change.

## Enter beta pre mode in a separate pull request

Create a new version branch from `origin/release/v5-beta`, then run:

```sh
pnpm changeset pre enter beta
pnpm version
pnpm check
```

The reviewed diff must contain only Changesets pre-state, package version,
changelog, consumed changesets, and the refreshed `pnpm-lock.yaml`. The package
must become exactly `5.0.0-beta.1`, and the generated publish plan must use the
`beta` tag. Open a separate pull request targeting `release/v5-beta`; it receives
the same `Credential-free gate` as every other change.

Do not generate a Release Candidate until that pull request is merged and the
protected branch head has passed its push check.

#!/usr/bin/env bash

set -euo pipefail

EXPECTED_COMMIT=${1:-}
DISPATCH_COMMIT=${2:-}
RESUME_PUBLISHED=${3:-}
DISPATCH_REF=${4:-}

if [[ ! "$EXPECTED_COMMIT" =~ ^[0-9a-f]{40}$ ]] || \
  [[ ! "$DISPATCH_COMMIT" =~ ^[0-9a-f]{40}$ ]]; then
  printf '%s\n' "Release commits must be full lowercase SHA-1 values." >&2
  exit 1
fi

if [[ "$(git rev-parse HEAD)" != "$DISPATCH_COMMIT" ]]; then
  printf '%s\n' "HEAD must match the protected dispatch commit." >&2
  exit 1
fi

if [[ "$RESUME_PUBLISHED" != "true" ]]; then
  if [[ "$RESUME_PUBLISHED" != "false" ]]; then
    printf '%s\n' "Release phase must be true or false." >&2
    exit 1
  fi
  if [[ "$EXPECTED_COMMIT" != "$DISPATCH_COMMIT" ]]; then
    printf '%s\n' \
      "Fresh publication must be dispatched from the exact Candidate commit." \
      >&2
    exit 1
  fi
  exit 0
fi

if [[ "$DISPATCH_REF" != "refs/heads/release/v5-beta" ]]; then
  printf '%s\n' \
    "Candidate recovery must use the protected release branch." >&2
  exit 1
fi

if ! git merge-base --is-ancestor "$EXPECTED_COMMIT" "$DISPATCH_COMMIT"; then
  printf '%s\n' \
    "Candidate must be an ancestor of the protected dispatch commit." >&2
  exit 1
fi

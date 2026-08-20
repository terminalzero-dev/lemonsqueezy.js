#!/usr/bin/env bash

retry_command() {
  local max_attempts=$1
  shift
  local attempt=1
  local delay_seconds=${RETRY_DELAY_SECONDS:-2}
  local output

  while true; do
    if output=$("$@"); then
      if [[ -n "$output" ]]; then
        printf '%s\n' "$output"
      fi
      return 0
    fi
    if ((attempt >= max_attempts)); then
      return 1
    fi

    attempt=$((attempt + 1))
    printf 'Retrying read-only command (%d/%d)...\n' \
      "$attempt" "$max_attempts" >&2
    sleep "$delay_seconds"
  done
}

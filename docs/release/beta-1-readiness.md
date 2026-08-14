# `5.0.0-beta.1` Readiness Evidence

Snapshot date: 2026-08-14. This record intentionally contains no credentials,
recovery material locations, account screenshots, fixture values, or payloads.

| Gate                                | Status                           | Secret-free evidence                                                                                                                                                     |
| ----------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GitHub organization 2FA enforcement | Not ready                        | GitHub organization API returned `two_factor_requirement_enabled: false`.                                                                                                |
| npm maintainer authentication       | Not ready                        | Registry identity lookup returned HTTP 401; no usable npm session is available to this workflow.                                                                         |
| npm scope ownership                 | Unverified                       | Authentication is unavailable, so owner and public scoped-package permission cannot be read back.                                                                        |
| Registry package absence            | Verified                         | Public registry lookup returned HTTP 404 for `@terminalzero/lemonsqueezy`.                                                                                               |
| Recovery materials                  | Maintainer confirmation required | The maintainer must confirm offline GitHub and npm recovery materials without recording their values or locations here.                                                  |
| Test Mode protected configuration   | Not ready                        | The repository currently has no Test Mode environment secrets or fixture variables.                                                                                      |
| Bootstrap runbook                   | Ready                            | `docs/release/bootstrap-beta-1.md` defines exact-artifact publication, tag normalization, Trusted Publisher setup, credential revocation, and post-publish verification. |

The Release Candidate and bootstrap publish remain blocked until every Not
ready or Unverified account/configuration gate is independently resolved and
read back without exposing secret material.

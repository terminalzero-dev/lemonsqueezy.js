# Lemon Squeezy JavaScript SDK Evolution

This context defines the language used while planning the Terminal Zero maintenance and v5 evolution of the Lemon Squeezy JavaScript SDK.

## Language

**Upstream SDK**:
The Lemon Squeezy-maintained repository and npm package whose history and public behavior provide the provenance for this effort.
_Avoid_: Original SDK, old SDK

**Terminal Zero fork**:
The community-maintained fork under `terminalzero-dev` that owns this planning effort and the resulting v5 beta work.
_Avoid_: Official SDK, replacement SDK

**Terminal Zero package**:
The independently published npm package `@terminalzero/lemonsqueezy` produced from the Terminal Zero fork. Its public positioning is “Experimental community-maintained Lemon Squeezy SDK for JavaScript and TypeScript, maintained by Terminal Zero. Not affiliated with or endorsed by Lemon Squeezy.”
_Avoid_: Official package, drop-in official successor

**v4 compatibility baseline**:
The intentional public API measured from v4 documentation, root exports, public types, and verified safe runtime capabilities. It is a source-compatibility baseline, not a promise to reproduce known defects, internal implementation details, or unexported deep paths.
_Avoid_: Bug-for-bug snapshot, v4 maintenance line, legacy codebase

**Package migration boundary**:
The required dependency and root import change from `@lemonsqueezy/lemonsqueezy.js` to `@terminalzero/lemonsqueezy`. Named root imports and both ESM and CJS consumption remain compatibility targets; the upstream package name and unexported deep paths do not.
_Avoid_: Transparent package replacement, old-package alias

**Compatibility-first migration**:
The default v4 migration path that crosses the Package migration boundary while retaining the supported Compatibility facade before any optional Client rewrite. It isolates package adoption from API modernization.
_Avoid_: Full rewrite, legacy migration, automatic package replacement

**Progressive Client migration**:
The optional movement of selected call sites from the Compatibility facade to an Explicit Client after Compatibility-first migration is verified. Facade and Client calls may coexist during this bounded transition without sharing configuration.
_Avoid_: Flag day, facade deprecation, mixed implementation

**Migration rollback**:
The source-and-dependency reversal to a recorded Last Known Good Terminal Zero version or the exact pre-migration Upstream SDK version. The SDK has no persistent state to reverse, so this is not a data rollback or automatic runtime failover.
_Avoid_: Data rollback, dist-tag rollback, automatic fallback

**Migration Behavior Audit**:
The required v4-to-v5 review that maps every corrected compatibility behavior to its consumer risk and verification step. It distinguishes a supported source migration from a claim of bug-for-bug, behavior-neutral replacement.
_Avoid_: Changelog, breaking-change summary, upgrade warning

**Package migration complete**:
The state in which a consumer depends only on an exact Terminal Zero package version, has crossed the Package migration boundary, accepted the Migration Behavior Audit, and recorded test, canary, and rollback evidence. It does not require adopting the Explicit Client.
_Avoid_: Client rewrite complete, temporary facade state, install succeeded

**Client migration complete**:
The optional later state in which the consumer's selected scope uses Explicit Clients and no longer depends on the Default Client or Compatibility envelope. It is not a prerequisite for Package migration complete.
_Avoid_: Package migration complete, mandatory v5 migration, flag-day rewrite

**Migration impact**:
The release-note classification that tells a beta consumer whether a version requires no migration action, adds only compatible surface, corrects an observable behavior, or breaks a beta-only contract. It points to concrete affected usage and rollback guidance rather than restating SemVer.
_Avoid_: SemVer bump, generic breaking-change label, changelog heading

**v5 beta**:
The first externally testable release target for the redesigned SDK, beginning at `5.0.0-beta.1` and published explicitly through the npm `beta` dist-tag. Before the first Stable release, both `latest` and `beta` identify the current verified Last Known Good beta; Stable promotion remains dependent on explicit acceptance criteria and beta feedback.
_Avoid_: v5 stable, final release

**Supported runtime**:
A runtime and version range that the Terminal Zero package formally promises, verifies through installed-package consumer fixtures, and protects as part of its release compatibility contract.
_Avoid_: Environment where the package happens to run, development tool

**Incidental runtime compatibility**:
Observed ability to use the Terminal Zero package outside the Supported runtime matrix without a release guarantee, compatibility fixture, or maintenance commitment.
_Avoid_: Supported runtime, experimental support

**Credential-free test suite**:
The deterministic v5 validation suite that runs without Lemon Squeezy credentials, Lemon Squeezy network access, or external service state. It contains Unit, Transport Contract, Type Contract, and Installed-package Smoke tests and is required by the default CI and pull-request merge gate.
_Avoid_: Test Mode integration, optional local checks

**Unit test**:
A credential-free test of an isolated pure rule such as serialization, validation, event decoding, or error mapping, without network, clock, process-wide configuration, or other external state.
_Avoid_: Transport Contract test, Test Mode integration

**Transport Contract test**:
A credential-free test that exercises an Operation Contract through an in-memory Transport and verifies exact request compilation, response interpretation, and error classification without making a real HTTP request.
_Avoid_: Mocked API integration, Test Mode integration

**Type Contract test**:
A compile-only positive or negative consumer fixture that protects public signatures, narrowing behavior, and rejected usage independently of runtime assertions.
_Avoid_: Runtime unit test, declaration snapshot alone

**Installed-package Smoke test**:
A credential-free consumer fixture that installs the exact packed package tarball and verifies the promised runtime, module format, export, TypeScript, and bundler behavior outside the source workspace.
_Avoid_: Source import test, build-only check

**Test Mode integration**:
A small real-network canary against Lemon Squeezy Test Mode that detects upstream behavior drift and account configuration failures. It supplements rather than replaces deterministic coverage, runs outside the normal pull-request merge gate, and is required before a v5 beta publish.
_Avoid_: Default test suite, exhaustive endpoint coverage, live-mode test

**Dedicated SDK Test Store**:
The synthetic-data-only Lemon Squeezy store reserved for Terminal Zero package integration checks. It remains in Test Mode, is never activated for Live Mode, has only necessary team members, and does not contain real customer or business data.
_Avoid_: Maintainer's normal test store, production store, disposable store

**Test Mode credential**:
An API key created on the Test side of the Dedicated SDK Test Store and available only to trusted scheduled, manual, and protected release workflows. It is never exposed to pull-request or fork jobs and is revoked rather than replaced with a Live Mode credential when unavailable.
_Avoid_: Live API key, repository variable, License Key

**Test Mode safety preflight**:
The fail-closed read-only check that must prove the API response is in Test Mode and the selected store ID matches the single configured allowlist before any integration write occurs. Missing or contradictory evidence aborts the run without mutation.
_Avoid_: Environment flag alone, post-write assertion, best-effort warning

**Seed Fixture**:
A deliberately provisioned, inventoried resource in the Dedicated SDK Test Store used only by read-only Test Mode integration canaries. Routine automation does not mutate it, recreate it per run, or assume that it expires automatically.
_Avoid_: Per-run fixture, disposable record, production sample

**Ephemeral Integration Fixture**:
A synthetic Discount or Webhook created for one Test Mode integration run, identified by the run ID and guaranteed a hard-delete cleanup path. Resources without a real delete operation are not Ephemeral Integration Fixtures.
_Avoid_: Any Test Mode record, soft-deleted resource, Seed Fixture

**Fixture journal**:
The secret-free per-run record of every Ephemeral Integration Fixture's type, ID, store, run identifier, and cleanup state. Cleanup and recovery act on this exact evidence and never use an unbounded store sweep.
_Avoid_: Test log, credential artifact, resource-name guess

**Structural test coverage**:
The explicit coverage inventory that maps every Operation Contract, HTTP outcome class, Webhook event route, public type contract, and supported package-consumer matrix entry to deterministic evidence. It is the merge criterion; one repository-wide line-coverage percentage is not.
_Avoid_: Line coverage target, incidental execution, Test Mode endpoint census

**Release integration gate**:
The protected Test Mode integration run against the exact package tarball proposed for a v5 beta publish. A passing run for another commit or artifact cannot satisfy it, and a failure blocks publishing without affecting ordinary pull-request merges.
_Avoid_: Nightly result reuse, pull-request secret job, post-publish smoke test

**Repository package manager**:
The exact pnpm version declared by the Terminal Zero fork and used for dependency installation, scripts, packing, and registry publishing with one committed `pnpm-lock.yaml`. It is a maintainer tool and does not narrow the package's Node/Bun Supported runtime matrix.
_Avoid_: Bun runtime support, interchangeable package managers, npm installer

**Build host**:
The controlled Node 24 environment that executes repository build, validation, and release tooling. It is separate from the minimum and latest Node/Bun versions exercised as package consumers.
_Avoid_: Minimum Supported runtime, production runtime, package manager

**Canonical Package Artifact**:
The single npm-compatible `.tgz` produced for a release candidate, identified by its SHA-256 digest and reused unchanged by package smoke, Test Mode integration, and registry publishing.
_Avoid_: Rebuilt tarball, source checkout, dist directory

**Release Candidate**:
A specific package version, source commit, Canonical Package Artifact digest, and completed gate record proposed for publication as one indivisible unit. Changing any of those inputs creates a new Release Candidate.
_Avoid_: Branch head, dist directory, latest successful build

**Bootstrap publish**:
The one-time interactive publication of `5.0.0-beta.1` required to create the previously nonexistent Terminal Zero package before npm Trusted Publishing can be configured. It uses a verified Release Candidate and is not a reusable release path.
_Avoid_: Normal release, token-based CI publish, provenance exception for later versions

**Last Known Good version**:
The most recent immutable package version whose artifact identity, required gates, registry integrity, provenance requirements, and supported-consumer behavior are all verified. It is the only valid rollback target for an affected dist-tag.
_Avoid_: Previous version, highest version, cached artifact

**Single-maintainer release authority**:
The accepted governance model in which one designated maintainer may approve and execute a release through a protected workload identity without a long-lived personal npm publishing secret. Loss or compromise of that maintainer account remains an explicit operational risk handled through account recovery rather than a mandatory second approver.
_Avoid_: Two-person release rule, shared npm token, unattended publication

**Interactive dist-tag authority**:
The short-lived maintainer npm web session, protected by Passkey or TOTP, used only to move public dist-tags after an OIDC publication has passed registry verification. The session records secret-free state transitions in a public issue, then logs out; no npm token, OTP, Passkey, or recovery material enters GitHub Actions or repository storage.
_Avoid_: OIDC dist-tag mutation, NPM_TOKEN fallback, unattended tag movement

**Stable readiness evidence**:
The combined contract-completion, operational-soak, and independent-adoption evidence required before moving the Terminal Zero package from beta to stable. Calendar age, downloads, and stars are contextual signals rather than substitutes for any evidence class.
_Avoid_: Time-based promotion, popularity threshold, maintainer intuition alone

**Stable Readiness issue**:
The public, auditable promotion record that identifies the final Release Candidate and demonstrates every Stable readiness evidence threshold before `5.0.0` is published. The single release maintainer may approve it but may not silently waive or retroactively redefine a threshold.
_Avoid_: Release announcement, private checklist, approval by intuition

**Compatibility facade**:
The v5 root surface that preserves supported v4 runtime and type names, call shapes, and JSON:API data shapes while sharing the same underlying SDK behavior as the new client API. It is semver-protected throughout v5 and is not deprecated until a later major-version removal plan is explicitly approved.
_Avoid_: Second implementation, legacy SDK, already-deprecated API

**Default Client**:
The module-instance-wide Client configured by `lemonSqueezySetup` and used only by compatibility-facade functions loaded through the same package format. A later setup replaces this default without changing explicitly created Client instances; separately loaded ESM and CJS package instances do not share it.
_Avoid_: Cross-format global Client, shared configuration for every Client

**Explicit Client**:
An isolated SDK instance returned by `createClient`, with its own immutable configuration and discoverable resource namespaces. It never reads from or writes to the Default Client; credential rotation creates a new Explicit Client.
_Avoid_: Global Client, singleton Client, class instance

**API credential**:
The optional Lemon Squeezy API key captured by an Explicit Client and sent as a Bearer credential for authenticated resource operations. It is distinct from a License Key supplied as business input to the public License API.
_Avoid_: License key, client key

**Authenticated API**:
The Lemon Squeezy resource API whose requests use JSON:API media types and an API credential. Its transport contract is distinct from the public License API.
_Avoid_: License API, generic REST API

**License API**:
The public Lemon Squeezy protocol for activating, validating, and deactivating License Keys without an API credential. Its form-encoded requests and business-negative success responses are distinct from the Authenticated API.
_Avoid_: Authenticated API, API-key authentication

**Resource namespace**:
A stable group of operations for one Lemon Squeezy API resource exposed on an Explicit Client, such as `client.orders.list`. Namespaces organize the public interface while sharing one request implementation core.
_Avoid_: Service, manager, second implementation

**Namespace Module**:
The cohesive SDK module that owns one Explicit Client namespace's types, Operation Contracts, evidence, namespace adapter, and tests. Twenty Namespace Modules represent Authenticated API resources; the License Namespace Module represents the separate License API protocol.
_Avoid_: Resource service, endpoint folder, second implementation

**Operation Contract**:
The reviewed executable contract for one Explicit Client method, combining its public arguments, protocol request compilation, success shape, and evidence. Explicit Client and Compatibility facade calls share it.
_Avoid_: Passive endpoint metadata, generic request, response schema

**v5 beta operation set**:
The complete Explicit Client surface for the currently documented Lemon Squeezy API: 21 namespaces and 61 methods, including the `customers.archive` convenience. It excludes undocumented CRUD, automatic pagination, bulk helpers, and generic requests.
_Avoid_: Partial beta surface, inferred endpoint set, every possible convenience

**Webhook Management API**:
The Authenticated API resource for creating, retrieving, updating, deleting, and listing Webhook registrations. It manages delivery configuration but does not receive or verify events.
_Avoid_: Inbound Webhook delivery, Webhook receiver

**Inbound Webhook delivery**:
The signed event request Lemon Squeezy sends to a consumer endpoint, carrying an event name and JSON:API resource payload. It is distinct from the Webhook Management API.
_Avoid_: Webhook resource, Webhook registration

**Inbound Webhook receiver**:
The v5 beta capability that authenticates and interprets an Inbound Webhook delivery independently of the Explicit Client and Webhook Management API. The consumer remains responsible for its HTTP endpoint response, retries, and idempotent processing.
_Avoid_: Webhook management namespace, Client method, request handler

**Webhook raw body**:
The exact, unparsed request-body content covered by an Inbound Webhook delivery signature. Parsing or reconstructing the payload before authentication no longer preserves this evidence.
_Avoid_: Parsed JSON, re-serialized payload

**Inbound Webhook event**:
The authenticated, minimally validated event returned by the Inbound Webhook receiver. Its event name is read from the signed payload metadata rather than the unsigned request header.
_Avoid_: Unverified payload, X-Event-Name value

**Known Inbound Webhook event**:
An Inbound Webhook event whose signed event name is in the reviewed Contract Catalog and whose JSON:API resource type matches that event. It carries the corresponding Canonical resource type.
_Avoid_: Closed event universe, deeply validated resource

**Unknown Inbound Webhook event**:
An authenticated Inbound Webhook event whose signed event name is not yet in the reviewed Contract Catalog. Its original name, metadata, resource, and unknown fields are preserved for safe handling.
_Avoid_: Invalid event, discarded event

**Webhook receiver failure**:
A signature or payload failure recognized while authenticating and interpreting an Inbound Webhook delivery. It is distinct from a LemonSqueezyError produced by an Explicit Client operation.
_Avoid_: HTTP API error, business-processing failure

**Contract Catalog**:
The Terminal Zero fork's reviewed record of Lemon Squeezy resource types, operations, relationships, known values, wire mappings, and supporting evidence. It is the repository's truth source for SDK projections, not an official Lemon Squeezy schema.
_Avoid_: Official schema, scraped documentation, generated SDK

**Canonical v5 type model**:
The public type vocabulary designed for Explicit Client resources, inputs, responses, relationships, errors, and events. It may correct or widen the v4 compatibility baseline while Compatibility facade type names remain separately protected.
_Avoid_: v4 type snapshot, compatibility aliases

**Wire-native response**:
An Explicit Client response that preserves Lemon Squeezy's JSON:API structure and `snake_case` field names without converting it into a camelCase domain object.
_Avoid_: Domain model, normalized response, compatibility envelope

**Opaque user data**:
Caller-owned nested data, such as checkout custom data, whose keys and values are outside the Lemon Squeezy SDK's schema. The SDK preserves it without naming assumptions or key transformation.
_Avoid_: SDK attributes, generated fields

**Explicit Client response**:
The parsed Lemon Squeezy API body returned directly by an Explicit Client resource operation. Failures reject with a typed SDK error; this response is not wrapped in the Compatibility envelope.
_Avoid_: Compatibility envelope, raw fetch response, result union

**LemonSqueezyError**:
The typed rejection emitted by Explicit Client operations for SDK-recognized failures and identified by `isLemonSqueezyError`. It is distinct from the `error` field carried by a Compatibility envelope.
_Avoid_: Error envelope, facade error field

**Compatibility envelope**:
The facade's Promise result with `statusCode`, `data`, and `error` fields for successful, API, transport, and parsing outcomes. It preserves the v4 result shape while using corrected HTTP status, empty-body, and error-data semantics.
_Avoid_: Raw response, bug-compatible response

**Error observer**:
The compatibility facade's `onError` callback, invoked once for an error envelope without changing that result. Exceptions from the observer are isolated from SDK control flow and explicit Client instances.
_Avoid_: Error handler, rejection hook

**Official adoption path**:
A possible future migration from the independently maintained Terminal Zero package to an equivalent official Lemon Squeezy release. The packages coexist by default; deprecation requires an explicit agreement, a final compatibility bridge, and migration documentation, without silently redirecting consumers or deleting published history.
_Avoid_: Automatic handoff, namespace transfer commitment

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

**v5 beta**:
The first externally testable release target for the redesigned SDK, beginning at `5.0.0-beta.1` and published only through the npm `beta` dist-tag. Promotion to stable and the `latest` dist-tag depends on explicit acceptance criteria and beta feedback.
_Avoid_: v5 stable, final release

**Supported runtime**:
A runtime and version range that the Terminal Zero package formally promises, verifies through installed-package consumer fixtures, and protects as part of its release compatibility contract.
_Avoid_: Environment where the package happens to run, development tool

**Incidental runtime compatibility**:
Observed ability to use the Terminal Zero package outside the Supported runtime matrix without a release guarantee, compatibility fixture, or maintenance commitment.
_Avoid_: Supported runtime, experimental support

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

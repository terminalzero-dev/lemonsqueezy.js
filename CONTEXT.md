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

**Compatibility facade**:
The v5 root surface that preserves supported v4 runtime and type names, call shapes, and JSON:API data shapes while sharing the same underlying SDK behavior as the new client API. It is semver-protected throughout v5 and is not deprecated until a later major-version removal plan is explicitly approved.
_Avoid_: Second implementation, legacy SDK, already-deprecated API

**Default Client**:
The process-wide Client configured by `lemonSqueezySetup` and used only by compatibility-facade functions. A later setup replaces this default without changing explicitly created Client instances.
_Avoid_: Global Client, shared configuration for every Client

**Compatibility envelope**:
The facade's Promise result with `statusCode`, `data`, and `error` fields for successful, API, transport, and parsing outcomes. It preserves the v4 result shape while using corrected HTTP status, empty-body, and error-data semantics.
_Avoid_: Raw response, bug-compatible response

**Error observer**:
The compatibility facade's `onError` callback, invoked once for an error envelope without changing that result. Exceptions from the observer are isolated from SDK control flow and explicit Client instances.
_Avoid_: Error handler, rejection hook

**Official adoption path**:
A possible future migration from the independently maintained Terminal Zero package to an equivalent official Lemon Squeezy release. The packages coexist by default; deprecation requires an explicit agreement, a final compatibility bridge, and migration documentation, without silently redirecting consumers or deleting published history.
_Avoid_: Automatic handoff, namespace transfer commitment

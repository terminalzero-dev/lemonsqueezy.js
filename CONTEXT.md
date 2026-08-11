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
The observable public API, types, exports, and response behavior that v5 compatibility decisions are measured against. Existing v4 issues and pull requests are evidence for this baseline, not a separate release commitment.
_Avoid_: v4 maintenance line, legacy codebase

**v5 beta**:
The first externally testable release target for the redesigned SDK, beginning at `5.0.0-beta.1` and published only through the npm `beta` dist-tag. Promotion to stable and the `latest` dist-tag depends on explicit acceptance criteria and beta feedback.
_Avoid_: v5 stable, final release

**Compatibility facade**:
The v5 public surface that preserves supported v4 calling patterns while sharing the same underlying SDK behavior as the new client API.
_Avoid_: Second implementation, legacy SDK

**Official adoption path**:
A possible future migration from the independently maintained Terminal Zero package to an equivalent official Lemon Squeezy release. The packages coexist by default; deprecation requires an explicit agreement, a final compatibility bridge, and migration documentation, without silently redirecting consumers or deleting published history.
_Avoid_: Automatic handoff, namespace transfer commitment

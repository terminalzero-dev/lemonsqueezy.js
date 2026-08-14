# Migration to `@terminalzero/lemonsqueezy` v5

> Experimental community-maintained SDK maintained by Terminal Zero. Not
> affiliated with or endorsed by Lemon Squeezy.

This guide is the canonical migration artifact shipped in every package
tarball. Use the copy from the exact version you are evaluating. The package
supports Node.js 22 and 24, Bun 1.3.14 through 1.x, ESM and CJS, and TypeScript
5.4 and later.

## Choose a path

| Starting point          | Recommended path    | Completion condition                                                                                                                   |
| ----------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Existing v4 application | Compatibility-first | The dependency and root imports use an exact Terminal Zero version, the behavior audit is signed off, and the canary and rollout pass. |
| Migrated application    | Progressive Client  | The selected call sites use an Explicit Client, its direct responses, and typed rejected errors.                                       |
| Greenfield application  | Explicit Client     | The application creates isolated clients and uses resource namespaces from the start.                                                  |

Compatibility-first is a complete, supported v5 outcome. The Compatibility
facade is supported throughout v5 and is not a temporary step. Progressive
Client migration is optional.

## Compatibility-first migration

The package migration boundary requires two source changes: install the new
package and change supported root module specifiers. Function names, argument
order, the 60 v4 runtime names, the 92 directly exported v4 type names, and the
`{ statusCode, data, error }` envelope remain supported. Upstream package deep
imports and unexported source paths are not supported.

### 1. Record the starting point

Before editing, record all of the following in the migration change:

- the pre-migration commit and lockfile;
- the exact upstream version, for example
  `@lemonsqueezy/lemonsqueezy.js@4.0.0`;
- runtime, module format, TypeScript version, and package manager;
- the application tests and Test Mode paths that form the baseline.

### 2. Install an exact beta

Use the exact release under evaluation. The commands below use the first v5
beta target; do not replace it with `beta`, `latest`, a caret, or a tilde in a
deployable manifest.

```sh
npm install --save-exact @terminalzero/lemonsqueezy@5.0.0-beta.1
```

```sh
pnpm add --save-exact @terminalzero/lemonsqueezy@5.0.0-beta.1
```

```sh
bun add --exact @terminalzero/lemonsqueezy@5.0.0-beta.1
```

### 3. Change supported imports

Change only the package name first. Keep the existing setup, flat functions,
types, and envelope handling.

<!-- fixture: migration-compatibility.mts -->

```ts
import {
  getAuthenticatedUser,
  lemonSqueezySetup,
  type User,
} from "@terminalzero/lemonsqueezy";

lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY });

const result = await getAuthenticatedUser();
if (result.error) {
  console.error(result.statusCode, result.error.message);
} else {
  const user: User | null = result.data;
  console.log(user);
}
```

The explicit `./compat` entry has the same facade semantics and can be used as
an application ownership boundary. Moving imports to it is optional.

<!-- fixture: migration-cjs.cts -->

```ts
const {
  getAuthenticatedUser,
  lemonSqueezySetup,
} = require("@terminalzero/lemonsqueezy/compat");

lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY });
void getAuthenticatedUser().then((result) => {
  if (result.error) console.error(result.statusCode, result.error.message);
});
```

### 4. Run a read-only migration scan

Scope searches to owned source and configuration directories. Review generated
code, vendored code, monorepo packages, and package aliases separately; do not
run a blind repository-wide replacement.

```sh
rg -n '@lemonsqueezy/lemonsqueezy\.js|@terminalzero/lemonsqueezy/' src test package.json
rg -n 'node_modules/.+lemonsqueezy|src/.+lemonsqueezy|dist/.+lemonsqueezy' src test
rg -n 'declare module.+lemonsqueezy|as (unknown as|any)' src test
```

Check the results for:

- old imports, `require` calls, dependency aliases, and scripts;
- upstream deep imports, copied source, and direct `dist` imports;
- local declaration augmentations or casts added for v4 type conflicts;
- the same mutation sent through upstream, facade, and Client paths.

This package publishes no codemod or automatic source rewrite.

### 5. Sign off the Migration Behavior Audit

The facade is source-compatible, not bug-for-bug compatible. Verify every row
that intersects your application.

| Correction                        | v4 risk or conflict                                                                                       | v5 Compatibility behavior                                                                         | Consumer action and verification                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Empty 204/205 responses           | JSON parsing could turn a successful delete into an error and lose status.                                | The envelope preserves the actual status with `data: null` and `error: null`.                     | Ensure delete handling treats 204/205 as success. Exercise the real delete path in Test Mode only when cleanup is guaranteed. |
| Non-JSON HTTP errors              | Parsing could hide the HTTP status and response details.                                                  | The envelope retains the HTTP status and safe available error details.                            | Recheck status-based handling and sanitized logs.                                                                             |
| Default list query                | Calls could send an empty `?include=`.                                                                    | Omitted or empty includes do not add a query parameter.                                           | Update URL assertions, proxy rules, or cache keys that captured the defective URL.                                            |
| `updateLicenseKey` defaults       | Omitting `disabled` could send `disabled: false` and re-enable a key.                                     | Only fields explicitly supplied by the caller are sent.                                           | Explicitly provide `disabled` only when changing it; verify request intent.                                                   |
| `updateSubscriptionItem` defaults | Omitting booleans could send two `false` mutations.                                                       | Only caller-supplied fields are sent.                                                             | Explicitly provide each intended boolean and verify billing behavior.                                                         |
| Invoice params                    | Runtime allowed omission while declarations required an empty object.                                     | Invoice params are optional.                                                                      | Remove casts or empty objects used only to satisfy v4 declarations, then compile.                                             |
| Wire-native timestamps            | `Order.refunded_at` was typed as `Date \| null` although transport returned a string.                     | The value is `string \| null`, matching the wire response.                                        | Parse timestamps at the application boundary before using `Date` methods.                                                     |
| Subscription Item overload        | Runtime accepted numeric quantity while declarations did not.                                             | Numeric and object forms are both supported by the facade.                                        | Remove local augmentations and compile both forms used by the application.                                                    |
| Falsy validation                  | Truthiness checks confused `0`, `false`, and empty string with omission; full refund omission could fail. | Validation is field-specific. Omitted refund amount means full refund; explicit zero is rejected. | Review falsy inputs and add a full-refund test where used.                                                                    |
| Argument failure timing           | Similar failures alternated between synchronous throws and rejected Promises.                             | Facade argument failures consistently reject Promises.                                            | Use `await expect(...).rejects` or `try`/`catch` around `await`.                                                              |
| `onError` call count              | A failure could notify the observer twice.                                                                | An error envelope notifies once; success and validation rejection do not notify.                  | Remove side effects that depended on duplicate notifications.                                                                 |
| Throwing `onError`                | Observer exceptions could replace the SDK result.                                                         | Observer failures are isolated from the returned envelope.                                        | Do not use observer exceptions for application control flow.                                                                  |
| Error data typing                 | An HTTP error body could be typed as successful business data.                                            | Error envelopes have `data: null` and a typed SDK error.                                          | Stop reading business fields from the error branch.                                                                           |
| Export and type proof             | Count-only tests and declaration drift could miss renamed or unusable exports.                            | Exact names and installed-consumer fixtures protect the facade.                                   | Remove local export/type shims and compile the real call surface.                                                             |

Canonical Client types are not aliases for Compatibility types. Both preserve
wire-native response fields, but Client methods resolve a direct protocol body
and reject typed errors; facade functions resolve a Compatibility envelope.

## Progressive Client migration

Move one complete namespace or call site at a time, including configuration,
the success shape, and error handling.

<!-- fixture: migration-client.mts -->

```ts
import {
  createClient,
  isLemonSqueezyError,
  type UserResponse,
} from "@terminalzero/lemonsqueezy/client";

const client = createClient({ apiKey: process.env.LEMONSQUEEZY_API_KEY });

try {
  const response: UserResponse = await client.users.getAuthenticated();
  console.log(response.data);
} catch (error) {
  if (isLemonSqueezyError(error)) {
    console.error(error.code, error.statusCode);
  } else {
    throw error;
  }
}
```

`lemonSqueezySetup` replaces only the module-instance Default Client used by
facade calls. Every `createClient` call captures its own immutable options and
does not read or change that Default Client. ESM and CJS package instances do
not promise shared Default Client configuration. Rotate facade credentials by
running setup again; rotate Explicit Client credentials by creating a new
client.

Facade and Client calls may coexist, but one business mutation must choose one
path. Do not dual-write, shadow-write, add automatic runtime failover, or cast a
Client response into a Compatibility envelope.

## Greenfield Explicit Client

New projects should start with the Explicit Client example above. Create a
client at the application's configuration boundary and discover operations
through its resource namespaces. Import shared public types from the type-only
entry when useful:

<!-- fixture: migration-bundler.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";
import type { StoreResponse } from "@terminalzero/lemonsqueezy/types";

const client = createClient({ apiKey: "configured-on-the-server" });
const store: Promise<StoreResponse> = client.stores.get(1);
void store;
```

Inbound Webhook verification is a separate root function and does not depend
on either client configuration model.

## Canary and rollout checklist

- [ ] Install and lock one exact Terminal Zero version from the reviewed
      tarball.
- [ ] Run typechecking and application tests with no credentials.
- [ ] Confirm old specifiers, unsupported deep imports, and local shims are
      absent from owned source.
- [ ] Sign off every applicable behavior-audit row.
- [ ] Exercise representative reads and writes in the consumer's controlled
      Lemon Squeezy Test Mode environment.
- [ ] Confirm no API key, License Key, Webhook secret, signature, raw payload,
      or customer/store identifier is captured in migration evidence.
- [ ] Record the exact Terminal Zero Last Known Good version and the complete
      upstream rollback reference.
- [ ] Deploy to a small audience, observe application-owned health and business
      signals, then expand deliberately.

## Two-layer rollback

Rollback never uses the moving `beta` or `latest` tag.

1. **Terminal Zero LKG rollback:** restore the exact validated Terminal Zero
   package version, manifest, and lockfile. For the first beta this target only
   exists after your project validates and records that exact beta.
2. **Upstream rollback:** restore the pre-migration commit, exact upstream
   package (for example `@lemonsqueezy/lemonsqueezy.js@4.0.0`), lockfile,
   module specifiers, local type shims, and prior behavior expectations.

After either rollback, rerun consumer tests and the Test Mode canary. The SDK
has no persistent migration state, but package rollback cannot undo successful
remote create, update, delete, cancel, refund, license, or other business
mutations. Recover those through application and Lemon Squeezy business
procedures.

## Beta policy and known limits

- The Compatibility facade is semver-protected throughout v5 and is not
  deprecated.
- Explicit Client, Canonical types, and other v5-only surfaces may receive a
  documented breaking beta change before Stable. Each change requires a new
  immutable exact version, migration steps, and an exact rollback target.
- The package does not provide runtime switching, automatic runtime failover,
  dual-write helpers, telemetry, a migration CLI, or a codemod.
- The package does not promise Edge runtime support or upstream package-name
  compatibility.
- Migration support has no response-time or resolution SLA.

Report migration evidence or blockers with the repository's
[migration feedback form](https://github.com/terminalzero-dev/lemonsqueezy.js/issues/new?template=migration-feedback.yml).
Never include API credentials, License Keys, Webhook secrets or signatures,
raw Webhook payloads, or customer/store identifiers.

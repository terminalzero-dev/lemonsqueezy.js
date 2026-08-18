# Discounts and Licensing

This guide covers promotional discounts and licensing on two distinct
protocols. Discount and License Key administration use the Authenticated
API through `@terminalzero/lemonsqueezy/client` with a Bearer API
credential. The public License API uses the same client object's
`license` namespace, but it sends form-encoded License Key input and does
not send a Bearer credential.

Use Lemon Squeezy
[Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)
for any Authenticated API write. Name Test Mode discounts with a
`docs-` prefix and delete them after the example run. License Key
updates have no hard-delete cleanup path. Do not use these examples
against Live Mode resources.

Do not log or embed API keys, License Keys, License API instance
identifiers, authorization headers, or sensitive response fields such as
`license_key`. Load those values from the environment in trusted
server-side code.

## Discounts

`discounts.create`, `discounts.list`, `discounts.get`, and
`discounts.delete` map to
[Create](https://docs.lemonsqueezy.com/api/discounts/create-discount),
[List](https://docs.lemonsqueezy.com/api/discounts/list-all-discounts),
[Retrieve](https://docs.lemonsqueezy.com/api/discounts/retrieve-discount),
and
[Delete](https://docs.lemonsqueezy.com/api/discounts/delete-discount).
The SDK has no discount update operation.

Create requires `storeId`, `name`, `amount`, and `amountType` of
`percent` or `fixed`. Optional `code` must be 3–256 uppercase
alphanumeric characters; omit it to let the SDK generate one. Pass
`testMode: true` for Test Mode. `discounts.delete` hard-deletes the
discount and returns no document. Use that cleanup path for Test Mode
fixtures.

Status values such as `published` remain open strings. Amounts stay
integers. Timestamps such as `starts_at` stay ISO strings or `null`.

<!-- fixture: discounts-lifecycle.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

export async function createTestDiscount(storeId: string) {
  const created = await client.discounts.create({
    storeId,
    name: "docs-test-discount",
    code: "DOCSTEST10",
    amount: 10,
    amountType: "percent",
    testMode: true,
  });
  return created.data.id;
}

export async function inspectDiscount(storeId: string, discountId: string) {
  const listed = await client.discounts.list({
    filter: { storeId },
    page: { number: 1, size: 10 },
  });
  return listed.data[0]
    ? client.discounts.get(listed.data[0].id)
    : client.discounts.get(discountId);
}

export async function deleteTestDiscount(discountId: string) {
  await client.discounts.delete(discountId);
}
```

## Discount redemptions

`discountRedemptions.list` and `discountRedemptions.get` map to
[List](https://docs.lemonsqueezy.com/api/discount-redemptions/list-all-discount-redemptions)
and
[Retrieve](https://docs.lemonsqueezy.com/api/discount-redemptions/retrieve-discount-redemption).
Redemption records are read-only. There is no create, update, or delete
operation.

<!-- fixture: discount-redemptions.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

export async function redemptionsForDiscount(discountId: string) {
  const redemptions = await client.discountRedemptions.list({
    filter: { discountId },
    page: { number: 1, size: 10 },
  });
  const first = redemptions.data[0];
  return first ? client.discountRedemptions.get(first.id) : undefined;
}
```

## License Keys and instances

License Key administration is Authenticated API traffic. It requires an
API credential and uses JSON:API media types. It is not the public
License API.

`licenseKeys.list`, `licenseKeys.get`, and `licenseKeys.update` map to
[List](https://docs.lemonsqueezy.com/api/license-keys/list-all-license-keys),
[Retrieve](https://docs.lemonsqueezy.com/api/license-keys/retrieve-license-key),
and
[Update](https://docs.lemonsqueezy.com/api/license-keys/update-license-key).
There is no create or delete operation. Update requires at least one of
`activationLimit`, `expiresAt`, or `disabled`.

`licenseKeyInstances.list` and `licenseKeyInstances.get` map to
[List](https://docs.lemonsqueezy.com/api/license-key-instances/list-all-license-key-instances)
and
[Retrieve](https://docs.lemonsqueezy.com/api/license-key-instances/retrieve-license-key-instance).
Instances are read-only through this namespace. The JSON:API resource
`id` is the management identifier. The License API instance identifier
used by activate, validate, and deactivate is a separate value; do not
treat the two as interchangeable, and do not log either.

<!-- fixture: license-management.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
});

export async function inspectLicenseKeys(storeId: string) {
  const keys = await client.licenseKeys.list({
    filter: { storeId, status: "active" },
    page: { number: 1, size: 10 },
  });
  const key = keys.data[0];
  if (!key) {
    return undefined;
  }

  const current = await client.licenseKeys.get(key.id);
  const instances = await client.licenseKeyInstances.list({
    filter: { licenseKeyId: key.id },
  });
  const instance = instances.data[0]
    ? await client.licenseKeyInstances.get(instances.data[0].id)
    : undefined;
  return {
    status: current.data.attributes.status,
    disabled: current.data.attributes.disabled,
    instanceCount: instances.data.length,
    hasInstance: instance !== undefined,
  };
}

export async function disableLicenseKey(licenseKeyId: string) {
  return client.licenseKeys.update(licenseKeyId, { disabled: true });
}
```

## Public License API

`license.activate`, `license.validate`, and `license.deactivate` map to
[Activate](https://docs.lemonsqueezy.com/api/license-api/activate-license-key),
[Validate](https://docs.lemonsqueezy.com/api/license-api/validate-license-key),
and
[Deactivate](https://docs.lemonsqueezy.com/api/license-api/deactivate-license-key).

These calls are not Authenticated API operations:

- They do not send a Bearer API credential.
- They POST `application/x-www-form-urlencoded` bodies to
  `/v1/licenses/activate`, `/v1/licenses/validate`, and
  `/v1/licenses/deactivate`.
- They accept `application/json`, not JSON:API documents.
- Business-negative outcomes such as `activated: false` or `.valid === false`
  still resolve. Inspect `activated`, `valid`, `deactivated`, and
  `error` on the JSON body. Transport and validation failures still
  reject with `LemonSqueezyError`.

Load the License Key and instance identifier from the environment. Do not
print them or the returned `license_key` object.

<!-- fixture: license-api.ts -->

```ts
import { createClient } from "@terminalzero/lemonsqueezy/client";

const client = createClient();

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export async function licenseLifecycle(instanceName: string) {
  const licenseKey = requiredEnv("LEMONSQUEEZY_LICENSE_KEY");
  const activated = await client.license.activate({
    licenseKey,
    instanceName,
  });
  if (!activated.activated || !activated.instance) {
    return { activated: false };
  }

  const validated = await client.license.validate({
    licenseKey,
    instanceId: activated.instance.id,
  });
  const deactivated = await client.license.deactivate({
    licenseKey,
    instanceId: activated.instance.id,
  });
  return {
    activated: activated.activated,
    valid: validated.valid,
    deactivated: deactivated.deactivated,
  };
}
```

Empty License API input fails before transport and does not send a
Bearer credential:

<!-- fixture: licensing-validation.ts execute -->

```ts
import {
  createClient,
  isLemonSqueezyError,
} from "@terminalzero/lemonsqueezy/client";

const client = createClient();

try {
  await client.license.validate({ licenseKey: "" });
} catch (error) {
  if (isLemonSqueezyError(error)) {
    console.error(error.code, error.statusCode);
  } else {
    throw error;
  }
}
```

## Next guides

- [Explicit Client](./client.md) for construction, request options, and
  failures
- [Client API](./client-api.md) for every namespace method
- [Orders, subscriptions, and metering](./orders-subscriptions.md) for
  the orders that redeem discounts and issue License Keys
- [Webhook management and inbound delivery](./webhooks.md) for
  `license_key_created` and `license_key_updated`
- [Compatibility API](./compatibility-api.md) for facade equivalents
- [Official Lemon Squeezy API](https://docs.lemonsqueezy.com/api) for
  resource fields and licensing rules

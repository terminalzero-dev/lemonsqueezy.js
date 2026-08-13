import type { LemonSqueezyClient } from "../../client";
import { createUsersNamespace } from "../../namespaces/users/namespace";
import { createStoresNamespace } from "../../namespaces/stores/namespace";
import { createProductsNamespace } from "../../namespaces/products/namespace";
import { createVariantsNamespace } from "../../namespaces/variants/namespace";
import { createPricesNamespace } from "../../namespaces/prices/namespace";
import { createFilesNamespace } from "../../namespaces/files/namespace";
import { createAffiliatesNamespace } from "../../namespaces/affiliates/namespace";
import { createResourceRuntime } from "./runtime";
import {
  DEFAULT_TIMEOUT_MS,
  type ClientOptions,
  type TransportAdapter,
} from "./types";

export function createClientWithTransport(
  options: ClientOptions,
  transport: TransportAdapter,
): LemonSqueezyClient {
  const runtime = createResourceRuntime(
    {
      apiKey: options.apiKey,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    },
    transport,
  );

  return Object.freeze({
    users: createUsersNamespace(runtime),
    stores: createStoresNamespace(runtime),
    products: createProductsNamespace(runtime),
    variants: createVariantsNamespace(runtime),
    prices: createPricesNamespace(runtime),
    files: createFilesNamespace(runtime),
    affiliates: createAffiliatesNamespace(runtime),
  });
}

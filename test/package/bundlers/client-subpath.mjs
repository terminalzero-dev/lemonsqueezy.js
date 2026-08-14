import { createClient } from "@terminalzero/lemonsqueezy/client";

export function createCatalogClient(apiKey) {
  return createClient({ apiKey });
}

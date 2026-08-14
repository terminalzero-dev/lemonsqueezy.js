import { createClient } from "@terminalzero/lemonsqueezy";

export function createCatalogClient(apiKey) {
  return createClient({ apiKey });
}

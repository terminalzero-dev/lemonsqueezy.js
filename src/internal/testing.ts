import type { LemonSqueezyClient } from "../client";
import { createClientWithTransport } from "./v5/client";
import type { ClientOptions, TransportAdapter } from "./v5/types";
import { setDefaultTransport } from "./v5/default-client";

export function createClientWithAdapter(
  options: ClientOptions,
  adapter: TransportAdapter,
): LemonSqueezyClient {
  return createClientWithTransport(options, adapter);
}

export function setDefaultAdapter(adapter: TransportAdapter): void {
  setDefaultTransport(adapter);
}

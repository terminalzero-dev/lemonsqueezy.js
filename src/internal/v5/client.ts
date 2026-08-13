import type { LemonSqueezyClient } from "../../client";
import { createUsersNamespace } from "../../namespaces/users/namespace";
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
  });
}

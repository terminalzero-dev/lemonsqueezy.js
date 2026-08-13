import { createClientWithTransport } from "../internal/v5/client";
import type { ClientOptions } from "../internal/v5/types";
import type { UsersNamespace } from "../namespaces/users/namespace";

export {
  isLemonSqueezyError,
  LemonSqueezyError,
  type LemonSqueezyErrorCode,
} from "./error";

export type {
  AbortSignal,
  ClientOptions,
  RequestOptions,
} from "../internal/v5/types";
export type { UsersNamespace } from "../namespaces/users/namespace";
export type {
  UserAttributes,
  UserResource,
  UserResponse,
} from "../namespaces/users/types";

export interface LemonSqueezyClient {
  readonly users: UsersNamespace;
}

export function createClient(options: ClientOptions = {}): LemonSqueezyClient {
  return createClientWithTransport(options, (request) => fetch(request));
}

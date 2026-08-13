import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import { getAuthenticatedUserOperation } from "./contract";
import type { UserResponse } from "./types";

export interface UsersNamespace {
  getAuthenticated(options?: RequestOptions): Promise<UserResponse>;
}

export function createUsersNamespace(runtime: ResourceRuntime): UsersNamespace {
  return Object.freeze({
    async getAuthenticated(options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [], UserResponse>(
          getAuthenticatedUserOperation,
          [],
          options,
        )
      ).body;
    },
  });
}

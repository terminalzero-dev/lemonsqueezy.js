import { invokeDefaultCompatibility } from "../internal/v5/default-client";
import { getAuthenticatedUserOperation } from "../namespaces/users/contract";
import type { UserResponse } from "../namespaces/users/types";
import type { User } from "./types";

/**
 * Retrieve the authenticated user.
 *
 * @returns A user object.
 */
export function getAuthenticatedUser() {
  return invokeDefaultCompatibility<readonly [], UserResponse, User>(
    getAuthenticatedUserOperation,
    [],
  );
}

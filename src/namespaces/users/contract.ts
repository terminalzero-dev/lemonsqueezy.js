import type { OperationContract } from "../../internal/v5/types";
import type { UserResponse } from "./types";

export const getAuthenticatedUserOperation = {
  key: "users.getAuthenticated",
  compile: () => ({
    protocol: "jsonapi",
    method: "GET",
    path: "/v1/users/me",
  }),
  success: { kind: "jsonapi-single", resourceType: "users" },
  evidence: [
    "https://docs.lemonsqueezy.com/api/users/retrieve-user",
    "https://docs.lemonsqueezy.com/api/users/the-user-object",
  ],
} as const satisfies OperationContract<readonly [], UserResponse>;

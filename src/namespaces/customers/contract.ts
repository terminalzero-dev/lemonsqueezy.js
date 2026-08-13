import {
  compilePathId,
  compileReadQuery,
  compileResourceId,
} from "../../internal/v5/request";
import { LemonSqueezyError } from "../../client/error";
import type { Id } from "../../types/jsonapi";
import type { OperationContract } from "../../internal/v5/types";
import type {
  CreateCustomerInput,
  CustomerListResponse,
  CustomerResponse,
  GetCustomerParams,
  ListCustomersParams,
  UpdateCustomerInput,
} from "./types";

const evidence = {
  object: "https://docs.lemonsqueezy.com/api/customers/the-customer-object",
  create: "https://docs.lemonsqueezy.com/api/customers/create-customer",
  get: "https://docs.lemonsqueezy.com/api/customers/retrieve-customer",
  list: "https://docs.lemonsqueezy.com/api/customers/list-all-customers",
  update: "https://docs.lemonsqueezy.com/api/customers/update-customer",
} as const;

export const createCustomerOperation = {
  key: "customers.create",
  compile: ([input]) => {
    assertNonEmptyString("name", input.name);
    assertNonEmptyString("email", input.email);
    return {
      protocol: "jsonapi",
      method: "POST",
      path: "/v1/customers",
      body: {
        data: {
          type: "customers",
          attributes: {
            name: input.name,
            email: input.email,
            city: input.city,
            region: input.region,
            country: input.country,
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: compileResourceId("storeId", input.storeId),
              },
            },
          },
        },
      },
    };
  },
  success: { kind: "jsonapi-single", resourceType: "customers" },
  evidence: [evidence.create, evidence.object],
} as const satisfies OperationContract<
  readonly [CreateCustomerInput],
  CustomerResponse
>;

export const getCustomerOperation = {
  key: "customers.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/customers/${compilePathId("customerId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "customers" },
  evidence: [evidence.get, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, GetCustomerParams],
  CustomerResponse
>;

export const listCustomersOperation = {
  key: "customers.list",
  compile: ([params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: "/v1/customers",
    query: compileReadQuery(params, {
      storeId: "filter[store_id]",
      email: "filter[email]",
    }),
  }),
  success: { kind: "jsonapi-list", resourceType: "customers" },
  evidence: [evidence.list, evidence.object],
} as const satisfies OperationContract<
  readonly [ListCustomersParams],
  CustomerListResponse
>;

export const updateCustomerOperation = {
  key: "customers.update",
  compile: ([id, input]) => {
    if (!hasCustomerUpdateField(input)) {
      throw new LemonSqueezyError(
        "Customer update must provide at least one field.",
        "validation",
      );
    }
    if (input.name !== undefined) assertNonEmptyString("name", input.name);
    if (input.email !== undefined) assertNonEmptyString("email", input.email);
    if (input.status !== undefined && input.status !== "archived") {
      throw new LemonSqueezyError(
        "status must be archived when provided.",
        "validation",
      );
    }
    const customerId = compileResourceId("customerId", id);
    return {
      protocol: "jsonapi",
      method: "PATCH",
      path: `/v1/customers/${encodeURIComponent(customerId)}`,
      body: {
        data: {
          type: "customers",
          id: customerId,
          attributes: {
            name: input.name,
            email: input.email,
            city: input.city,
            region: input.region,
            country: input.country,
            status: input.status,
          },
        },
      },
    };
  },
  success: { kind: "jsonapi-single", resourceType: "customers" },
  evidence: [evidence.update, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, UpdateCustomerInput],
  CustomerResponse
>;

export const archiveCustomerOperation = {
  key: "customers.archive",
  compile: ([id]) => {
    const customerId = compileResourceId("customerId", id);
    return {
      protocol: "jsonapi",
      method: "PATCH",
      path: `/v1/customers/${encodeURIComponent(customerId)}`,
      body: {
        data: {
          type: "customers",
          id: customerId,
          attributes: { status: "archived" },
        },
      },
    };
  },
  success: { kind: "jsonapi-single", resourceType: "customers" },
  evidence: [evidence.update, evidence.object],
} as const satisfies OperationContract<readonly [Id], CustomerResponse>;

function assertNonEmptyString(name: string, value: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new LemonSqueezyError(
      `${name} must be a non-empty string.`,
      "validation",
    );
  }
}

function hasCustomerUpdateField(input: UpdateCustomerInput): boolean {
  return (
    input.name !== undefined ||
    input.email !== undefined ||
    input.city !== undefined ||
    input.region !== undefined ||
    input.country !== undefined ||
    input.status !== undefined
  );
}

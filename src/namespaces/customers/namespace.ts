import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import {
  archiveCustomerOperation,
  createCustomerOperation,
  getCustomerOperation,
  listCustomersOperation,
  updateCustomerOperation,
} from "./contract";
import type {
  CreateCustomerInput,
  CustomerListResponse,
  CustomerResponse,
  GetCustomerParams,
  ListCustomersParams,
  UpdateCustomerInput,
} from "./types";

export interface CustomersNamespace {
  archive(id: Id, options?: RequestOptions): Promise<CustomerResponse>;
  create(
    input: CreateCustomerInput,
    options?: RequestOptions,
  ): Promise<CustomerResponse>;
  get(
    id: Id,
    params?: GetCustomerParams,
    options?: RequestOptions,
  ): Promise<CustomerResponse>;
  list(
    params?: ListCustomersParams,
    options?: RequestOptions,
  ): Promise<CustomerListResponse>;
  update(
    id: Id,
    input: UpdateCustomerInput,
    options?: RequestOptions,
  ): Promise<CustomerResponse>;
}

export function createCustomersNamespace(
  runtime: ResourceRuntime,
): CustomersNamespace {
  return Object.freeze({
    async archive(id: Id, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [Id], CustomerResponse>(
          archiveCustomerOperation,
          [id],
          options,
        )
      ).body;
    },
    async create(input: CreateCustomerInput, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [CreateCustomerInput], CustomerResponse>(
          createCustomerOperation,
          [input],
          options,
        )
      ).body;
    },
    async get(
      id: Id,
      params: GetCustomerParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, GetCustomerParams],
          CustomerResponse
        >(getCustomerOperation, [id, params], options)
      ).body;
    },
    async list(params: ListCustomersParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [ListCustomersParams],
          CustomerListResponse
        >(listCustomersOperation, [params], options)
      ).body;
    },
    async update(id: Id, input: UpdateCustomerInput, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [Id, UpdateCustomerInput],
          CustomerResponse
        >(updateCustomerOperation, [id, input], options)
      ).body;
    },
  });
}

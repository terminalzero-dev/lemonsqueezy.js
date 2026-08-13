import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import {
  createUsageRecordOperation,
  getUsageRecordOperation,
  listUsageRecordsOperation,
} from "./contract";
import type {
  CreateUsageRecordInput,
  GetUsageRecordParams,
  ListUsageRecordsParams,
  UsageRecordListResponse,
  UsageRecordResponse,
} from "./types";

export interface UsageRecordsNamespace {
  get(
    id: Id,
    params?: GetUsageRecordParams,
    options?: RequestOptions,
  ): Promise<UsageRecordResponse>;
  list(
    params?: ListUsageRecordsParams,
    options?: RequestOptions,
  ): Promise<UsageRecordListResponse>;
  create(
    input: CreateUsageRecordInput,
    options?: RequestOptions,
  ): Promise<UsageRecordResponse>;
}

export function createUsageRecordsNamespace(
  runtime: ResourceRuntime,
): UsageRecordsNamespace {
  return Object.freeze({
    async get(
      id: Id,
      params: GetUsageRecordParams = {},
      options?: RequestOptions,
    ) {
      return (
        await runtime.invoke<
          readonly [Id, GetUsageRecordParams],
          UsageRecordResponse
        >(getUsageRecordOperation, [id, params], options)
      ).body;
    },
    async list(params: ListUsageRecordsParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [ListUsageRecordsParams],
          UsageRecordListResponse
        >(listUsageRecordsOperation, [params], options)
      ).body;
    },
    async create(input: CreateUsageRecordInput, options?: RequestOptions) {
      return (
        await runtime.invoke<
          readonly [CreateUsageRecordInput],
          UsageRecordResponse
        >(createUsageRecordOperation, [input], options)
      ).body;
    },
  });
}

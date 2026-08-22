import { invokeDefaultCompatibility } from "../internal/v5/default-client";
import {
  createUsageRecordOperation,
  getUsageRecordOperation,
  listUsageRecordsOperation,
} from "../namespaces/usage-records/contract";
import type {
  CreateUsageRecordInput,
  GetUsageRecordParams as CanonicalGetUsageRecordParams,
  ListUsageRecordsParams as CanonicalListUsageRecordsParams,
  UsageRecordListResponse,
  UsageRecordResponse,
} from "../namespaces/usage-records/types";
import type {
  GetUsageRecordParams,
  ListUsageRecords,
  ListUsageRecordsParams,
  NewUsageRecord,
  UsageRecord,
} from "./types";

/**
 * Retrieve a usage record.
 *
 * @param usageRecordId The usage record id.
 * @param [params] (Optional) Additional parameters.
 * @param [params.include] (Optional) Related resources.
 * @returns A usage record object.
 */
export function getUsageRecord(
  usageRecordId: number | string,
  params: GetUsageRecordParams = {},
) {
  return invokeDefaultCompatibility<
    readonly [number | string, CanonicalGetUsageRecordParams],
    UsageRecordResponse,
    UsageRecord
  >(getUsageRecordOperation, [usageRecordId, params]);
}

/**
 * List all usage records.
 *
 * @param [params] (Optional) Additional parameters.
 * @param [params.filter] (Optional) Filter parameters.
 * @param [params.filter.subscriptionItemId] (Optional) Only return usage records belonging to the subscription item with this ID.
 * @param [params.page] (Optional) Custom paginated queries.
 * @param [params.page.number] (Optional) The parameter determine which page to retrieve.
 * @param [params.page.size] (Optional) The parameter to determine how many results to return per page.
 * @param [params.include] (Optional) Related resources.
 * @returns A paginated list of usage record objects ordered by `created_at` (descending).
 */
export function listUsageRecords(params: ListUsageRecordsParams = {}) {
  return invokeDefaultCompatibility<
    readonly [CanonicalListUsageRecordsParams],
    UsageRecordListResponse,
    ListUsageRecords
  >(listUsageRecordsOperation, [params]);
}

/**
 * Create a usage record.
 *
 * @param usageRecord (Required) New usage record info.
 * @param usageRecord.quantity (Required) A positive integer representing the usage to be reported.
 * @param usageRecord.subscriptionItemId (Required) The subscription item this usage record belongs to.
 * @param [usageRecord.action] (Optional) The type of record. `increment` or `set`. Defaults to `increment` if omitted.
 * @returns A usage record object.
 */
export function createUsageRecord(usageRecord: NewUsageRecord) {
  const input: CreateUsageRecordInput = usageRecord;
  return invokeDefaultCompatibility<
    readonly [CreateUsageRecordInput],
    UsageRecordResponse,
    UsageRecord
  >(createUsageRecordOperation, [input]);
}

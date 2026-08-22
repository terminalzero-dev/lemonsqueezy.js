import { invokeDefaultCompatibility } from "../internal/v5/default-client";
import {
  archiveCustomerOperation,
  createCustomerOperation,
  getCustomerOperation,
  listCustomersOperation,
  updateCustomerOperation,
} from "../namespaces/customers/contract";
import type {
  CreateCustomerInput,
  CustomerListResponse,
  CustomerResponse,
  GetCustomerParams as CanonicalGetCustomerParams,
  ListCustomersParams as CanonicalListCustomersParams,
  UpdateCustomerInput,
} from "../namespaces/customers/types";
import type {
  Customer,
  GetCustomerParams,
  ListCustomers,
  ListCustomersParams,
  NewCustomer,
  UpdateCustomer,
} from "./types";

/**
 * Create a customer.
 *
 * @param storeId (Required)The Store ID.
 * @param customer (Required) The new customer information.
 * @param customer.name (Required) The name of the customer.
 * @param customer.email (Required) The email of the customer.
 * @param customer.city (Optional) The city of the customer.
 * @param customer.region (Optional) The region of the customer.
 * @param customer.country (Optional) The [ISO 3166-1](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) two-letter country code for the customer (e.g. `US`, `GB`, etc).
 * @returns A customer object.
 */
export function createCustomer(
  storeId: number | string,
  customer: NewCustomer,
) {
  return invokeDefaultCompatibility<
    readonly [CreateCustomerInput],
    CustomerResponse,
    Customer
  >(createCustomerOperation, [{ ...customer, storeId }]);
}

/**
 * Update a customer.
 *
 * @param customerId The customer id.
 * @param customer The customer information that needs to be updated.
 * @param customer.name (Optional) The name of the customer.
 * @param customer.email (Optional) The email of the customer.
 * @param customer.city (Optional) The city of the customer.
 * @param customer.region (Optional) The region of the customer.
 * @param customer.country (Optional) The [ISO 3166-1](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) two-letter country code for the customer (e.g. `US`, `GB`, etc).
 * @param customer.status (Optional) The email marketing status of the customer. Only one value: `archived`.
 * @returns A customer object.
 */
export function updateCustomer(
  customerId: string | number,
  customer: UpdateCustomer,
) {
  return invokeDefaultCompatibility<
    readonly [string | number, UpdateCustomerInput],
    CustomerResponse,
    Customer
  >(updateCustomerOperation, [customerId, customer]);
}

/**
 * Archive a customer.
 *
 * @param customerId The customer id.
 * @returns A customer object.
 */
export function archiveCustomer(customerId: string | number) {
  return invokeDefaultCompatibility<
    readonly [string | number],
    CustomerResponse,
    Customer
  >(archiveCustomerOperation, [customerId]);
}

/**
 * Retrieve a customer.
 *
 * @param customerId The given customer id.
 * @param [params] (Optional) Additional parameters.
 * @param [params.include] (Optional) Related resources.
 * @returns A customer object.
 */
export function getCustomer(
  customerId: string | number,
  params: GetCustomerParams = {},
) {
  return invokeDefaultCompatibility<
    readonly [string | number, CanonicalGetCustomerParams],
    CustomerResponse,
    Customer
  >(getCustomerOperation, [customerId, params]);
}

/**
 * List all customers.
 *
 * @param [params] (Optional) Additional parameters.
 * @param [params.filter] (Optional) Filter parameters.
 * @param [params.filter.storeId] (Optional) Only return customers belonging to the store with this ID.
 * @param [params.filter.email] (Optional) Only return customers where the email field is equal to this email address.
 * @param [params.page] (Optional) Custom paginated queries.
 * @param [params.page.number] (Optional) The parameter determine which page to retrieve.
 * @param [params.page.size] (Optional) The parameter to determine how many results to return per page.
 * @param [params.include] (Optional) Related resources.
 * @returns A paginated list of customer objects ordered by `created_at` (descending).
 */
export function listCustomers(params: ListCustomersParams = {}) {
  return invokeDefaultCompatibility<
    readonly [CanonicalListCustomersParams],
    CustomerListResponse,
    ListCustomers
  >(listCustomersOperation, [params]);
}

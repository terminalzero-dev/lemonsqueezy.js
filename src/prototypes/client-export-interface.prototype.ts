/**
 * PROTOTYPE — not production code.
 *
 * This declaration-only stub validates the selected v5 Client and export shape.
 * Resource DTOs, API bodies, request controls, and error fields remain deferred
 * to their dedicated Wayfinder tickets.
 */

export type Id = string | number;

export interface ClientOptions {
  readonly apiKey?: string;
}

export interface RequestOptions {
  /** Illustrative only; the HTTP Core ticket owns the final fields. */
  readonly signal?: AbortSignal;
}

export declare class LemonSqueezyError extends Error {}

export declare function isLemonSqueezyError(
  value: unknown
): value is LemonSqueezyError;

type ApiBody = unknown;
type Params = Readonly<Record<string, unknown>>;
type Input = Readonly<Record<string, unknown>>;

export interface ReadNamespace {
  get(
    id: Id,
    params?: Params,
    requestOptions?: RequestOptions
  ): Promise<ApiBody>;
  list(params?: Params, requestOptions?: RequestOptions): Promise<ApiBody>;
}

export interface UsersNamespace {
  getAuthenticated(requestOptions?: RequestOptions): Promise<ApiBody>;
}

export interface StoresNamespace extends ReadNamespace {}

export interface CustomersNamespace extends ReadNamespace {
  create(input: Input, requestOptions?: RequestOptions): Promise<ApiBody>;
  update(
    id: Id,
    input: Input,
    requestOptions?: RequestOptions
  ): Promise<ApiBody>;
  archive(id: Id, requestOptions?: RequestOptions): Promise<ApiBody>;
}

export interface ProductsNamespace extends ReadNamespace {}
export interface VariantsNamespace extends ReadNamespace {}
export interface PricesNamespace extends ReadNamespace {}
export interface FilesNamespace extends ReadNamespace {}

export interface OrdersNamespace extends ReadNamespace {
  generateInvoice(
    id: Id,
    params?: Params,
    requestOptions?: RequestOptions
  ): Promise<ApiBody>;
  refund(
    id: Id,
    input: Input,
    requestOptions?: RequestOptions
  ): Promise<ApiBody>;
}

export interface OrderItemsNamespace extends ReadNamespace {}

export interface SubscriptionsNamespace extends ReadNamespace {
  update(
    id: Id,
    input: Input,
    requestOptions?: RequestOptions
  ): Promise<ApiBody>;
  cancel(id: Id, requestOptions?: RequestOptions): Promise<ApiBody>;
}

export interface SubscriptionInvoicesNamespace extends ReadNamespace {
  generateInvoice(
    id: Id,
    params?: Params,
    requestOptions?: RequestOptions
  ): Promise<ApiBody>;
  refund(
    id: Id,
    input: Input,
    requestOptions?: RequestOptions
  ): Promise<ApiBody>;
}

export interface SubscriptionItemsNamespace extends ReadNamespace {
  currentUsage(id: Id, requestOptions?: RequestOptions): Promise<ApiBody>;
  update(
    id: Id,
    input: number | Input,
    requestOptions?: RequestOptions
  ): Promise<ApiBody>;
}

export interface UsageRecordsNamespace extends ReadNamespace {
  create(input: Input, requestOptions?: RequestOptions): Promise<ApiBody>;
}

export interface DiscountsNamespace extends ReadNamespace {
  create(input: Input, requestOptions?: RequestOptions): Promise<ApiBody>;
  delete(id: Id, requestOptions?: RequestOptions): Promise<void>;
}

export interface DiscountRedemptionsNamespace extends ReadNamespace {}

export interface LicenseKeysNamespace extends ReadNamespace {
  update(
    id: Id,
    input: Input,
    requestOptions?: RequestOptions
  ): Promise<ApiBody>;
}

export interface LicenseKeyInstancesNamespace extends ReadNamespace {}

export interface CheckoutsNamespace extends ReadNamespace {
  create(input: Input, requestOptions?: RequestOptions): Promise<ApiBody>;
}

export interface WebhooksNamespace extends ReadNamespace {
  create(input: Input, requestOptions?: RequestOptions): Promise<ApiBody>;
  update(
    id: Id,
    input: Input,
    requestOptions?: RequestOptions
  ): Promise<ApiBody>;
  delete(id: Id, requestOptions?: RequestOptions): Promise<void>;
}

export interface LicenseNamespace {
  activate(input: Input, requestOptions?: RequestOptions): Promise<ApiBody>;
  validate(input: Input, requestOptions?: RequestOptions): Promise<ApiBody>;
  deactivate(input: Input, requestOptions?: RequestOptions): Promise<ApiBody>;
}

export interface AffiliatesNamespace extends ReadNamespace {}

export interface LemonSqueezyClient {
  readonly users: UsersNamespace;
  readonly stores: StoresNamespace;
  readonly customers: CustomersNamespace;
  readonly products: ProductsNamespace;
  readonly variants: VariantsNamespace;
  readonly prices: PricesNamespace;
  readonly files: FilesNamespace;
  readonly orders: OrdersNamespace;
  readonly orderItems: OrderItemsNamespace;
  readonly subscriptions: SubscriptionsNamespace;
  readonly subscriptionInvoices: SubscriptionInvoicesNamespace;
  readonly subscriptionItems: SubscriptionItemsNamespace;
  readonly usageRecords: UsageRecordsNamespace;
  readonly discounts: DiscountsNamespace;
  readonly discountRedemptions: DiscountRedemptionsNamespace;
  readonly licenseKeys: LicenseKeysNamespace;
  readonly licenseKeyInstances: LicenseKeyInstancesNamespace;
  readonly checkouts: CheckoutsNamespace;
  readonly webhooks: WebhooksNamespace;
  readonly license: LicenseNamespace;
  readonly affiliates: AffiliatesNamespace;
}

export declare function createClient(
  options?: ClientOptions
): LemonSqueezyClient;

// Selected package entry points:
//   @terminalzero/lemonsqueezy         -> Client + compatibility facade
//   @terminalzero/lemonsqueezy/client  -> Client only
//   @terminalzero/lemonsqueezy/compat  -> compatibility facade only
//   @terminalzero/lemonsqueezy/types   -> public types only
//
// Intentionally absent in v5 beta:
//   default export, runtime resource subpaths, wildcard exports, internal,
//   transport, middleware, testing, raw request, and extension interfaces.

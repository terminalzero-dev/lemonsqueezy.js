import { createClientWithTransport } from "../internal/v5/client";
import type { ClientOptions } from "../internal/v5/types";
import type { UsersNamespace } from "../namespaces/users/namespace";
import type { StoresNamespace } from "../namespaces/stores/namespace";
import type { ProductsNamespace } from "../namespaces/products/namespace";
import type { VariantsNamespace } from "../namespaces/variants/namespace";
import type { PricesNamespace } from "../namespaces/prices/namespace";
import type { FilesNamespace } from "../namespaces/files/namespace";
import type { AffiliatesNamespace } from "../namespaces/affiliates/namespace";
import type { CustomersNamespace } from "../namespaces/customers/namespace";
import type { CheckoutsNamespace } from "../namespaces/checkouts/namespace";
import type { OrdersNamespace } from "../namespaces/orders/namespace";
import type { OrderItemsNamespace } from "../namespaces/order-items/namespace";
import type { SubscriptionsNamespace } from "../namespaces/subscriptions/namespace";

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
export type { StoresNamespace } from "../namespaces/stores/namespace";
export type { ProductsNamespace } from "../namespaces/products/namespace";
export type * from "../namespaces/products/types";
export type { VariantsNamespace } from "../namespaces/variants/namespace";
export type * from "../namespaces/variants/types";
export type { PricesNamespace } from "../namespaces/prices/namespace";
export type * from "../namespaces/prices/types";
export type { FilesNamespace } from "../namespaces/files/namespace";
export type * from "../namespaces/files/types";
export type { AffiliatesNamespace } from "../namespaces/affiliates/namespace";
export type * from "../namespaces/affiliates/types";
export type { CustomersNamespace } from "../namespaces/customers/namespace";
export type * from "../namespaces/customers/types";
export type { CheckoutsNamespace } from "../namespaces/checkouts/namespace";
export type * from "../namespaces/checkouts/types";
export type { OrdersNamespace } from "../namespaces/orders/namespace";
export type * from "../namespaces/orders/types";
export type { OrderItemsNamespace } from "../namespaces/order-items/namespace";
export type * from "../namespaces/order-items/types";
export type { SubscriptionsNamespace } from "../namespaces/subscriptions/namespace";
export type * from "../namespaces/subscriptions/types";
export type {
  GetStoreParams,
  ListStoresParams,
  StoreAttributes,
  StoreListResponse,
  StoreRelationships,
  StoreResource,
  StoreResponse,
} from "../namespaces/stores/types";
export type {
  UserAttributes,
  UserResource,
  UserResponse,
} from "../namespaces/users/types";

export interface LemonSqueezyClient {
  readonly users: UsersNamespace;
  readonly stores: StoresNamespace;
  readonly products: ProductsNamespace;
  readonly variants: VariantsNamespace;
  readonly prices: PricesNamespace;
  readonly files: FilesNamespace;
  readonly affiliates: AffiliatesNamespace;
  readonly customers: CustomersNamespace;
  readonly checkouts: CheckoutsNamespace;
  readonly orders: OrdersNamespace;
  readonly orderItems: OrderItemsNamespace;
  readonly subscriptions: SubscriptionsNamespace;
}

export function createClient(options: ClientOptions = {}): LemonSqueezyClient {
  return createClientWithTransport(options, (request) => fetch(request));
}

export type JSONPrimitive = string | number | boolean | null;

export type Id = string | number;

export type OpenString<Known extends string> =
  | Known
  | (string & Record<never, never>);

export type JSONValue =
  | JSONPrimitive
  | readonly JSONValue[]
  | { readonly [key: string]: JSONValue };

export interface JSONAPIResourceIdentifier<Type extends string = string> {
  readonly type: Type;
  readonly id: string;
}

export interface JSONAPIRelationship<
  Related extends
    | JSONAPIResourceIdentifier
    | readonly JSONAPIResourceIdentifier[]
    | null = JSONAPIResourceIdentifier,
> {
  readonly links: {
    readonly related: string;
    readonly self: string;
  };
  readonly data?: Related;
}

export interface JSONAPIResource<
  Type extends string,
  Attributes,
  Relationships = never,
> extends JSONAPIResourceIdentifier<Type> {
  readonly attributes: Attributes;
  readonly relationships?: Relationships;
  readonly links: { readonly self: string };
}

export interface UnknownJSONAPIResource extends JSONAPIResource<
  string,
  Readonly<Record<string, unknown>>,
  Readonly<Record<string, unknown>>
> {}

export type KnownLemonSqueezyResource =
  | import("../namespaces/users/types").UserResource
  | import("../namespaces/stores/types").StoreResource
  | import("../namespaces/products/types").ProductResource
  | import("../namespaces/variants/types").VariantResource
  | import("../namespaces/prices/types").PriceResource
  | import("../namespaces/files/types").FileResource
  | import("../namespaces/affiliates/types").AffiliateResource
  | import("../namespaces/customers/types").CustomerResource
  | import("../namespaces/checkouts/types").CheckoutResource
  | import("../namespaces/orders/types").OrderResource
  | import("../namespaces/order-items/types").OrderItemResource
  | import("../namespaces/subscriptions/types").SubscriptionResource
  | import("../namespaces/subscription-invoices/types").SubscriptionInvoiceResource
  | import("../namespaces/subscription-items/types").SubscriptionItemResource
  | import("../namespaces/usage-records/types").UsageRecordResource
  | import("../namespaces/discounts/types").DiscountResource
  | import("../namespaces/discount-redemptions/types").DiscountRedemptionResource
  | import("../namespaces/license-keys/types").LicenseKeyResource
  | import("../namespaces/license-key-instances/types").LicenseKeyInstanceResource
  | import("../namespaces/webhooks/types").WebhookResource;
export type LemonSqueezyResource =
  | KnownLemonSqueezyResource
  | UnknownJSONAPIResource;

export interface JSONAPISingleResponse<Resource> {
  readonly jsonapi: { readonly version: string };
  readonly links: { readonly self: string };
  readonly meta?: Readonly<Record<string, unknown>>;
  readonly data: Resource;
  readonly included?: readonly LemonSqueezyResource[];
}

export interface JSONAPIListLinks {
  readonly first: string;
  readonly last: string;
  readonly next?: string;
  readonly prev?: string;
}

export interface JSONAPIPageMeta {
  readonly currentPage: number;
  readonly from: number;
  readonly lastPage: number;
  readonly perPage: number;
  readonly to: number;
  readonly total: number;
}

export interface JSONAPIError {
  readonly id?: string;
  readonly links?: {
    readonly about?: string;
    readonly type?: string;
  };
  readonly status?: string;
  readonly code?: string;
  readonly title: string;
  readonly detail?: string;
  readonly source?: {
    readonly pointer?: string;
    readonly parameter?: string;
  };
  readonly meta?: Readonly<Record<string, unknown>>;
}

export interface JSONAPIListResponse<Resource> {
  readonly jsonapi: { readonly version: string };
  readonly links: JSONAPIListLinks;
  readonly meta: { readonly page: JSONAPIPageMeta };
  readonly data: readonly Resource[];
  readonly included?: readonly LemonSqueezyResource[];
}

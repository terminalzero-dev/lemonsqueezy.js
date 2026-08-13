import {
  createClient,
  getAuthenticatedUser,
  isLemonSqueezyError,
  type LemonSqueezyError,
  type User,
  type AffiliateResponse,
} from "@terminalzero/lemonsqueezy";
import type {
  AffiliateStatus,
  FileListResponse,
  FileResponse,
  JSONValue,
  ListCustomersParams,
  PriceListResponse,
  PriceResponse,
  ProductListResponse,
  ProductResponse,
  StoreListResponse,
  StoreResponse,
  UserResponse,
  VariantListResponse,
  VariantResponse,
} from "@terminalzero/lemonsqueezy/types";

type UserEnvelope =
  | {
      readonly statusCode: number;
      readonly data: User | null;
      readonly error: null;
    }
  | {
      readonly statusCode: number | null;
      readonly data: null;
      readonly error: LemonSqueezyError;
    };

const userPromise: Promise<UserEnvelope> = getAuthenticatedUser();
const client = createClient({ apiKey: "type-contract", timeoutMs: 1_000 });
const directUser: Promise<UserResponse> = client.users.getAuthenticated();
const store: Promise<StoreResponse> = client.stores.get(1);
const stores: Promise<StoreListResponse> = client.stores.list();
const product: Promise<ProductResponse> = client.products.get(
  1,
  {},
  { timeoutMs: 1_000 },
);
const products: Promise<ProductListResponse> = client.products.list();
const variant: Promise<VariantResponse> = client.variants.get(1);
const variants: Promise<VariantListResponse> = client.variants.list();
const price: Promise<PriceResponse> = client.prices.get(1);
const prices: Promise<PriceListResponse> = client.prices.list();
const file: Promise<FileResponse> = client.files.get(1);
const files: Promise<FileListResponse> = client.files.list();
const affiliate: Promise<AffiliateResponse> = client.affiliates.get(1, {
  include: ["store", "user"],
});
const affiliates = client.affiliates.list({
  filter: { storeId: 1, userEmail: "affiliate@example.com" },
  page: { number: 1, size: 10 },
});
const futureAffiliateStatus: AffiliateStatus = "reviewing";
declare const affiliateResponse: AffiliateResponse;
const affiliateProducts: JSONValue | null =
  affiliateResponse.data.attributes.products;
type AffiliateProducts =
  (typeof affiliateResponse)["data"]["attributes"]["products"];
const _user: User | undefined = undefined;
const filters: ListCustomersParams = { filter: { email: "test@example.com" } };

void userPromise;
void directUser;
void store;
void stores;
void product;
void products;
void variant;
void variants;
void price;
void prices;
void file;
void files;
void affiliate;
void affiliates;
void futureAffiliateStatus;
void affiliateProducts;
void filters;
void isLemonSqueezyError;

// @ts-expect-error users.getAuthenticated does not accept a user ID
client.users.getAuthenticated("1");
// @ts-expect-error Client namespaces are readonly
client.users = client.users;
// @ts-expect-error Affiliates is read-only and has no create operation
client.affiliates.create({});
// @ts-expect-error Affiliate includes are limited to reviewed relationships
client.affiliates.get(1, { include: ["products"] });
// @ts-expect-error Variant request status is a closed documented enum
client.variants.list({ filter: { status: "archived" } });
client.prices.get(1, {
  include: ["variant", "subscription-items", "usage-records"],
});
// @ts-expect-error Affiliate products are JSON values or null, not functions
const functionProducts: AffiliateProducts = () => undefined;
// @ts-expect-error Affiliate products are present and cannot be undefined
const undefinedProducts: AffiliateProducts = undefined;
void functionProducts;
void undefinedProducts;
// @ts-expect-error Internal contracts are not public package entries
import("@terminalzero/lemonsqueezy/namespaces/affiliates/contract");
// @ts-expect-error Compatibility facade returns an envelope, not a direct body
const directFacadeBody: Promise<UserResponse> = getAuthenticatedUser();
void directFacadeBody;

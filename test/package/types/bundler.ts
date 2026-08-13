import { lemonSqueezySetup } from "@terminalzero/lemonsqueezy/compat";
import { createClient } from "@terminalzero/lemonsqueezy/client";
import type {
  AffiliateListResponse,
  CheckoutResponse,
  CustomerResponse,
  Flatten,
  UserResponse,
} from "@terminalzero/lemonsqueezy/types";

const config = lemonSqueezySetup({ apiKey: "type-contract" });
const value: Flatten<{ value: string }> = { value: config.apiKey ?? "" };
const response: Promise<UserResponse> = createClient({
  apiKey: "type-contract",
}).users.getAuthenticated();
const affiliates: Promise<AffiliateListResponse> = createClient({
  apiKey: "type-contract",
}).affiliates.list();
const customer: Promise<CustomerResponse> = createClient({
  apiKey: "type-contract",
}).customers.archive(1);
const checkout: Promise<CheckoutResponse> = createClient({
  apiKey: "type-contract",
}).checkouts.create({
  storeId: 1,
  variantId: 2,
  checkoutData: { custom: { camelCase: "preserved" } },
});

void value;
void response;
void affiliates;
void customer;
void checkout;

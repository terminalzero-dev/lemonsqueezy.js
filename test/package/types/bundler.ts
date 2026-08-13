import { lemonSqueezySetup } from "@terminalzero/lemonsqueezy/compat";
import { createClient } from "@terminalzero/lemonsqueezy/client";
import type {
  AffiliateListResponse,
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

void value;
void response;
void affiliates;

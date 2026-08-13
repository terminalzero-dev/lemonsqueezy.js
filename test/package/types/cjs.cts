import sdk = require("@terminalzero/lemonsqueezy");
import clientEntry = require("@terminalzero/lemonsqueezy/client");
import type { LemonSqueezyError, User } from "@terminalzero/lemonsqueezy";
import type {
  ListCustomersParams,
  UserResponse,
  AffiliateResponse,
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

const userPromise: Promise<UserEnvelope> = sdk.getAuthenticatedUser();
const client = clientEntry.createClient({ apiKey: "type-contract" });
const directUser: Promise<UserResponse> = client.users.getAuthenticated();
const affiliate: Promise<AffiliateResponse> = client.affiliates.get(1);
const filters: ListCustomersParams = { filter: { storeId: 1 } };

void userPromise;
void directUser;
void affiliate;
void filters;

// @ts-expect-error internal package paths are closed
import("@terminalzero/lemonsqueezy/internal");
// @ts-expect-error Compatibility facade returns an envelope, not a direct body
const directFacadeBody: Promise<UserResponse> = sdk.getAuthenticatedUser();
void directFacadeBody;

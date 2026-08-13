import sdk = require("@terminalzero/lemonsqueezy");
import clientEntry = require("@terminalzero/lemonsqueezy/client");
import type {
  ListCustomersParams,
  UserResponse,
} from "@terminalzero/lemonsqueezy/types";

const userPromise: Promise<unknown> = sdk.getAuthenticatedUser();
const client = clientEntry.createClient({ apiKey: "type-contract" });
const directUser: Promise<UserResponse> = client.users.getAuthenticated();
const filters: ListCustomersParams = { filter: { storeId: 1 } };

void userPromise;
void directUser;
void filters;

// @ts-expect-error internal package paths are closed
import("@terminalzero/lemonsqueezy/internal");

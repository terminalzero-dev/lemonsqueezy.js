import {
  createClient,
  getAuthenticatedUser,
  isLemonSqueezyError,
  type User,
} from "@terminalzero/lemonsqueezy";
import type {
  ListCustomersParams,
  UserResponse,
} from "@terminalzero/lemonsqueezy/types";

const userPromise: Promise<unknown> = getAuthenticatedUser();
const client = createClient({ apiKey: "type-contract", timeoutMs: 1_000 });
const directUser: Promise<UserResponse> = client.users.getAuthenticated();
const _user: User | undefined = undefined;
const filters: ListCustomersParams = { filter: { email: "test@example.com" } };

void userPromise;
void directUser;
void filters;
void isLemonSqueezyError;

// @ts-expect-error users.getAuthenticated does not accept a user ID
client.users.getAuthenticated("1");
// @ts-expect-error Client namespaces are readonly
client.users = client.users;

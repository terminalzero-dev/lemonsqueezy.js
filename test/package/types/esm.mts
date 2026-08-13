import { getAuthenticatedUser, type User } from "@terminalzero/lemonsqueezy";
import type { ListCustomersParams } from "@terminalzero/lemonsqueezy/types";

const userPromise: Promise<unknown> = getAuthenticatedUser();
const _user: User | undefined = undefined;
const filters: ListCustomersParams = { filter: { email: "test@example.com" } };

void userPromise;
void filters;

import sdk = require("@terminalzero/lemonsqueezy");
import type { ListCustomersParams } from "@terminalzero/lemonsqueezy/types";

const userPromise: Promise<unknown> = sdk.getAuthenticatedUser();
const filters: ListCustomersParams = { filter: { storeId: 1 } };

void userPromise;
void filters;

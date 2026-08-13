import { lemonSqueezySetup } from "@terminalzero/lemonsqueezy/compat";
import type { Flatten } from "@terminalzero/lemonsqueezy/types";

const config = lemonSqueezySetup({ apiKey: "type-contract" });
const value: Flatten<{ value: string }> = { value: config.apiKey ?? "" };

void value;

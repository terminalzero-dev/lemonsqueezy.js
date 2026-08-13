import { CONFIG_KEY, setKV } from "../utils";
import { configureDefaultClient } from "../v5/default-client";
import type { Config } from "./types";

/**
 * Lemon squeezy setup.
 *
 * @param config The config.
 * @returns User configuration.
 */
export function lemonSqueezySetup(config: Config) {
  const { apiKey, timeoutMs, onError } = config;
  setKV(CONFIG_KEY, { apiKey, timeoutMs, onError });
  configureDefaultClient(config);
  return config;
}

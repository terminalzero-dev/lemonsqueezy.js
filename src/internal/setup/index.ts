import { configureDefaultClient } from "../v5/default-client";
import type { Config } from "./types";

/**
 * Lemon squeezy setup.
 *
 * @param config The config.
 * @returns User configuration.
 */
export function lemonSqueezySetup(config: Config) {
  configureDefaultClient(config);
  return config;
}

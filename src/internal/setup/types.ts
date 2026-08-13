export type Config = {
  /**
   * `Lemon Squeezy` API Key
   */
  apiKey?: string;
  /** Default timeout for Compatibility facade requests. */
  timeoutMs?: number;
  /**
   * Fires after a fetch response error
   *
   * @param error Error
   * @returns void
   */
  onError?: (error: Error) => void;
};

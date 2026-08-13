const requiredEnvironment = [
  "LEMON_SQUEEZY_API_KEY",
  "LEMON_SQUEEZY_STORE_ID",
  "LEMON_SQUEEZY_LICENSE_KEY",
] as const;

const missingEnvironment = requiredEnvironment.filter(
  (name) => !process.env[name],
);

if (missingEnvironment.length > 0) {
  throw new Error(
    `Test Mode integration requires: ${missingEnvironment.join(", ")}`,
  );
}

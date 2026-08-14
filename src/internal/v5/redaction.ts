const redacted = "[REDACTED]";

export function sanitizeLicenseManagementErrorDetail(value: unknown): unknown {
  return sanitizeValue(
    value,
    {
      sanitizeString: () => redacted,
      isSensitiveProperty: () => false,
    },
    new WeakMap(),
  );
}

export function sanitizeLicenseApiErrorDetail(
  value: unknown,
  secrets: readonly string[],
): unknown {
  return sanitizeValue(
    value,
    {
      sanitizeString: (string) => replaceSecrets(string, secrets),
      isSensitiveProperty: isLicenseApiSensitiveProperty,
    },
    new WeakMap(),
  );
}

export function sanitizeWebhookManagementErrorDetail(
  value: unknown,
  secrets: readonly string[],
): unknown {
  return sanitizeValue(
    value,
    {
      sanitizeString: (string) => replaceSecrets(string, secrets),
      isSensitiveProperty: (property) => property === "secret",
    },
    new WeakMap(),
  );
}

function replaceSecrets(value: string, secrets: readonly string[]): string {
  return secrets.reduce(
    (sanitized, secret) => sanitized.replaceAll(secret, redacted),
    value,
  );
}

interface SanitizationPolicy {
  readonly sanitizeString: (value: string) => string;
  readonly isSensitiveProperty: (property: string) => boolean;
}

function isLicenseApiSensitiveProperty(property: string): boolean {
  return (
    property === "license_key" ||
    property === "instance" ||
    property === "instance_id" ||
    property === "instance_name"
  );
}

function sanitizeValue(
  value: unknown,
  policy: SanitizationPolicy,
  seen: WeakMap<object, unknown>,
): unknown {
  if (typeof value === "string") return policy.sanitizeString(value);
  if (typeof value !== "object" || value === null) return value;

  const existing = seen.get(value);
  if (existing !== undefined) return existing;

  if (value instanceof Error) {
    const sanitized = new Error(policy.sanitizeString(value.message));
    seen.set(value, sanitized);
    if (value.cause !== undefined) {
      Object.defineProperty(sanitized, "cause", {
        configurable: true,
        value: sanitizeValue(value.cause, policy, seen),
      });
    }
    return sanitized;
  }

  if (Array.isArray(value)) {
    const sanitized: unknown[] = [];
    seen.set(value, sanitized);
    value.forEach((item) => sanitized.push(sanitizeValue(item, policy, seen)));
    return sanitized;
  }

  const sanitized: Record<string, unknown> = {};
  seen.set(value, sanitized);
  for (const [property, child] of Object.entries(value)) {
    sanitized[property] = policy.isSensitiveProperty(property)
      ? redacted
      : sanitizeValue(child, policy, seen);
  }
  return sanitized;
}

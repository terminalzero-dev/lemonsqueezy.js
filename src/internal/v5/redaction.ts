const redacted = "[REDACTED]";

export function sanitizeLicenseManagementErrorDetail(value: unknown): unknown {
  return sanitizeValue(value, new WeakMap());
}

export function sanitizeLicenseApiErrorDetail(
  value: unknown,
  secrets: readonly string[],
): unknown {
  return sanitizeLicenseApiValue(value, secrets, new WeakMap());
}

function sanitizeLicenseApiValue(
  value: unknown,
  secrets: readonly string[],
  seen: WeakMap<object, unknown>,
): unknown {
  if (typeof value === "string") {
    return secrets.reduce(
      (sanitized, secret) => sanitized.replaceAll(secret, redacted),
      value,
    );
  }
  if (typeof value !== "object" || value === null) return value;

  const existing = seen.get(value);
  if (existing !== undefined) return existing;

  if (value instanceof Error) {
    const sanitized = new Error(
      sanitizeLicenseApiValue(value.message, secrets, seen) as string,
    );
    seen.set(value, sanitized);
    if (value.cause !== undefined) {
      Object.defineProperty(sanitized, "cause", {
        configurable: true,
        value: sanitizeLicenseApiValue(value.cause, secrets, seen),
      });
    }
    return sanitized;
  }

  if (Array.isArray(value)) {
    const sanitized: unknown[] = [];
    seen.set(value, sanitized);
    value.forEach((item) =>
      sanitized.push(sanitizeLicenseApiValue(item, secrets, seen)),
    );
    return sanitized;
  }

  const sanitized: Record<string, unknown> = {};
  seen.set(value, sanitized);
  for (const [property, child] of Object.entries(value)) {
    sanitized[property] = isLicenseApiSensitiveProperty(property)
      ? redacted
      : sanitizeLicenseApiValue(child, secrets, seen);
  }
  return sanitized;
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
  seen: WeakMap<object, unknown>,
): unknown {
  if (typeof value === "string") return redacted;
  if (typeof value !== "object" || value === null) return value;

  const existing = seen.get(value);
  if (existing !== undefined) return existing;

  if (value instanceof Error) {
    const sanitized = new Error(redacted);
    seen.set(value, sanitized);
    if (value.cause !== undefined) {
      Object.defineProperty(sanitized, "cause", {
        configurable: true,
        value: sanitizeValue(value.cause, seen),
      });
    }
    return sanitized;
  }

  if (Array.isArray(value)) {
    const sanitized: unknown[] = [];
    seen.set(value, sanitized);
    value.forEach((item) => sanitized.push(sanitizeValue(item, seen)));
    return sanitized;
  }

  const sanitized: Record<string, unknown> = {};
  seen.set(value, sanitized);
  for (const [property, child] of Object.entries(value)) {
    sanitized[property] = sanitizeValue(child, seen);
  }
  return sanitized;
}

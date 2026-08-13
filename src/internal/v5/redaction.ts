const redacted = "[REDACTED]";

export function sanitizeLicenseManagementErrorDetail(value: unknown): unknown {
  return sanitizeValue(value, new WeakMap());
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

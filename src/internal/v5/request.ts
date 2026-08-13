import { LemonSqueezyError } from "../../client/error";
import type { Id } from "../../types/jsonapi";

export function compilePathId(name: string, value: Id): string {
  return encodeURIComponent(compileResourceId(name, value));
}

export function compileResourceId(name: string, value: Id): string {
  if (
    (typeof value === "string" && value.length > 0) ||
    (typeof value === "number" && Number.isFinite(value) && value > 0)
  ) {
    return String(value);
  }

  throw new LemonSqueezyError(
    `${name} must be a non-empty identifier.`,
    "validation",
  );
}

type QueryValue = string | number | boolean | null | undefined;

export function compileReadQuery<Filter extends object = Record<never, never>>(
  params: {
    readonly include?: readonly string[] | null;
    readonly filter?: Filter | null;
    readonly page?: {
      readonly number?: number | null;
      readonly size?: number | null;
    } | null;
  },
  filterNames: { readonly [Key in keyof Filter]?: string } = {},
): URLSearchParams | undefined {
  const query = new URLSearchParams();
  if (params.include && params.include.length > 0) {
    query.set("include", params.include.join(","));
  }
  appendPresent(query, "page[number]", params.page?.number);
  appendPresent(query, "page[size]", params.page?.size);
  if (params.filter) {
    for (const key of Object.keys(filterNames) as (keyof Filter)[]) {
      const wireName = filterNames[key];
      const value = params.filter[key] as QueryValue | readonly QueryValue[];
      if (!wireName || value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        if (value.length > 0) query.set(wireName, value.join(","));
      } else {
        query.set(wireName, String(value));
      }
    }
  }

  return query.size > 0 ? query : undefined;
}

function appendPresent(
  query: URLSearchParams,
  key: string,
  value: QueryValue,
): void {
  if (value !== undefined && value !== null) query.set(key, String(value));
}

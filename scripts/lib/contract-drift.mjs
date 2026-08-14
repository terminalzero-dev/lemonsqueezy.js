import assert from "node:assert/strict";

const enumCandidateKeys = new Set([
  "billing_reason",
  "payment_processor",
  "status",
]);

export function createContractDriftCandidate(observation) {
  assertRecord(observation, "observation");
  const resourcesByType = new Map();

  for (const response of observation.responses ?? []) {
    assertRecord(response, "response");
    const resources = Array.isArray(response.data)
      ? response.data
      : [response.data];
    for (const resource of resources)
      collectResource(resourcesByType, resource);
  }

  return {
    mode: "candidate-only",
    resources: [...resourcesByType.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([type, resource]) => ({
        type,
        attributeKeys: sorted(resource.attributeKeys),
        relationshipKeys: sorted(resource.relationshipKeys),
        openEnumCandidates: Object.fromEntries(
          [...resource.openEnumCandidates.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([name, values]) => [name, sorted(values)]),
        ),
      })),
    requests: normalizeRequests(observation.requests ?? []),
    compatibility: normalizeCompatibility(observation.compatibility ?? []),
  };
}

function collectResource(resourcesByType, resource) {
  assertRecord(resource, "response resource");
  assert.equal(
    typeof resource.type,
    "string",
    "resource.type must be a string",
  );
  assertRecord(resource.attributes, "resource.attributes");
  if (resource.relationships !== undefined) {
    assertRecord(resource.relationships, "resource.relationships");
  }

  const entry = resourcesByType.get(resource.type) ?? {
    attributeKeys: new Set(),
    relationshipKeys: new Set(),
    openEnumCandidates: new Map(),
  };
  for (const [name, value] of Object.entries(resource.attributes)) {
    entry.attributeKeys.add(name);
    if (enumCandidateKeys.has(name) || name.endsWith("_status")) {
      if (typeof value === "string") {
        const values = entry.openEnumCandidates.get(name) ?? new Set();
        values.add(value);
        entry.openEnumCandidates.set(name, values);
      }
    }
  }
  for (const name of Object.keys(resource.relationships ?? {})) {
    entry.relationshipKeys.add(name);
  }
  resourcesByType.set(resource.type, entry);
}

function normalizeRequests(requests) {
  assert.ok(Array.isArray(requests), "requests must be an array");
  return requests
    .map((request) => {
      assertRecord(request, "request observation");
      return {
        operationKey: requiredString(request.operationKey, "operationKey"),
        queryKeys: normalizedStrings(request.queryKeys, "queryKeys"),
        bodyKeys: normalizedStrings(request.bodyKeys, "bodyKeys"),
        opaqueDataPaths: normalizedStrings(
          request.opaqueDataPaths,
          "opaqueDataPaths",
        ),
      };
    })
    .sort((left, right) => left.operationKey.localeCompare(right.operationKey));
}

function normalizeCompatibility(projections) {
  assert.ok(Array.isArray(projections), "compatibility must be an array");
  return projections
    .map((projection) => {
      assertRecord(projection, "Compatibility projection");
      return {
        name: requiredString(projection.name, "name"),
        operationKey: requiredString(projection.operationKey, "operationKey"),
        projection: requiredString(projection.projection, "projection"),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function normalizedStrings(values, name) {
  assert.ok(Array.isArray(values), `${name} must be an array`);
  return sorted(values.map((value) => requiredString(value, name)));
}

function requiredString(value, name) {
  assert.equal(typeof value, "string", `${name} must contain strings`);
  assert.ok(value.length > 0, `${name} must not contain empty strings`);
  return value;
}

function sorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function assertRecord(value, name) {
  assert.ok(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${name} must be an object`,
  );
}

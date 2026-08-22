import { describe, expect, it } from "vitest";
import { createClient } from "../../src/client";
import * as compatibility from "../../src/compat";
import { webhookSubscriptionEventNames } from "../../src/namespaces/webhooks/types";
import { knownWebhookEventCatalog } from "../../src/webhook-receiver/parse-webhook-event";
import {
  contractCatalog,
  getContractCatalogIssues,
  type ContractCatalog,
} from "./contract-catalog";

const client = createClient();

function issuesFor(catalog: ContractCatalog): readonly string[] {
  return getContractCatalogIssues(catalog, client, compatibility);
}

function withCatalog(changes: Partial<ContractCatalog>): ContractCatalog {
  return { ...contractCatalog, ...changes };
}

describe("v5 structural contract catalog", () => {
  it("locks the accepted 21 namespaces, 61 Operation Contracts, and 59 Compatibility mappings", () => {
    expect(issuesFor(contractCatalog)).toEqual([]);
  });

  it.each([
    {
      name: "missing namespace",
      catalog: withCatalog({
        namespaces: contractCatalog.namespaces.slice(1),
      }),
      expected: "missing namespace: users",
    },
    {
      name: "extra namespace",
      catalog: withCatalog({
        namespaces: [
          ...contractCatalog.namespaces,
          { name: "unexpected", methods: [] },
        ],
      }),
      expected: "extra namespace: unexpected",
    },
    {
      name: "duplicate namespace",
      catalog: withCatalog({
        namespaces: [
          ...contractCatalog.namespaces,
          contractCatalog.namespaces[0]!,
        ],
      }),
      expected: "duplicate namespace: users",
    },
    {
      name: "missing Canonical method and Operation Contract key",
      catalog: withCatalog({
        namespaces: contractCatalog.namespaces.map((namespace) =>
          namespace.name === "users"
            ? { ...namespace, methods: [] }
            : namespace,
        ),
      }),
      expected: "missing Canonical method: users.getAuthenticated",
    },
    {
      name: "extra Canonical method and Operation Contract key",
      catalog: withCatalog({
        namespaces: contractCatalog.namespaces.map((namespace) =>
          namespace.name === "users"
            ? {
                ...namespace,
                methods: [
                  ...namespace.methods,
                  {
                    ...namespace.methods[0]!,
                    name: "unexpected",
                  },
                ],
              }
            : namespace,
        ),
      }),
      expected: "extra Canonical method: users.unexpected",
    },
    {
      name: "duplicate Operation Contract key",
      catalog: withCatalog({
        namespaces: contractCatalog.namespaces.map((namespace) =>
          namespace.name === "stores"
            ? {
                ...namespace,
                methods: [
                  {
                    ...namespace.methods[0]!,
                    operation:
                      contractCatalog.namespaces[0]!.methods[0]!.operation,
                  },
                  ...namespace.methods.slice(1),
                ],
              }
            : namespace,
        ),
      }),
      expected: "duplicate Operation Contract key: users.getAuthenticated",
    },
    {
      name: "Operation Contract without evidence",
      catalog: withCatalog({
        namespaces: contractCatalog.namespaces.map((namespace) =>
          namespace.name === "users"
            ? {
                ...namespace,
                methods: namespace.methods.map((method) => ({
                  ...method,
                  operation: { ...method.operation, evidence: [] },
                })),
              }
            : namespace,
        ),
      }),
      expected: "missing Operation Contract evidence: users.getAuthenticated",
    },
    {
      name: "Operation Contract without an explicit success kind",
      catalog: withCatalog({
        namespaces: contractCatalog.namespaces.map((namespace) =>
          namespace.name === "users"
            ? {
                ...namespace,
                methods: namespace.methods.map((method) => ({
                  ...method,
                  operation: { ...method.operation, success: undefined! },
                })),
              }
            : namespace,
        ),
      }),
      expected:
        "missing Operation Contract success kind: users.getAuthenticated",
    },
    {
      name: "missing Compatibility mapping",
      catalog: withCatalog({
        compatibility: contractCatalog.compatibility.slice(1),
      }),
      expected: "missing Compatibility mapping: activateLicense",
    },
    {
      name: "extra Compatibility mapping",
      catalog: withCatalog({
        compatibility: [
          ...contractCatalog.compatibility,
          {
            ...contractCatalog.compatibility[0]!,
            name: "unexpectedCompatibilityFunction",
          },
        ],
      }),
      expected: "extra Compatibility mapping: unexpectedCompatibilityFunction",
    },
    {
      name: "duplicate Compatibility name",
      catalog: withCatalog({
        compatibility: [
          ...contractCatalog.compatibility,
          contractCatalog.compatibility[0]!,
        ],
      }),
      expected: "duplicate Compatibility mapping: activateLicense",
    },
    {
      name: "duplicate Compatibility Operation Contract mapping",
      catalog: withCatalog({
        compatibility: contractCatalog.compatibility.map((mapping, index) =>
          index === 1
            ? {
                ...mapping,
                operation: contractCatalog.compatibility[0]!.operation,
              }
            : mapping,
        ),
      }),
      expected: "duplicate Compatibility Operation Contract: license.activate",
    },
    {
      name: "Compatibility mapping without parity evidence",
      catalog: withCatalog({
        compatibility: contractCatalog.compatibility.map((mapping, index) =>
          index === 0
            ? {
                ...mapping,
                parityEvidence: "test/v5/missing-parity.test.ts",
              }
            : mapping,
        ),
      }),
      expected: "missing Compatibility parity evidence: activateLicense",
    },
  ])("rejects a $name", ({ catalog, expected }) => {
    expect(issuesFor(catalog)).toContain(expected);
  });

  it("locks all known Inbound Webhook event routes", () => {
    expect(webhookSubscriptionEventNames).toHaveLength(17);
    expect(Object.keys(knownWebhookEventCatalog).sort()).toEqual(
      [...webhookSubscriptionEventNames].sort(),
    );
    expect(
      Object.values(knownWebhookEventCatalog).every(
        (resourceType) =>
          typeof resourceType === "string" && resourceType.length > 0,
      ),
    ).toBe(true);
  });
});

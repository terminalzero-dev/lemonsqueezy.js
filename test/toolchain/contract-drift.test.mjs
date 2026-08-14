import assert from "node:assert/strict";
import test from "node:test";
import { createContractDriftCandidate } from "../../scripts/lib/contract-drift.mjs";

void test("drift automation emits a review-only, secret-free candidate", () => {
  const candidate = createContractDriftCandidate({
    responses: [
      {
        data: {
          type: "orders",
          id: "sanitized",
          attributes: {
            status: "future_status",
            custom_data: { privateValue: "must-not-appear" },
          },
          relationships: { affiliate: { data: null } },
        },
      },
    ],
    requests: [
      {
        operationKey: "orders.list",
        queryKeys: ["filter[order_number]"],
        bodyKeys: [],
        opaqueDataPaths: ["checkout_data.custom"],
      },
    ],
    compatibility: [
      {
        name: "listOrders",
        operationKey: "orders.list",
        projection: "envelope",
      },
    ],
  });

  assert.equal(candidate.mode, "candidate-only");
  assert.deepEqual(candidate.resources, [
    {
      type: "orders",
      attributeKeys: ["custom_data", "status"],
      relationshipKeys: ["affiliate"],
      openEnumCandidates: { status: ["future_status"] },
    },
  ]);
  assert.deepEqual(candidate.requests[0].queryKeys, ["filter[order_number]"]);
  assert.deepEqual(candidate.requests[0].opaqueDataPaths, [
    "checkout_data.custom",
  ]);
  assert.deepEqual(candidate.compatibility[0], {
    name: "listOrders",
    operationKey: "orders.list",
    projection: "envelope",
  });
  assert.doesNotMatch(JSON.stringify(candidate), /must-not-appear/);
});

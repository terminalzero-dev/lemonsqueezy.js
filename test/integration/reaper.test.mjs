import assert from "node:assert/strict";
import { test } from "node:test";

import { collectCandidates } from "./reaper-core.mjs";

void test("the reaper stops safely at its page bound without blocking the canary", async () => {
  const requestedPages = [];
  const warnings = [];
  const list = async ({ page }) => {
    requestedPages.push(page.number);
    return {
      data:
        page.number === 1
          ? [
              {
                id: "fixture-1",
                attributes: {
                  store_id: 42,
                  test_mode: true,
                  created_at: "2026-08-13T00:00:00.000Z",
                  name: "sdk-ci-123-1",
                  code: "SDK-CI-123-1",
                },
              },
            ]
          : [],
      meta: {
        page: {
          current_page: page.number,
          from: (page.number - 1) * 100 + 1,
          last_page: 11,
          per_page: 100,
          to: page.number * 100,
          total: 1_100,
        },
      },
    };
  };

  const candidates = await collectCandidates({
    type: "discount",
    list,
    storeId: "42",
    now: Date.parse("2026-08-15T00:00:00.000Z"),
    onPageBound: (message) => warnings.push(message),
  });

  assert.deepEqual(requestedPages, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(candidates, [
    {
      type: "discount",
      id: "fixture-1",
      storeId: "42",
      createdAt: "2026-08-13T00:00:00.000Z",
      cleanupAction: "delete",
      cleanupStatus: "pending",
    },
  ]);
  assert.deepEqual(warnings, [
    "Reaper discount scan stopped at page 10 of 11 (100 per page, 1100 total); older resources require manual inspection.",
  ]);
});

void test("the reaper ignores fresh, live-mode, wrong-store, and ambiguous records", async () => {
  const base = {
    store_id: 42,
    test_mode: true,
    created_at: "2026-08-13T00:00:00.000Z",
    name: "sdk-ci-123-1",
    code: "SDK-CI-123-1",
  };
  const data = [
    { id: "wrong-store", attributes: { ...base, store_id: 7 } },
    { id: "live-mode", attributes: { ...base, test_mode: false } },
    {
      id: "fresh",
      attributes: { ...base, created_at: "2026-08-14T12:00:00.001Z" },
    },
    {
      id: "ambiguous-name",
      attributes: { ...base, name: "sdk-ci-123", code: "SDK-CI-123" },
    },
    { id: "code-mismatch", attributes: { ...base, code: "OTHER" } },
  ];
  const list = async () => ({
    data,
    meta: {
      page: {
        current_page: 1,
        from: 1,
        last_page: 1,
        per_page: 100,
        to: data.length,
        total: data.length,
      },
    },
  });

  const candidates = await collectCandidates({
    type: "discount",
    list,
    storeId: "42",
    now: Date.parse("2026-08-15T12:00:00.000Z"),
  });

  assert.deepEqual(candidates, []);
});

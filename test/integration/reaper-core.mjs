const MAX_PAGES = 10;
const MINIMUM_AGE_MS = 24 * 60 * 60 * 1_000;

export async function collectCandidates({
  type,
  list,
  storeId,
  now = Date.now(),
  onPageBound = console.warn,
}) {
  const candidates = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await list({
      filter: { storeId },
      page: { number: page, size: 100 },
    });
    for (const resource of response.data) {
      if (isReapable({ type, resource, storeId, now })) {
        candidates.push({
          type,
          id: resource.id,
          storeId,
          createdAt: resource.attributes.created_at,
          cleanupAction: "delete",
          cleanupStatus: "pending",
        });
      }
    }

    const pageMeta = response.meta.page;
    if (pageMeta.current_page >= pageMeta.last_page) return candidates;
    if (page === MAX_PAGES) {
      onPageBound(
        `Reaper ${type} scan stopped at page ${pageMeta.current_page} of ${pageMeta.last_page} (${pageMeta.per_page} per page, ${pageMeta.total} total); older resources require manual inspection.`,
      );
    }
  }

  return candidates;
}

function isReapable({ type, resource, storeId, now }) {
  const createdAt = Date.parse(resource.attributes.created_at);
  if (
    resource.attributes.store_id !== Number(storeId) ||
    resource.attributes.test_mode !== true ||
    !Number.isFinite(createdAt) ||
    now - createdAt < MINIMUM_AGE_MS
  ) {
    return false;
  }

  if (type === "discount") {
    const name = resource.attributes.name;
    return (
      isFixtureName(name) && resource.attributes.code === name.toUpperCase()
    );
  }

  const url = resource.attributes.url;
  if (typeof url !== "string") return false;
  const prefix = "https://example.com/sdk-ci/";
  return url.startsWith(prefix) && isFixtureName(url.slice(prefix.length));
}

function isFixtureName(value) {
  return (
    typeof value === "string" &&
    /^sdk-ci-[a-z0-9][a-z0-9-]{0,48}-[1-9][0-9]*$/.test(value)
  );
}

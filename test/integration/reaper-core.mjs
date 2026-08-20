const MAX_PAGES = 10;
const MINIMUM_AGE_MS = 24 * 60 * 60 * 1_000;

export async function collectCandidates({
  type,
  list,
  storeId,
  now = Date.now(),
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
    if (pageMeta.currentPage >= pageMeta.lastPage) return candidates;
    if (page === MAX_PAGES) {
      throw new Error(
        `Reaper ${type} page bound reached at page ${pageMeta.currentPage} of ${pageMeta.lastPage} (${pageMeta.perPage} per page, ${pageMeta.total} total); manual inspection required.`,
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

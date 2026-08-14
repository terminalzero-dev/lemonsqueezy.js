import assert from "node:assert/strict";

export async function registerFixture({
  journal,
  type,
  resource,
  storeId,
  persist,
}) {
  const fixture = {
    type,
    id: resource.id,
    storeId,
    createdAt:
      typeof resource.attributes.created_at === "string"
        ? resource.attributes.created_at
        : null,
    cleanupAction: "delete",
    cleanupStatus: "pending",
  };
  journal.fixtures.push(fixture);
  await persist();
  assert.equal(typeof resource.attributes.created_at, "string");
  return fixture;
}

export async function cleanupRegisteredFixtures({
  fixtures,
  cleanup,
  persist,
}) {
  const errors = [];
  for (const fixture of [...fixtures].reverse()) {
    try {
      fixture.cleanupStatus = await cleanup(fixture);
    } catch (error) {
      fixture.cleanupStatus = "failed";
      errors.push(error);
    }
    try {
      await persist();
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
}

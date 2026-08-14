import assert from "node:assert/strict";

export function resolveRulesetBypassActors(actors, identities) {
  return actors.map((actor) => {
    const resolved = structuredClone(actor);
    if (resolved.actor_id === "$releaseIdentityTeam") {
      resolved.actor_id = identities.releaseIdentityTeamId;
    }
    if (resolved.actor_id === "$releaseActionsIntegration") {
      resolved.actor_id = identities.releaseActionsIntegrationId;
    }
    return resolved;
  });
}

export function selectReleaseActionsIntegration(integration, desired, owner) {
  assert.equal(integration.id, desired.id, `${desired.slug} app id`);
  assert.equal(integration.slug, desired.slug, `${desired.slug} app slug`);
  assert.equal(
    integration.client_id,
    desired.clientId,
    `${desired.slug} client id`,
  );
  assert.equal(integration.owner.login, owner, `${desired.slug} owner`);
  assert.deepEqual(
    integration.permissions,
    desired.permissions,
    `${desired.slug} permissions`,
  );
  assert.deepEqual(
    integration.events,
    desired.events,
    `${desired.slug} events`,
  );
  return integration;
}

export function assertReleaseInstallation(
  installation,
  identity,
  repositories,
  desired,
  owner,
) {
  assert.equal(
    identity.installationId,
    desired.installationId,
    "installation id",
  );
  assert.equal(identity.appSlug, desired.slug, "installation app slug");
  assert.equal(installation.id, desired.installationId, "live installation id");
  assert.equal(installation.app_id, desired.id, "installation app id");
  assert.equal(
    installation.app_slug,
    desired.slug,
    "live installation app slug",
  );
  assert.equal(installation.account.login, owner, "installation account");
  assert.equal(installation.suspended_at, null, "installation suspended state");
  assert.equal(
    installation.repository_selection,
    desired.repositorySelection,
    "installation repository selection",
  );
  assert.deepEqual(
    installation.permissions,
    desired.permissions,
    "installation permissions",
  );
  assert.deepEqual(installation.events, desired.events, "installation events");
  assert.equal(repositories.total_count, desired.repositories.length);
  assert.deepEqual(
    repositories.repositories
      .map(({ full_name: fullName }) => fullName)
      .sort((left, right) => left.localeCompare(right)),
    [...desired.repositories].sort((left, right) => left.localeCompare(right)),
    "installation repositories",
  );
}

export function assertReleaseIdentitySecret(secrets, desired) {
  assert.ok(
    secrets.some(({ name }) => name === desired.privateKeySecret),
    `${desired.privateKeySecret} environment secret`,
  );
}

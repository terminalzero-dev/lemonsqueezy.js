import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export function resolveRulesetBypassActors(actors, identities) {
  return actors.map((actor) => {
    const resolved = structuredClone(actor);
    if (resolved.actor_id === "$releaseIdentityTeam") {
      resolved.actor_id = identities.releaseIdentityTeamId;
    }
    if (resolved.actor_id === "$releaseDeployKey") {
      resolved.actor_id = null;
    }
    return resolved;
  });
}

export function selectReleaseDeployKey(keys, desired) {
  const matches = keys.filter(({ title }) => title === desired.title);
  assert.equal(matches.length, 1, `${desired.title} deploy key count`);
  assert.equal(matches[0].read_only, false, `${desired.title} write access`);
  assert.equal(
    sshFingerprint(matches[0].key),
    desired.fingerprint,
    `${desired.title} public key fingerprint`,
  );
  assert.deepEqual(
    keys.filter(({ read_only: readOnly }) => !readOnly).map(({ id }) => id),
    [matches[0].id],
    "release deploy key must be the only writable deploy key",
  );
  return matches[0];
}

export function assertReleaseDeployKeySecret(secrets, desired) {
  assert.ok(
    secrets.some(({ name }) => name === desired.privateKeySecret),
    `${desired.privateKeySecret} environment secret`,
  );
}

function sshFingerprint(publicKey) {
  const [type, encoded] = publicKey.trim().split(/\s+/);
  assert.equal(type, "ssh-ed25519", "release deploy key type");
  assert.match(encoded ?? "", /^[A-Za-z0-9+/]+={0,2}$/);
  const digest = createHash("sha256")
    .update(Buffer.from(encoded, "base64"))
    .digest("base64")
    .replace(/=+$/, "");
  return `SHA256:${digest}`;
}

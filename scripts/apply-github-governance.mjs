import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const { values } = parseArgs({
  options: {
    repository: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
  strict: true,
});
assert.match(
  values.repository ?? "",
  /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
  "--repository must be owner/name",
);

const governance = JSON.parse(
  await readFile(`${root}/.github/governance/repository.json`, "utf8"),
);
if (values["dry-run"]) {
  console.log(JSON.stringify(governance));
  process.exit(0);
}

const repositoryPath = `repos/${values.repository}`;
const [owner, repository] = values.repository.split("/");
const releaseIdentityTeam = ensureReleaseIdentityTeam();
const releaseActionsIntegration = ensureReleaseActionsIntegration();
const existingRulesets = request("GET", `${repositoryPath}/rulesets`);
const appliedRulesetSpecifications = [];
for (const desired of governance.rulesets) {
  const specification = structuredClone(desired);
  for (const actor of specification.bypass_actors) {
    if (actor.actor_id === "$releaseIdentityTeam") {
      actor.actor_id = releaseIdentityTeam.id;
    }
    if (actor.actor_id === "$releaseActionsIntegration") {
      actor.actor_id = releaseActionsIntegration.id;
    }
  }
  const existing = existingRulesets.find(({ name }) => name === desired.name);
  const endpoint = existing
    ? `${repositoryPath}/rulesets/${existing.id}`
    : `${repositoryPath}/rulesets`;
  request(existing ? "PUT" : "POST", endpoint, specification);
  appliedRulesetSpecifications.push(specification);
}

for (const desired of governance.environments) {
  const { name: _name, branches, ...environment } = desired;
  const environmentPath = `${repositoryPath}/environments/${encodeURIComponent(desired.name)}`;
  request("PUT", environmentPath, environment);
  const policies = request(
    "GET",
    `${environmentPath}/deployment-branch-policies`,
  );
  for (const policy of policies.branch_policies) {
    if (!branches.includes(policy.name)) {
      request(
        "DELETE",
        `${environmentPath}/deployment-branch-policies/${policy.id}`,
      );
    }
  }
  for (const branch of branches) {
    if (!policies.branch_policies.some(({ name }) => name === branch)) {
      request("POST", `${environmentPath}/deployment-branch-policies`, {
        name: branch,
      });
    }
  }
}

request("PUT", `${repositoryPath}/actions/permissions`, governance.actions);
request(
  "PUT",
  `${repositoryPath}/actions/permissions/workflow`,
  governance.workflowPermissions,
);
if (governance.immutableReleases) {
  request("PUT", `${repositoryPath}/immutable-releases`);
}
const existingVariables = request(
  "GET",
  `${repositoryPath}/actions/variables?per_page=100`,
);
for (const [name, value] of Object.entries(governance.variables)) {
  const exists = existingVariables.variables.some(
    (variable) => variable.name === name,
  );
  request(
    exists ? "PATCH" : "POST",
    exists
      ? `${repositoryPath}/actions/variables/${encodeURIComponent(name)}`
      : `${repositoryPath}/actions/variables`,
    { name, value },
  );
}

const appliedRulesets = request("GET", `${repositoryPath}/rulesets`);
for (const desired of appliedRulesetSpecifications) {
  const summary = appliedRulesets.find(({ name }) => name === desired.name);
  assert.ok(summary, `${desired.name} was not applied`);
  const applied = request("GET", `${repositoryPath}/rulesets/${summary.id}`);
  for (const field of [
    "name",
    "target",
    "enforcement",
    "bypass_actors",
    "conditions",
    "rules",
  ]) {
    assertMatchesDesired(
      applied[field],
      desired[field],
      `${desired.name} ${field}`,
    );
  }
}

for (const desired of governance.environments) {
  const environmentPath = `${repositoryPath}/environments/${encodeURIComponent(desired.name)}`;
  const applied = request("GET", environmentPath);
  assert.deepEqual(
    applied.deployment_branch_policy,
    desired.deployment_branch_policy,
    `${desired.name} deployment policy`,
  );
  const policies = request(
    "GET",
    `${environmentPath}/deployment-branch-policies`,
  );
  const names = policies.branch_policies.map(({ name }) => name);
  assert.deepEqual(
    names.sort((left, right) => left.localeCompare(right)),
    [...desired.branches].sort((left, right) => left.localeCompare(right)),
    `${desired.name} branch policies`,
  );
}

const actions = request("GET", `${repositoryPath}/actions/permissions`);
assert.equal(actions.sha_pinning_required, true);
const workflowPermissions = request(
  "GET",
  `${repositoryPath}/actions/permissions/workflow`,
);
assert.equal(workflowPermissions.default_workflow_permissions, "read");
assert.equal(workflowPermissions.can_approve_pull_request_reviews, false);
const immutableReleases = request(
  "GET",
  `${repositoryPath}/immutable-releases`,
);
assert.equal(immutableReleases.enabled, governance.immutableReleases);
for (const [name, value] of Object.entries(governance.variables)) {
  const variable = request(
    "GET",
    `${repositoryPath}/actions/variables/${encodeURIComponent(name)}`,
  );
  assert.equal(variable.value, value, `${name} repository variable`);
}
console.log(`Applied and verified GitHub governance for ${values.repository}.`);

function assertMatchesDesired(actual, desired, label) {
  if (Array.isArray(desired)) {
    assert.ok(Array.isArray(actual), `${label} must be an array`);
    assert.equal(actual.length, desired.length, `${label} length`);
    for (const [index, value] of desired.entries()) {
      assertMatchesDesired(actual[index], value, `${label}[${index}]`);
    }
    return;
  }
  if (desired !== null && typeof desired === "object") {
    assert.ok(actual !== null && typeof actual === "object", `${label} object`);
    for (const [key, value] of Object.entries(desired)) {
      assertMatchesDesired(actual[key], value, `${label}.${key}`);
    }
    return;
  }
  assert.deepEqual(actual, desired, label);
}

function ensureReleaseIdentityTeam() {
  const desired = governance.releaseIdentity.team;
  const teams = request("GET", `orgs/${owner}/teams?per_page=100`);
  let team = teams.find(({ slug }) => slug === desired.slug);
  if (!team) {
    team = request("POST", `orgs/${owner}/teams`, {
      name: desired.name,
      privacy: desired.privacy,
    });
  }
  assert.equal(team.name, desired.name, "release identity team name");
  assert.equal(team.privacy, desired.privacy, "release identity team privacy");

  for (const member of desired.members) {
    request(
      "PUT",
      `orgs/${owner}/teams/${desired.slug}/memberships/${member.username}`,
      { role: member.role },
    );
    const membership = request(
      "GET",
      `orgs/${owner}/teams/${desired.slug}/memberships/${member.username}`,
    );
    assert.equal(membership.state, "active", `${member.username} team state`);
    assert.equal(membership.role, member.role, `${member.username} team role`);
  }

  request(
    "PUT",
    `orgs/${owner}/teams/${desired.slug}/repos/${owner}/${repository}`,
    { permission: desired.repository_permission },
  );
  const teamRepositories = request(
    "GET",
    `orgs/${owner}/teams/${desired.slug}/repos?per_page=100`,
  );
  const teamRepository = teamRepositories.find(
    ({ full_name: fullName }) => fullName === values.repository,
  );
  assert.ok(teamRepository, "release identity repository access");
  assert.equal(
    teamRepository.permissions[desired.repository_permission],
    true,
    "release identity repository permission",
  );
  return team;
}

function ensureReleaseActionsIntegration() {
  const desired = governance.releaseIdentity.actionsIntegration;
  const integration = request("GET", `apps/${desired.slug}`);
  assert.equal(integration.id, desired.id, "release Actions integration id");
  assert.equal(
    integration.slug,
    desired.slug,
    "release Actions integration slug",
  );
  return integration;
}

function request(method, endpoint, body) {
  const arguments_ = [
    "api",
    "--method",
    method,
    "-H",
    "Accept: application/vnd.github+json",
    "-H",
    "X-GitHub-Api-Version: 2026-03-10",
    endpoint,
  ];
  if (body !== undefined) arguments_.push("--input", "-");
  const result = spawnSync("gh", arguments_, {
    cwd: root,
    encoding: "utf8",
    input: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal(
    result.status,
    0,
    `GitHub ${method} ${endpoint} failed: ${result.stderr.trim()}`,
  );
  return result.stdout.trim() ? JSON.parse(result.stdout) : undefined;
}

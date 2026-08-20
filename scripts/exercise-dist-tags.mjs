import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    package: { type: "string" },
    "current-version": { type: "string" },
    "last-known-good-version": { type: "string" },
    registry: {
      type: "string",
      default: process.env.npm_config_registry ?? "https://registry.npmjs.org",
    },
    evidence: { type: "string" },
  },
  strict: true,
});

const [mode] = positionals;
assert.match(mode ?? "", /^(?:probe|promote|rollback)$/);
for (const name of [
  "package",
  "current-version",
  "last-known-good-version",
  "evidence",
]) {
  assert.ok(values[name]?.trim(), `Missing --${name}`);
}
assert.notEqual(values["current-version"], values["last-known-good-version"]);

const registry = new URL(
  values.registry.endsWith("/") ? values.registry : `${values.registry}/`,
);
const packagePath = encodeURIComponent(values.package);
const tagsUrl = new URL(`-/package/${packagePath}/dist-tags`, registry);
const states = [];
const timeline = [];
let registryToken;
let mutationStarted = false;
let probeInitial;

try {
  const initial = await readTags();
  states.push(recommendedTags(initial));
  if (mode === "probe") {
    probeInitial = recommendedTags(initial);
    const allowedStates = [
      {
        beta: values["last-known-good-version"],
        latest: values["last-known-good-version"],
      },
      {
        beta: values["current-version"],
        latest: values["last-known-good-version"],
      },
      {
        beta: values["current-version"],
        latest: values["current-version"],
      },
    ];
    assert.ok(
      allowedStates.some(
        (state) => JSON.stringify(state) === JSON.stringify(probeInitial),
      ),
      "recommended tags are outside the recoverable release states",
    );
    registryToken = await exchangeOidcToken();
    mutationStarted = true;
    await setTag("latest", initial.latest);
    const unchanged = await readTags();
    assertTags(unchanged, probeInitial);
    states.push(recommendedTags(unchanged));
  } else if (mode === "promote") {
    assert.equal(initial.beta, values["current-version"]);
    assert.ok(
      [values["last-known-good-version"], values["current-version"]].includes(
        initial.latest,
      ),
      "latest is neither the Last Known Good nor current verified version",
    );
    if (initial.latest !== values["current-version"]) {
      registryToken = await exchangeOidcToken();
      mutationStarted = true;
      await setTag("latest", values["current-version"]);
      const promoted = await readTags();
      assertTags(promoted, {
        beta: values["current-version"],
        latest: values["current-version"],
      });
      states.push(recommendedTags(promoted));
    }
  } else {
    assertTags(initial, {
      beta: values["current-version"],
      latest: values["current-version"],
    });
    registryToken = await exchangeOidcToken();
    mutationStarted = true;
    await setTag("latest", values["last-known-good-version"]);
    await setTag("beta", values["last-known-good-version"]);
    const rolledBack = await readTags();
    assertTags(rolledBack, {
      beta: values["last-known-good-version"],
      latest: values["last-known-good-version"],
    });
    states.push(recommendedTags(rolledBack));

    await setTag("beta", values["current-version"]);
    await setTag("latest", values["current-version"]);
    const restored = await readTags();
    assertTags(restored, {
      beta: values["current-version"],
      latest: values["current-version"],
    });
    states.push(recommendedTags(restored));
  }
} catch (error) {
  if (mutationStarted && registryToken) {
    const recoveryTags =
      mode === "probe"
        ? probeInitial
        : {
            beta: values["current-version"],
            latest: values["current-version"],
          };
    await restoreTags(recoveryTags).catch(() => {});
  }
  throw error;
}

await writeFile(
  values.evidence,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      package: values.package,
      mode,
      currentVersion: values["current-version"],
      lastKnownGoodVersion: values["last-known-good-version"],
      auth: "oidc-trusted-publishing",
      states,
      timeline,
    },
    null,
    2,
  )}\n`,
);
console.log(
  `${mode === "probe" ? "Probed" : mode === "promote" ? "Promoted" : "Rolled back and restored"} ${values.package} dist-tags.`,
);

async function exchangeOidcToken() {
  const idToken = await readIdToken();
  const response = await fetch(
    new URL(`-/npm/v1/oidc/token/exchange/package/${packagePath}`, registry),
    {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${idToken}`,
      },
    },
  );
  assert.ok(response.ok, `npm OIDC exchange returned ${response.status}`);
  const body = await response.json();
  assert.ok(body.token, "npm OIDC exchange omitted its short-lived token");
  return body.token;
}

async function readIdToken() {
  if (process.env.NPM_ID_TOKEN) return process.env.NPM_ID_TOKEN;
  assert.ok(
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL &&
      process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
    "GitHub OIDC environment is unavailable",
  );
  const url = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
  url.searchParams.set("audience", `npm:${registry.hostname}`);
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`,
    },
  });
  assert.equal(
    response.status,
    200,
    `GitHub OIDC request returned ${response.status}`,
  );
  const body = await response.json();
  assert.ok(body.value, "GitHub OIDC response omitted its ID token");
  return body.value;
}

async function readTags() {
  const response = await fetch(tagsUrl, { redirect: "error" });
  assert.equal(
    response.status,
    200,
    `npm dist-tags returned ${response.status}`,
  );
  return response.json();
}

async function setTag(tag, version) {
  const response = await fetch(new URL(`${tagsUrl.href}/${tag}`), {
    method: "PUT",
    headers: {
      authorization: `Bearer ${registryToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(version),
    redirect: "error",
  });
  assert.ok(response.ok, `npm ${tag} update returned ${response.status}`);
  timeline.push({ tag, version, at: new Date().toISOString() });
}

async function restoreTags(tags) {
  await setTag("beta", tags.beta);
  await setTag("latest", tags.latest);
  const restored = await readTags();
  assertTags(restored, tags);
}

function recommendedTags(tags) {
  return { beta: tags.beta, latest: tags.latest };
}

function assertTags(actual, expected) {
  assert.deepEqual(recommendedTags(actual), expected);
}

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../..", import.meta.url));
const artifactDirectory = join(root, ".artifacts/package");

export async function readCanonicalArtifact() {
  const identity = JSON.parse(
    await readFile(join(artifactDirectory, "artifact.json"), "utf8"),
  );
  const tarball = resolve(artifactDirectory, identity.file);

  assert.equal(
    tarball.startsWith(`${artifactDirectory}/`),
    true,
    "artifact path escapes its directory",
  );

  const sha256 = createHash("sha256")
    .update(await readFile(tarball))
    .digest("hex");
  assert.equal(sha256, identity.sha256, "canonical artifact digest changed");

  return { ...identity, tarball };
}

export function run(command, arguments_, options = {}) {
  const result = spawnSync(command, arguments_, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    stdio: "inherit",
    env: options.env ?? process.env,
  });

  assert.equal(
    result.status,
    0,
    `${command} ${arguments_.join(" ")} failed with ${result.status}`,
  );
}

export async function prepareConsumer(name) {
  const artifact = await readCanonicalArtifact();
  const consumerDirectory = join(root, `.artifacts/consumers/${name}`);
  const fixtureDirectory = join(root, "test/package");

  await rm(consumerDirectory, { recursive: true, force: true });
  await mkdir(consumerDirectory, { recursive: true });
  await cp(fixtureDirectory, consumerDirectory, { recursive: true });
  await writeFile(
    join(consumerDirectory, "package.json"),
    `${JSON.stringify(
      {
        name: `@terminalzero/${name}`,
        private: true,
        type: "module",
        dependencies: {
          "@terminalzero/lemonsqueezy": `file:${artifact.tarball}`,
        },
      },
      null,
      2,
    )}\n`,
  );

  run(
    "corepack",
    ["pnpm", "install", "--ignore-workspace", "--lockfile-only"],
    {
      cwd: consumerDirectory,
    },
  );
  run(
    "corepack",
    ["pnpm", "install", "--ignore-workspace", "--frozen-lockfile"],
    {
      cwd: consumerDirectory,
    },
  );

  const installedPackage = await realpath(
    join(consumerDirectory, "node_modules/@terminalzero/lemonsqueezy"),
  );
  assert.equal(
    installedPackage.startsWith(join(consumerDirectory, "node_modules")),
    true,
    "consumer resolved a workspace package instead of the tarball",
  );

  return { artifact, consumerDirectory, installedPackage };
}

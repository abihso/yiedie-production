import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const script = fileURLToPath(new URL("../scripts/publish-frontend.sh", import.meta.url));

test("publishes uploaded assets and HTML while preserving assets for existing pages", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "yiedie-publish-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const staging = join(root, "upload");
  const destination = join(root, "dist");
  await mkdir(join(staging, "assets"), { recursive: true });
  await mkdir(join(destination, "assets"), { recursive: true });
  await writeFile(join(destination, "index.html"), "old page");
  await writeFile(join(destination, "assets/old.js"), "old script");
  await writeFile(join(staging, "index.html"), "new page");
  await writeFile(join(staging, "assets/new.js"), "new script");
  await writeFile(join(staging, "favicon.svg"), "new icon");

  const result = spawnSync("bash", [script, staging, destination], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(join(destination, "index.html"), "utf8"), "new page");
  assert.equal(await readFile(join(destination, "assets/new.js"), "utf8"), "new script");
  assert.equal(await readFile(join(destination, "assets/old.js"), "utf8"), "old script");
  assert.equal(await readFile(join(destination, "favicon.svg"), "utf8"), "new icon");
  await assert.rejects(access(staging), { code: "ENOENT" });
});

test("a missing build or failed asset copy does not replace the served HTML", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "yiedie-publish-failure-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const staging = join(root, "upload");
  const destination = join(root, "dist");
  await mkdir(staging);
  await mkdir(destination);
  await writeFile(join(destination, "index.html"), "old page");
  let result = spawnSync("bash", [script, staging, destination]);
  assert.notEqual(result.status, 0);
  assert.equal(await readFile(join(destination, "index.html"), "utf8"), "old page");

  await mkdir(join(staging, "assets"));
  await writeFile(join(staging, "index.html"), "new page");
  await writeFile(join(staging, "assets/new.js"), "new script");
  // A file where a directory is needed makes asset publication fail.
  await writeFile(join(destination, "assets"), "not a directory");
  result = spawnSync("bash", [script, staging, destination]);
  assert.notEqual(result.status, 0);
  assert.equal(await readFile(join(destination, "index.html"), "utf8"), "old page");
  await access(staging);

  result = spawnSync("bash", [script, staging, staging]);
  assert.notEqual(result.status, 0);
  assert.equal(await readFile(join(staging, "index.html"), "utf8"), "new page");
});

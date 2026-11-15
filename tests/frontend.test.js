import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import request from "supertest";
import { frontendRoutes } from "../src/frontend.js";
import { errorHandler } from "../src/lib/errors.js";

test("a missing frontend build reports a deployment error while the API remains available", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "yiedie-missing-frontend-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const app = express();
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.use(frontendRoutes(directory));
  app.use(errorHandler);

  for (const path of ["/", "/home"]) {
    const response = await request(app).get(path).expect(503);
    assert.equal(response.body.error.code, "FRONTEND_NOT_BUILT");
  }
  await request(app).get("/api/health").expect(200, { status: "ok" });
});

test("serves frontend assets and browser routes without swallowing backend paths", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "yiedie-frontend-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const html = '<!doctype html><html><div id="root"></div></html>';
  await mkdir(join(directory, "assets"));
  await writeFile(join(directory, "index.html"), html);
  await writeFile(join(directory, "assets/app.js"), 'console.log("frontend");');
  const app = express();
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.use(frontendRoutes(directory));
  app.use((req, res) => res.status(404).json({ error: "not found" }));

  for (const path of ["/", "/home", "/register", "/dashboard/messages", "/profile?tab=settings"]) {
    const response = await request(app).get(path).set("Accept", "text/html").expect(200);
    assert.equal(response.text, html);
    assert.equal(response.headers["cache-control"], "no-cache");
  }
  await request(app).head("/home").expect(200).expect("Content-Type", /html/);
  await request(app).get("/assets/app.js").expect(200).expect("Content-Type", /javascript/);
  await request(app).get("/api/health").expect(200, { status: "ok" });

  for (const path of ["/api", "/api/missing", "/API/missing", "/uploads/missing.png", "/socket.io/missing", "/demo/missing", "/assets/missing.js", "/favicon.ico"]) {
    await request(app).get(path).set("Accept", "text/html").expect(404, { error: "not found" });
  }
  await request(app).get("/home").set("Accept", "application/json").expect(404);
  await request(app).post("/home").expect(404);
});

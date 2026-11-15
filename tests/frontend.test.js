import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import request from "supertest";
import session from "express-session";
import { createApplication } from "../src/app.js";
import { readConfig } from "../src/config.js";
import { frontendRoutes } from "../src/frontend.js";
import { errorHandler } from "../src/lib/errors.js";

test("frontend styles and scripts load when the page origin is absent from the API allowlist", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "yiedie-frontend-origin-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, "assets"));
  await writeFile(join(directory, "index.html"), '<!doctype html><div id="root"></div>');
  await writeFile(join(directory, "assets/app.css"), "body { color: black; }");
  await writeFile(join(directory, "assets/app.js"), 'console.log("frontend");');
  const store = new session.MemoryStore();
  const { app, io } = createApplication({
    pool: { query() { throw new Error("Static requests must not query the database"); } },
    config: readConfig({
      NODE_ENV: "test",
      SESSION_SECRET: "frontend-origin-test-only",
      CLIENT_ORIGINS: "https://yiedie.com",
    }),
    sessionStore: store,
    frontendDirectory: directory,
  });
  t.after(async () => {
    await new Promise((resolve) => io.close(resolve));
    store.clear();
  });

  for (const [path, type] of [["/", /html/], ["/assets/app.css", /text\/css/], ["/assets/app.js", /javascript/]]) {
    await request(app).get(path).set("Origin", "https://altbittek.com")
      .expect(200).expect("Content-Type", type);
  }
  const denied = await request(app).get("/api/health")
    .set("Origin", "https://altbittek.com").expect(403);
  assert.equal(denied.body.error.code, "ORIGIN_DENIED");
  await request(app).get("/api/health").set("Origin", "https://yiedie.com")
    .expect(200).expect("Access-Control-Allow-Origin", "https://yiedie.com");
});

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

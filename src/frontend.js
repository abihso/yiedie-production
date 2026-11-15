import express from "express";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDirectory = fileURLToPath(
  new URL("../windows-yeidie-froned-main/dist/", import.meta.url),
);

export function frontendRoutes(directory = frontendDirectory) {
  const router = express.Router();
  // Missing backend resources must never return the frontend HTML.
  router.use((req, res, next) => {
    if (/^\/(api|uploads|socket\.io|demo)(\/|$)/i.test(req.path)) {
      return next("router");
    }
    next();
  });
  router.use(express.static(directory, { index: false }));
  router.get("/{*path}", (req, res, next) => {
    if (extname(req.path) || !req.accepts("html")) return next();
    res.sendFile(join(directory, "index.html"), {
      headers: { "Cache-Control": "no-cache" },
    }, (error) => {
      if (error) next(error);
    });
  });
  return router;
}

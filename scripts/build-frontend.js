import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "build"],
  {
    cwd: fileURLToPath(new URL("../windows-yeidie-froned-main/", import.meta.url)),
    // The bundled frontend always calls the backend serving it, even when the
    // frontend's .env contains an API URL for a separate deployment.
    env: { ...process.env, VITE_API_URL: "/api" },
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;

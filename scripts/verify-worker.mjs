import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const wranglerLogPath = join(tmpdir(), "immortal-claw-wrangler-logs");
mkdirSync(wranglerLogPath, { recursive: true });

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(
  npmCommand,
  ["run", "deploy", "--workspace", "@immortal-claw/runtime-worker", "--", "--dry-run"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      WRANGLER_LOG_PATH: wranglerLogPath,
    },
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

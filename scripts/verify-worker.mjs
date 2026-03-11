import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const wranglerLogPath = join(tmpdir(), "immortal-claw-wrangler-logs");
mkdirSync(wranglerLogPath, { recursive: true });

const command =
  process.platform === "win32"
    ? ["cmd.exe", "/c", "npm", "run", "deploy", "--workspace", "@immortal-claw/runtime-worker", "--", "--dry-run"]
    : ["npm", "run", "deploy", "--workspace", "@immortal-claw/runtime-worker", "--", "--dry-run"];

const [file, ...args] = command;
const result = spawnSync(file, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    WRANGLER_LOG_PATH: wranglerLogPath,
  },
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

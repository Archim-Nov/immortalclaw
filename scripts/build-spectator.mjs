import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "apps", "spectator");
const destDir = path.join(root, "dist", "spectator");
const files = ["index.html", "styles.css", "app.js", "jiuzhou-ink-wash.png"];

await rm(destDir, { recursive: true, force: true });
await mkdir(destDir, { recursive: true });

for (const name of files) {
  await cp(path.join(sourceDir, name), path.join(destDir, name));
}

console.log(`built spectator site at ${destDir}`);

import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowPath = path.join(repoRoot, ".github", "workflows", "github-deployments.yml");
const readmePath = path.join(repoRoot, "README.md");
const deploymentSpecPath = path.join(
  repoRoot,
  "docs",
  "specs",
  "deployment-platform",
  "spec.md",
);

function readDocument(documentPath: string): string {
  assert.equal(existsSync(documentPath), true, `expected document at ${documentPath}`);
  return readFileSync(documentPath, "utf8");
}

test("the removed cloudflare deployment workflow stays out of the repo", () => {
  // Runtime moved to the VPS. The old Pages workflow was deleted and should not return.
  assert.equal(existsSync(workflowPath), false);
});

test("deployment docs explain github preview and production mirroring", () => {
  const readme = readDocument(readmePath);
  const deploymentSpec = readDocument(deploymentSpecPath);

  assert.match(readme, /CLOUDFLARE_PAGES_PRODUCTION_URL/);
  assert.match(readme, /GitHub Deployments/i);
  assert.match(readme, /Preview/);
  assert.match(readme, /Production/);
  assert.match(readme, /inactive/i);

  assert.match(deploymentSpec, /GitHub Deployments/i);
  assert.match(deploymentSpec, /CLOUDFLARE_PAGES_PRODUCTION_URL/);
  assert.match(deploymentSpec, /Preview/);
  assert.match(deploymentSpec, /Production/);
  assert.match(deploymentSpec, /inactive/i);
});

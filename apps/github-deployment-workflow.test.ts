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

function readWorkflow(): string {
  assert.equal(existsSync(workflowPath), true, `expected workflow at ${workflowPath}`);
  return readFileSync(workflowPath, "utf8");
}

function readDocument(documentPath: string): string {
  assert.equal(existsSync(documentPath), true, `expected document at ${documentPath}`);
  return readFileSync(documentPath, "utf8");
}

test("github deployments workflow exists", () => {
  assert.equal(existsSync(workflowPath), true);
});

test("github deployments workflow triggers on pull requests and master pushes", () => {
  const workflow = readWorkflow();

  assert.match(workflow, /^on:\n/m);
  assert.match(workflow, /pull_request:\n/);
  assert.match(workflow, /- closed\n/);
  assert.match(workflow, /push:\n(?:.*\n)*?\s+branches:\n(?:.*\n)*?\s+- master\n/);
});

test("github deployments workflow records preview and production environments", () => {
  const workflow = readWorkflow();

  assert.match(workflow, /deployments:\s+write/);
  assert.match(workflow, /checks:\s+read/);
  assert.match(workflow, /contents:\s+read/);
  assert.match(workflow, /Cloudflare Pages/);
  assert.match(workflow, /record-deployment\.mjs/);
  assert.match(workflow, /deactivate-preview-deployments\.mjs/);
  assert.match(workflow, /DEPLOYMENT_ENVIRONMENT:\s*"Preview"/);
  assert.match(workflow, /DEPLOYMENT_ENVIRONMENT:\s*"Production"/);
  assert.match(workflow, /CLOUDFLARE_PAGES_PRODUCTION_URL/);
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

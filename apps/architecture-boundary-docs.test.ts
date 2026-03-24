import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readmePath = path.join(repoRoot, "README.md");
const legacyApiPath = path.join(repoRoot, "apps", "world-api");
const legacyWorkerPath = path.join(repoRoot, "apps", "world-worker");
const worldDoSourcePath = path.join(repoRoot, "apps", "world-do", "src");

function readDocument(documentPath: string): string {
  assert.equal(existsSync(documentPath), true, `expected document at ${documentPath}`);
  return readFileSync(documentPath, "utf8").replace(/\r\n/g, "\n");
}

test("README defines one official production runtime path and fences legacy harnesses", () => {
  const readme = readDocument(readmePath);

  assert.match(readme, /official production runtime path/i);
  assert.match(
    readme,
    /apps\/web -> apps\/runtime-worker -> apps\/world-do -> packages\/application -> packages\/persistence -> packages\/domain/i,
  );
  assert.match(readme, /deleted legacy apps?/i);
  assert.match(readme, /not part of the product architecture/i);
  assert.doesNotMatch(readme, /Legacy SQLite Harnesses/i);
});

test("legacy world api and worker directories are deleted", () => {
  assert.equal(existsSync(legacyApiPath), false, `expected ${legacyApiPath} to be deleted`);
  assert.equal(existsSync(legacyWorkerPath), false, `expected ${legacyWorkerPath} to be deleted`);
});

test("world-do consumes shared code through workspace package imports", () => {
  const sourceFiles = ["env.ts", "index.ts", "routes.ts", "routes.test.ts", "test-helpers.ts"];

  for (const fileName of sourceFiles) {
    const contents = readDocument(path.join(worldDoSourcePath, fileName));
    assert.doesNotMatch(
      contents,
      /\.\.\/\.\.\/\.\.\/packages\//,
      `expected ${fileName} to use workspace package imports instead of deep relative imports`,
    );
  }
});

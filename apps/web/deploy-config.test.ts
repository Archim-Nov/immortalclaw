import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function normalizePath(filePath: string | undefined) {
  return filePath?.replace(/\\/g, "/");
}

function copyDirectory(source: string, destination: string) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
      continue;
    }

    fs.copyFileSync(sourcePath, destinationPath);
  }
}

test("web app config stays buildable when packaged as a standalone app", () => {
  const sourceRoot = path.resolve(import.meta.dirname);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "immortal-claw-web-config-"));
  const standaloneRoot = path.join(tempRoot, "web");

  copyDirectory(path.join(sourceRoot, "app"), path.join(standaloneRoot, "app"));
  copyDirectory(path.join(sourceRoot, "lib"), path.join(standaloneRoot, "lib"));
  fs.copyFileSync(path.join(sourceRoot, "tsconfig.json"), path.join(standaloneRoot, "tsconfig.json"));

  const configPath = path.join(standaloneRoot, "tsconfig.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.ifError(configFile.error);

  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, standaloneRoot);
  assert.equal(parsedConfig.errors.length, 0, ts.formatDiagnosticsWithColorAndContext(parsedConfig.errors, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => standaloneRoot,
    getNewLine: () => "\n",
  }));

  const pagePath = path.join(standaloneRoot, "app", "page.tsx");
  const pageResolution = ts.resolveModuleName("../lib/env", pagePath, parsedConfig.options, ts.sys);
  assert.equal(
    normalizePath(pageResolution.resolvedModule?.resolvedFileName),
    normalizePath(path.join(standaloneRoot, "lib", "env.ts")),
  );

  const routePath = path.join(standaloneRoot, "app", "api", "runtime-proxy", "[...path]", "route.ts");
  const routeResolution = ts.resolveModuleName(
    "../../../../lib/runtime-client",
    routePath,
    parsedConfig.options,
    ts.sys,
  );
  assert.equal(
    normalizePath(routeResolution.resolvedModule?.resolvedFileName),
    normalizePath(path.join(standaloneRoot, "lib", "runtime-client.ts")),
  );
});

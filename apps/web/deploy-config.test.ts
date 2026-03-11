import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";
import rootPackage from "../../package.json" with { type: "json" };
import webPackage from "./package.json" with { type: "json" };

function normalizePath(filePath: string | undefined) {
  return filePath?.replace(/\\/g, "/").replace(/\/$/, "");
}

function formatDiagnostics(diagnostics: readonly ts.Diagnostic[], currentDirectory: string) {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => currentDirectory,
    getNewLine: () => "\n",
  });
}

test("web app vite config stays buildable for the pages workspace", async () => {
  const sourceRoot = path.resolve(import.meta.dirname);
  const tsConfigPath = path.join(sourceRoot, "tsconfig.json");
  const configPath = path.join(sourceRoot, "vite.config.ts");
  const indexHtmlPath = path.join(sourceRoot, "index.html");

  const tsConfigFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
  assert.ifError(tsConfigFile.error);

  const parsedConfig = ts.parseJsonConfigFileContent(tsConfigFile.config, ts.sys, sourceRoot);
  assert.equal(
    parsedConfig.errors.length,
    0,
    formatDiagnostics(parsedConfig.errors, sourceRoot),
  );

  const program = ts.createProgram([configPath], {
    ...parsedConfig.options,
    incremental: false,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, formatDiagnostics(diagnostics, sourceRoot));

  const viteConfigModule = await import(pathToFileURL(configPath).href);
  const viteConfig = "default" in viteConfigModule ? viteConfigModule.default : viteConfigModule;
  assert.equal(normalizePath(viteConfig.root), normalizePath(sourceRoot));
  assert.equal(viteConfig.build?.outDir, "dist");

  const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");
  assert.match(indexHtml, /src\/main\.tsx/);

  const entryMatch = indexHtml.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/);
  assert.ok(entryMatch);
  const entryPath = path.resolve(sourceRoot, entryMatch[1].replace(/^\//, ""));
  assert.equal(
    normalizePath(entryPath),
    normalizePath(path.join(sourceRoot, "src", "main.tsx")),
  );
});

test("web workspace scripts keep explicit typechecking in both pages and root build paths", () => {
  assert.equal(webPackage.scripts.typecheck, "tsc --noEmit --incremental false");
  assert.match(webPackage.scripts.build, /^npm run typecheck && vite build$/);
  assert.equal(rootPackage.scripts["build:web"], "npm run build --workspace @immortal-claw/web");
});

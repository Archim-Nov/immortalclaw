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
  const routesPath = path.join(sourceRoot, "public", "_routes.json");
  const publicDocs = [
    path.join(sourceRoot, "public", "skill.md"),
    path.join(sourceRoot, "public", "register.md"),
    path.join(sourceRoot, "public", "heartbeat.md"),
    path.join(sourceRoot, "public", "agent-templates", "catalog.json"),
    path.join(sourceRoot, "public", "agent-templates", "progress-summary.html"),
    path.join(sourceRoot, "public", "agent-templates", "act-result.html"),
    path.join(sourceRoot, "public", "agent-templates", "dungeon-wake.html"),
    path.join(sourceRoot, "public", "agent-templates", "gift-notice.html"),
  ];
  const redirectsPath = path.join(sourceRoot, "public", "_redirects");
  const proxyFiles = [
    path.join(sourceRoot, "functions", "_runtime-proxy.js"),
    path.join(sourceRoot, "functions", "[[path]].js"),
    path.join(sourceRoot, "functions", "health.js"),
    path.join(sourceRoot, "functions", "agent", "[[route]].js"),
    path.join(sourceRoot, "functions", "cultivator", "[[route]].js"),
    path.join(sourceRoot, "functions", "world", "[[route]].js"),
  ];

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
  assert.match(indexHtml, /openclaw-skill-url/);
  assert.match(indexHtml, /\/skill\.md/);

  const entryMatch = indexHtml.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/);
  assert.ok(entryMatch);
  const entryPath = path.resolve(sourceRoot, entryMatch[1].replace(/^\//, ""));
  assert.equal(
    normalizePath(entryPath),
    normalizePath(path.join(sourceRoot, "src", "main.tsx")),
  );

  const routes = JSON.parse(fs.readFileSync(routesPath, "utf8")) as {
    include?: string[];
  };
  assert.deepEqual(routes.include, [
    "/health",
    "/agent/*",
    "/cultivator/*",
    "/world/*",
  ]);

  for (const publicDoc of publicDocs) {
    assert.equal(fs.existsSync(publicDoc), true, `expected public markdown at ${publicDoc}`);
  }

  assert.equal(fs.existsSync(redirectsPath), true, `expected SPA redirects file at ${redirectsPath}`);
  const redirects = fs.readFileSync(redirectsPath, "utf8");
  assert.match(redirects, /^\/health\s+\/health\s+200/m);
  assert.match(redirects, /^\/agent\/\*\s+\/agent\/:splat\s+200/m);
  assert.match(redirects, /^\/cultivator\/\*\s+\/cultivator\/:splat\s+200/m);
  assert.match(redirects, /^\/world\/\*\s+\/world\/:splat\s+200/m);
  assert.match(redirects, /^\/\*\s+\/index\.html\s+200/m);

  for (const proxyFile of proxyFiles) {
    assert.equal(fs.existsSync(proxyFile), true, `expected proxy file at ${proxyFile}`);
  }
});

test("web workspace scripts keep explicit typechecking in both pages and root build paths", () => {
  assert.equal(webPackage.scripts.typecheck, "tsc --noEmit --incremental false");
  assert.match(webPackage.scripts.build, /^npm run typecheck && vite build$/);
  assert.equal(rootPackage.scripts["build:web"], "npm run build --workspace @immortal-claw/web");
});

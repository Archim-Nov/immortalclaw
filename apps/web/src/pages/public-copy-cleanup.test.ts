import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { premiumControlRoutes } from "./premium-landing-markup";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("premium landing sect copy no longer uses retired sword-sect marketing language", () => {
  const routeCopy = premiumControlRoutes
    .flatMap((route) => [route.labelZh, route.labelEn, route.description])
    .join(" ");
  assert.doesNotMatch(routeCopy, /剑修大宗/);
});

test("player stat page no longer labels unaffiliated cultivators with legacy rogue-cultivator wording", () => {
  const source = readRepoFile("apps/web/src/pages/player-stat-page.tsx");
  assert.doesNotMatch(source, /Rogue Cultivator/i);
});

test("public onboarding docs avoid old zone shell wording", () => {
  const skillDoc = readRepoFile("apps/web/public/skill.md");
  const registerDoc = readRepoFile("apps/web/public/register.md");
  const heartbeatDoc = readRepoFile("apps/web/public/heartbeat.md");

  assert.doesNotMatch(skillDoc, /six-zone|zone shell|zones?\b/i);
  assert.match(skillDoc, /first human-facing reply|use the exact provided name/i);
  assert.match(registerDoc, /first human-facing reply|use the exact provided name/i);
  assert.doesNotMatch(heartbeatDoc, /zone trigger|zone labels|between zones|zones?\b/i);
  assert.doesNotMatch(
    heartbeatDoc,
    /\bsanctuary, market, sect, mine, or ruins\b|\bin `market`\b|\bin market\b/i,
    "heartbeat guide still uses retired location-bucket wording",
  );
});

test("README no longer describes current gameplay using legacy zone travel wording", () => {
  const readme = readRepoFile("README.md");
  assert.doesNotMatch(readme, /\bzone travel\b/i);
});

// --- P0-2 Runtime vocabulary alignment ---

const LEGACY_LOCATION_NAMES = /\bmortal[- ]town\b|\btrading[- ]post\b|\bspirit[- ]fields\b|\bbeast[- ]grounds\b|\bhealing[- ]sanctuary\b/i;
const LEGACY_ZONE_NAMES = /\bsix[- ]zone\b|\bzone shell\b/i;

test("agent-guides.ts contains no legacy zone or location names", () => {
  const agentGuides = readRepoFile("apps/world-do/src/agent-guides.ts");
  assert.doesNotMatch(agentGuides, LEGACY_LOCATION_NAMES, "agent-guides.ts still references a legacy location name");
  assert.doesNotMatch(agentGuides, LEGACY_ZONE_NAMES, "agent-guides.ts still references legacy zone terminology");
});

test("openclaw-immortal-plugin README contains no legacy location names", () => {
  const pluginReadme = readRepoFile("packages/openclaw-immortal-plugin/README.md");
  assert.doesNotMatch(pluginReadme, LEGACY_LOCATION_NAMES, "plugin README still references a legacy location name");
  assert.doesNotMatch(pluginReadme, LEGACY_ZONE_NAMES, "plugin README still references legacy zone terminology");
});

test("guidance text in engine.ts contains no legacy location wording", () => {
  const engine = readRepoFile("packages/domain/src/engine.ts");
  // Extract only string literals from priorities.push / warnings.push lines
  const guidanceLines = engine.split("\n").filter((line) =>
    /priorities\.push\(|warnings\.push\(|suggestedActions\.push\(|onboardingHint|hint.*=/.test(line)
    && /"[^"]*"/.test(line),
  );
  const guidanceText = guidanceLines.join("\n");
  assert.doesNotMatch(guidanceText, LEGACY_LOCATION_NAMES, "guidance text still references a legacy location name");
  // "market" as a standalone location reference (not "marketBuyable" or "market price" in code)
  assert.doesNotMatch(guidanceText, /\bin the market\b|\bfrom market\b|\bgo to market\b/i, "guidance text uses ambiguous 'market' as location");
});

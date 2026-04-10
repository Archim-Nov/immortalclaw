import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { premiumLandingMarkup } from "./premium-landing-markup";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("premium landing sect copy no longer uses retired sword-sect marketing language", () => {
  assert.doesNotMatch(premiumLandingMarkup, /剑修大宗/);
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
});

test("README no longer describes current gameplay using legacy zone travel wording", () => {
  const readme = readRepoFile("README.md");
  assert.doesNotMatch(readme, /\bzone travel\b/i);
});

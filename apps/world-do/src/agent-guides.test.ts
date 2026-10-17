import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { renderHeartbeatMarkdown, renderSkillMarkdown } from "./agent-guides.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const POST_SPIRIT_ACTION_IDS = [
  "raise-void-altar",
  "begin-void-seal",
  "seal-void-seal",
  "break-void-array",
  "hold-unity-rite",
  "begin-twin-lamp",
  "seal-twin-lamp",
  "join-heaven-token",
  "face-heaven-pillar",
  "hold-mahayana-platform",
  "begin-wind-crossing",
  "seal-wind-crossing",
];

test("runtime skill guide includes the realms above 化神", () => {
  const skill = renderSkillMarkdown("http://example");
  const heartbeat = renderHeartbeatMarkdown("http://example");
  const publicSkill = readFileSync(path.join(repoRoot, "apps/web/public/skill.md"), "utf8");

  assert.match(skill, /Realm tiers are: 炼气 \(stages 1-3\), 筑基 \(stages 4-6\), 金丹 \(stages 7-9\), 元婴 \(stages 10-12\), 化神 \(stages 13-15\), 炼虚 \(stages 16-18\), 合体 \(stages 19-21\), 大乘 \(stages 22-24\)/);
  assert.match(skill, /Join the sect in 凉州 or 雷州 and gather the spirit vein/);
  assert.match(skill, /From 化神后期 the gather adds one extra piece/);
  assert.match(skill, /大乘后期 has no next step/);

  const arts =
    "Weapon arts and spirit manuals continue through 炼虚, 合体, and 大乘, and open only when the realm and the equipped weapon tier or learned manual tier both reach that step. From 大圆满 on, including 炼虚, 合体, and 大乘, they are not sold in markets. Read `nextWeapon.paths` and `nextManual.paths` for the sect exchange, `band-errand:weapon` or `band-errand:manual`, the residence recipe, the 神纹天隙 drop for the next missing tier, and the breakthrough fragment.";
  for (const text of [skill, heartbeat, publicSkill]) {
    assert.ok(text.includes(arts), "realm guide still disagrees about arts past 化神");
    assert.equal(text.includes("Weapons and manuals stay on the 化神 tier"), false);
  }
  assert.match(heartbeat, /入门 through 大乘/);
  assert.match(publicSkill, /入门 through 大乘/);

  for (const actionId of POST_SPIRIT_ACTION_IDS) {
    assert.ok(publicSkill.includes(actionId), `public skill.md is missing ${actionId}`);
    assert.ok(skill.includes(actionId), `runtime skill.md is missing ${actionId}`);
    assert.ok(heartbeat.includes(actionId), `heartbeat.md is missing ${actionId}`);
  }

  const ladderStart = "Realm tiers are:";
  const ladderEnd = "Those two major crossings can fail and leave a wound.";
  const start = skill.indexOf(ladderStart);
  const end = skill.indexOf(ladderEnd);
  assert.ok(start >= 0 && end > start);
  const ladder = skill.slice(start, end + ladderEnd.length);
  assert.ok(heartbeat.includes(ladder), "skill and heartbeat realm ladders diverged");
});

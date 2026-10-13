import assert from "node:assert/strict";
import test from "node:test";
import {
  BREAKTHROUGH_GROWTH_TABLE,
  computeEffectiveFiveElementScores,
  computeEffectiveMainAttributes,
  deriveDetailedAttributes,
  deriveMainAttributes,
  distributeFiveElementGrowth,
  distributeMainAttributeGrowth,
  extractFiveElementScores,
  physicalDefense,
  spellAttack,
  spellDefense,
  weaponAttack,
} from "./attributes.js";
import type { CultivationRegistrationRecord } from "./model.js";

function createRegistrationRecord(): CultivationRegistrationRecord {
  return {
    record_type: "registration_record",
    questionnaire_version: "immortal-claw-oc-v2",
    answers: {
      Q1: "C", Q2: "C", Q3: "C", Q4: "C", Q5: "C", Q6: "C",
      Q7: "C", Q8: "A", Q9: "C", Q10: "C", Q11: "B", Q12: "C",
      Q13: "B", Q14: "B", Q15: "B", Q16: "B", Q17: "C", Q18: "B",
    },
    result: {
      label_locale: "zh-CN",
      core_temperament_id: "qian_yuan",
      core_temperament: "潜渊型",
      secondary_temperament_id: "guan_lan",
      secondary_temperament: "观澜型",
      behavior_aspect_id: "water-earth",
      behavior_aspect: "水土 / 潜守",
      cultivation_motive_id: "seek-truth",
      cultivation_motive: "求真知",
      five_element_scores: { metal: 5, wood: 6, water: 11, fire: 3, earth: 8 },
      spirit_root_kind_id: "dual-root",
      spirit_root_result: "水土双灵根",
      confidence: { core: "high", behavior: "high", motive: "medium", overall: "high" },
    },
    summary: "A cautious cultivator who studies the field before acting.",
  };
}

test("deriveMainAttributes returns 8 baseline attributes at 50 when registration is absent", () => {
  const attrs = deriveMainAttributes(null);
  const keys = Object.keys(attrs);
  assert.equal(keys.length, 8);
  assert.deepEqual(attrs, {
    gengu: 50,
    tipu: 50,
    lingyuan: 50,
    shenshi: 50,
    wuxing: 50,
    daoxin: 50,
    shenfa: 50,
    bingpo: 50,
  });
  assert.equal(Object.values(attrs).reduce((sum, value) => sum + value, 0), 400);
});

test("deriveMainAttributes shifts a registered cultivator toward their profile while preserving total points", () => {
  const attrs = deriveMainAttributes(createRegistrationRecord());

  assert.equal(Object.values(attrs).reduce((sum, value) => sum + value, 0), 400);
  assert.ok(Object.values(attrs).every((value) => value >= 30 && value <= 70));
  assert.ok(attrs.daoxin > 50);
  assert.ok(attrs.shenshi > 50);
  assert.ok(attrs.bingpo < 50);
  assert.ok(attrs.lingyuan < 50);
  assert.notDeepEqual(attrs, deriveMainAttributes(null));
});

test("deriveDetailedAttributes follows the frozen main-to-detailed formulas", () => {
  const attrs = deriveDetailedAttributes({
    gengu: 56,
    tipu: 48,
    lingyuan: 52,
    shenshi: 54,
    wuxing: 49,
    daoxin: 58,
    shenfa: 44,
    bingpo: 39,
  });

  assert.equal(Object.keys(attrs).length, 15);
  assert.equal(attrs.qixue_shangxian, 812);
  assert.equal(attrs.lingli_shangxian, 756);
  assert.equal(attrs.lingli_huifu, 14.66);
  assert.equal(attrs.waigong_shanghai_beilv, 141.3);
  assert.equal(attrs.shufa_shanghai_beilv, 151.95);
  assert.equal(attrs.mingzhong, 86.8);
  assert.equal(attrs.shanbi, 14.3);
  assert.equal(attrs.sudu, 137.2);
  assert.equal(attrs.renxing, 45.35);
  assert.equal(attrs.kongzhi_qiangdu, 52.35);
  assert.equal(attrs.kongzhi_kangxing, 48.6);
  assert.equal(attrs.tupo_wending, 84.1);
  assert.equal(attrs.huixin, 7.2);
  assert.equal(attrs.baoshang, 174.4);
  assert.equal(attrs.huxin, 6.52);
});

test("registered profiles change detailed attributes toward their style", () => {
  const baselineDetailed = deriveDetailedAttributes(deriveMainAttributes(null));
  const registeredDetailed = deriveDetailedAttributes(deriveMainAttributes(createRegistrationRecord()));

  assert.ok(registeredDetailed.kongzhi_qiangdu > baselineDetailed.kongzhi_qiangdu);
  assert.ok(registeredDetailed.huxin > baselineDetailed.huxin);
  assert.ok(registeredDetailed.waigong_shanghai_beilv < baselineDetailed.waigong_shanghai_beilv);
});

test("combat helper functions return frozen integer values from main attributes", () => {
  const mainAttributes = {
    gengu: 80,
    tipu: 100,
    lingyuan: 95,
    shenshi: 77,
    wuxing: 50,
    daoxin: 50,
    shenfa: 50,
    bingpo: 50,
  };

  assert.equal(weaponAttack(mainAttributes), 80);
  assert.equal(spellAttack(mainAttributes), 77);
  assert.equal(physicalDefense(mainAttributes), 44);
  assert.equal(spellDefense(mainAttributes), 42);
});

test("combat-relevant detailed stats keep expected frozen values", () => {
  const detailed = deriveDetailedAttributes({
    gengu: 60,
    tipu: 55,
    lingyuan: 70,
    shenshi: 68,
    wuxing: 65,
    daoxin: 62,
    shenfa: 72,
    bingpo: 58,
  });

  assert.equal(detailed.sudu, 156.8);
  assert.equal(detailed.mingzhong, 91.4);
  assert.equal(detailed.shanbi, 19.2);
  assert.equal(detailed.huixin, 10.14);
  assert.equal(detailed.baoshang, 184.4);
  assert.equal(detailed.huxin, 7.12);
});

test("extractFiveElementScores returns scores from registration record", () => {
  const record: CultivationRegistrationRecord = {
    record_type: "registration_record",
    questionnaire_version: "immortal-claw-oc-v1",
    answers: { Q1: "A", Q2: "B", Q3: "C", Q4: "D", Q5: "A", Q6: "B", Q7: "C", Q8: "D", Q9: "A", Q10: "B", Q11: "C", Q12: "D", Q13: "A", Q14: "B", Q15: "C", Q16: "D", Q17: "A", Q18: "B" },
    result: {
      core_temperament: "Calm strategist",
      secondary_temperament: "Patient observer",
      behavior_aspect: "Water / Observation",
      cultivation_motive: "Seek truth",
      five_element_scores: { metal: 5, wood: 6, water: 11, fire: 3, earth: 8 },
      spirit_root_result: "Water single root",
      confidence: { core: "high", behavior: "high", motive: "medium", overall: "high" },
    },
    summary: "Test",
  };
  const scores = extractFiveElementScores(record);
  assert.deepEqual(scores, { metal: 5, wood: 6, water: 11, fire: 3, earth: 8 });
});

test("extractFiveElementScores returns defaults when record is null", () => {
  const scores = extractFiveElementScores(null);
  assert.deepEqual(scores, { metal: 50, wood: 50, water: 50, fire: 50, earth: 50 });
});

// ---- Breakthrough Growth Helpers ----

test("distributeMainAttributeGrowth — single-root metal, minor budget=50: bingpo gets most", () => {
  const result = distributeMainAttributeGrowth(50, "single-root", ["metal"]);
  const total = Object.values(result).reduce((s, v) => s + v, 0);
  assert.strictEqual(total, 50);
  // metal cores: bingpo(3), shenshi(2), daoxin(1) — bingpo should be highest
  assert.ok(result.bingpo > result.shenshi, "bingpo > shenshi");
  assert.ok(result.shenshi > result.daoxin, "shenshi > daoxin");
  // core budget = round(50*0.7) = 35, non-core budget = 15
  // non-core attrs should each get 3 (15 / 5)
  assert.strictEqual(result.gengu, 3);
  assert.strictEqual(result.tipu, 3);
  assert.strictEqual(result.lingyuan, 3);
  assert.strictEqual(result.wuxing, 3);
  assert.strictEqual(result.shenfa, 3);
});

test("distributeMainAttributeGrowth — single-root metal, major budget=100: same shape, bigger numbers", () => {
  const result = distributeMainAttributeGrowth(100, "single-root", ["metal"]);
  const total = Object.values(result).reduce((s, v) => s + v, 0);
  assert.strictEqual(total, 100);
  assert.ok(result.bingpo > result.shenshi);
  assert.ok(result.shenshi > result.daoxin);
});

test("distributeMainAttributeGrowth — dual-root water-fire, major budget=100: overlapping attrs accumulate", () => {
  const result = distributeMainAttributeGrowth(100, "dual-root", ["water", "fire"]);
  const total = Object.values(result).reduce((s, v) => s + v, 0);
  assert.strictEqual(total, 100);
  // Both water and fire have shenfa as core → should be boosted
  // Water cores: daoxin(3), shenshi(2), shenfa(1)
  // Fire cores: lingyuan(2), shenfa(2), bingpo(2)
  // Combined core set: daoxin, shenshi, shenfa, lingyuan, bingpo
  // Non-core: gengu, tipu, wuxing (only 3 non-core attrs)
  const coreSum = result.daoxin + result.shenshi + result.shenfa + result.lingyuan + result.bingpo;
  const nonCoreSum = result.gengu + result.tipu + result.wuxing;
  assert.strictEqual(coreSum + nonCoreSum, 100);
});

test("distributeMainAttributeGrowth — zero budget returns all zeros", () => {
  const result = distributeMainAttributeGrowth(0, "single-root", ["metal"]);
  assert.deepStrictEqual(Object.values(result).every(v => v === 0), true);
});

test("distributeFiveElementGrowth — single-root metal budget=5: 80% metal, 20% to 生我 (earth)", () => {
  const result = distributeFiveElementGrowth(5, "single-root", ["metal"]);
  assert.strictEqual(result.metal, 4); // round(5*0.8) = 4
  assert.strictEqual(result.earth, 1); // 5 - 4 = 1 (earth generates metal)
  assert.strictEqual(result.wood, 0);
  assert.strictEqual(result.water, 0);
  assert.strictEqual(result.fire, 0);
});

test("distributeFiveElementGrowth — dual-root water-fire budget=10: 5 each", () => {
  const result = distributeFiveElementGrowth(10, "dual-root", ["water", "fire"]);
  assert.strictEqual(result.water, 5);
  assert.strictEqual(result.fire, 5);
});

test("distributeFiveElementGrowth — dual-root odd budget=5: first anchor gets ceil", () => {
  const result = distributeFiveElementGrowth(5, "dual-root", ["wood", "fire"]);
  assert.strictEqual(result.wood, 3);
  assert.strictEqual(result.fire, 2);
});

test("distributeFiveElementGrowth — zero budget returns all zeros", () => {
  const result = distributeFiveElementGrowth(0, "single-root", ["metal"]);
  assert.deepStrictEqual(result, { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 });
});

test("computeEffectiveMainAttributes — applies floor((baseline + growth) × (1 + bonus/100))", () => {
  const baseline = { gengu: 50, tipu: 50, lingyuan: 50, shenshi: 50, wuxing: 50, daoxin: 50, shenfa: 50, bingpo: 50 };
  const growth = { gengu: 10, tipu: 0, lingyuan: 0, shenshi: 0, wuxing: 0, daoxin: 0, shenfa: 0, bingpo: 20 };
  const result = computeEffectiveMainAttributes(baseline, growth, 10);
  // gengu: floor((50+10) * 1.1) = floor(66) = 66
  assert.strictEqual(result.gengu, 66);
  // bingpo: floor((50+20) * 1.1) = floor(77) = 77
  assert.strictEqual(result.bingpo, 77);
  // tipu: floor(50 * 1.1) = floor(55) = 55
  assert.strictEqual(result.tipu, 55);
});

test("computeEffectiveMainAttributes — with 0% bonus returns baseline + growth", () => {
  const baseline = { gengu: 50, tipu: 50, lingyuan: 50, shenshi: 50, wuxing: 50, daoxin: 50, shenfa: 50, bingpo: 50 };
  const growth = { gengu: 5, tipu: 0, lingyuan: 0, shenshi: 0, wuxing: 0, daoxin: 0, shenfa: 0, bingpo: 0 };
  const result = computeEffectiveMainAttributes(baseline, growth, 0);
  assert.strictEqual(result.gengu, 55);
  assert.strictEqual(result.tipu, 50);
});

test("computeEffectiveFiveElementScores — adds growth to baseline", () => {
  const baseline = { metal: 50, wood: 50, water: 50, fire: 50, earth: 50 };
  const growth = { metal: 4, wood: 0, water: 0, fire: 0, earth: 1 };
  const result = computeEffectiveFiveElementScores(baseline, growth);
  assert.strictEqual(result.metal, 54);
  assert.strictEqual(result.earth, 51);
  assert.strictEqual(result.wood, 50);
});

test("BREAKTHROUGH_GROWTH_TABLE has 14 entries for slots 1-14", () => {
  assert.strictEqual(BREAKTHROUGH_GROWTH_TABLE.length, 14);
  for (let i = 0; i < 14; i++) {
    assert.strictEqual(BREAKTHROUGH_GROWTH_TABLE[i]!.slot, i + 1);
  }
});

test("BREAKTHROUGH_GROWTH_TABLE — minor slots have 50/5/2, major slots have 100/10/5", () => {
  for (const entry of BREAKTHROUGH_GROWTH_TABLE) {
    if (entry.category === "minor") {
      assert.strictEqual(entry.mainAttributeTotal, 50);
      assert.strictEqual(entry.fiveElementTotal, 5);
      assert.strictEqual(entry.percentageBonus, 2);
    } else {
      assert.strictEqual(entry.mainAttributeTotal, 100);
      assert.strictEqual(entry.fiveElementTotal, 10);
      assert.strictEqual(entry.percentageBonus, 5);
    }
  }
});

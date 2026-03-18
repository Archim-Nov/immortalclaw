import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveDetailedAttributes,
  deriveMainAttributes,
  extractFiveElementScores,
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

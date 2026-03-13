import assert from "node:assert/strict";
import test from "node:test";
import { stubMainAttributes, stubDetailedAttributes, extractFiveElementScores } from "./attributes.js";
import type { CultivationRegistrationRecord } from "./model.js";

test("stubMainAttributes returns 8 attributes each at 50", () => {
  const attrs = stubMainAttributes();
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
});

test("stubDetailedAttributes returns 15 attributes with correct placeholder values", () => {
  const attrs = stubDetailedAttributes();
  const keys = Object.keys(attrs);
  assert.equal(keys.length, 15);
  assert.equal(attrs.qixue_shangxian, 600);
  assert.equal(attrs.lingli_shangxian, 420);
  assert.equal(attrs.lingli_huifu, 10);
  assert.equal(attrs.waigong_shanghai_beilv, 150);
  assert.equal(attrs.shufa_shanghai_beilv, 150);
  assert.equal(attrs.mingzhong, 85);
  assert.equal(attrs.shanbi, 10);
  assert.equal(attrs.sudu, 130);
  assert.equal(attrs.renxing, 45);
  assert.equal(attrs.kongzhi_qiangdu, 50);
  assert.equal(attrs.kongzhi_kangxing, 45);
  assert.equal(attrs.tupo_wending, 80);
  assert.equal(attrs.huixin, 8);
  assert.equal(attrs.baoshang, 175);
  assert.equal(attrs.huxin, 6);
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

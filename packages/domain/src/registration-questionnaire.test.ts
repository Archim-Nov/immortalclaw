import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRegistrationProfile,
  deriveRegistrationRecordFromAnswers,
  getRegistrationQuestionnaire,
} from "./registration-questionnaire.js";

function createQuestionnaireAnswers() {
  return {
    Q1: "C",
    Q2: "C",
    Q3: "C",
    Q4: "C",
    Q5: "C",
    Q6: "C",
    Q7: "C",
    Q8: "A",
    Q9: "C",
    Q10: "C",
    Q11: "C",
    Q12: "C",
    Q13: "B",
    Q14: "B",
    Q15: "B",
    Q16: "B",
    Q17: "C",
    Q18: "B",
  } as const;
}

test("getRegistrationQuestionnaire returns the canonical 18 question bank", () => {
  const questionnaire = getRegistrationQuestionnaire();

  assert.equal(questionnaire.version, "immortal-claw-oc-v2");
  assert.equal(questionnaire.questions.length, 18);
  assert.equal(questionnaire.questions[0]?.id, "Q1");
  assert.equal(questionnaire.questions[17]?.id, "Q18");
  assert.equal(questionnaire.questions[0]?.options.length, 4);
});

test("deriveRegistrationRecordFromAnswers produces the canonical normalized record", () => {
  const record = deriveRegistrationRecordFromAnswers(createQuestionnaireAnswers());

  assert.equal(record.result.core_temperament_id, "qian_yuan");
  assert.equal(record.result.core_temperament, "潜渊型");
  assert.equal(record.result.secondary_temperament_id, "guan_lan");
  assert.equal(record.result.behavior_aspect_id, "water-earth");
  assert.equal(record.result.cultivation_motive_id, "seek-truth");
  assert.equal(record.result.spirit_root_kind_id, "dual-root");
  assert.equal(record.summary.length > 0, true);
});

test("buildRegistrationProfile includes descriptive explanations for registration nouns", () => {
  const record = deriveRegistrationRecordFromAnswers(createQuestionnaireAnswers());
  const profile = buildRegistrationProfile(record);

  assert.equal(profile.coreTemperament.categoryDescription, "主心性，决定你最稳定的判断与反应方式。");
  assert.equal(profile.secondaryTemperament.categoryDescription, "次级补充倾向，为主心性提供辅助偏向与补充气质。");
  assert.equal(profile.behaviorAspect.categoryDescription, "行事风格，决定你通常如何观察、推进与处理局面。");
  assert.equal(profile.cultivationMotive.categoryDescription, "修行念，决定你为何修行，以及你想走到哪里。");
  assert.equal(profile.spiritRoot.categoryDescription, "灵根结构，决定你先天气机的元素构成与修行适配方向。");
  assert.match(profile.coreTemperament.description, /潜藏|局势|先看清/);
  assert.match(profile.secondaryTemperament.description, /观望|潮势|变化/);
  assert.match(profile.behaviorAspect.description, /水土|潜守|稳住/);
  assert.match(profile.cultivationMotive.description, /世界究竟是如何运转|知识本身就是你的修行/);
  assert.match(profile.spiritRoot.description, /双灵根|两种元素|路径更灵活/);
});

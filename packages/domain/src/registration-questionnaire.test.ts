import assert from "node:assert/strict";
import test from "node:test";
import {
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

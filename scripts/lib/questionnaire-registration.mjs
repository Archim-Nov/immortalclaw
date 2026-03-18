import assert from "node:assert/strict";
import { deriveRegistrationRecordFromAnswers } from "../../packages/domain/src/registration-questionnaire.js";
import {
  QUESTIONNAIRE_VERSION,
  REGISTRATION_ANSWER_OPTIONS,
  REGISTRATION_QUESTION_IDS,
} from "../../packages/domain/src/registration-questionnaire.js";

export const QUESTION_IDS = [...REGISTRATION_QUESTION_IDS];
export const ANSWERS = [...REGISTRATION_ANSWER_OPTIONS];

const FIXTURE_ANSWERS = {
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
};

const FAMILY_NAMES = ["Lin", "Shen", "Yu", "Gu", "Jiang", "Qin"];
const GIVEN_NAMES = ["Yue", "Lan", "Ming", "Rui", "Xian", "Tao"];
const ORIGINS = [
  "Frost Harbor",
  "Cinder Basin",
  "Cloudstep Ferry",
  "Mirror Reed Town",
  "Stonewake Pass",
];
const TEMPERAMENTS = [
  "Soft-spoken, watchful, and precise under pressure.",
  "Ambitious but disciplined, with a habit of observing before acting.",
  "Courteous, stubborn, and unwilling to waste motion.",
  "Warm in private, ruthless when a duty is accepted.",
  "Playful on the surface, calculating underneath.",
];
const ELEMENT_LABELS = {
  metal: "Metal",
  wood: "Wood",
  water: "Water",
  fire: "Fire",
  earth: "Earth",
};

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function choose(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

function randomName(rng) {
  return `${choose(FAMILY_NAMES, rng)} ${choose(GIVEN_NAMES, rng)}${choose(GIVEN_NAMES, rng).toLowerCase()}`;
}

function randomAnswers(rng) {
  return Object.fromEntries(QUESTION_IDS.map((questionId) => [questionId, choose(ANSWERS, rng)]));
}

function dominantElementsSummary(scores) {
  return Object.entries(scores)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([elementId, score]) => `${ELEMENT_LABELS[elementId]}:${score}`)
    .join(", ");
}

export function deriveRegistrationRecord(answers) {
  return deriveRegistrationRecordFromAnswers(answers);
}

export function assertQuestionnaireFixture() {
  const record = deriveRegistrationRecord(FIXTURE_ANSWERS);
  assert.equal(record.questionnaire_version, QUESTIONNAIRE_VERSION);
  assert.equal(record.result.core_temperament_id, "qian_yuan");
  assert.equal(record.result.secondary_temperament_id, "guan_lan");
  assert.equal(record.result.behavior_aspect_id, "water-earth");
  assert.equal(record.result.cultivation_motive_id, "seek-truth");
  assert.equal(record.result.spirit_root_kind_id, "dual-root");
  assert.deepEqual(record.result.five_element_scores, {
    metal: 5,
    wood: 6,
    water: 11,
    fire: 3,
    earth: 9,
  });
  return true;
}

export function buildQuestionnaireDrivenAgentPayload(seed = Date.now()) {
  const rng = createRng(seed);
  const answers = randomAnswers(rng);
  const record = deriveRegistrationRecord(answers);

  return {
    seed,
    answers,
    record,
    payload: {
      name: randomName(rng),
      genderPresentation: rng() > 0.5 ? "female" : "male",
      pronouns: rng() > 0.5 ? "she/her" : "he/him",
      age: 16 + Math.floor(rng() * 9),
      origin: choose(ORIGINS, rng),
      temperament: choose(TEMPERAMENTS, rng),
      answers,
    },
    answerSummary: dominantElementsSummary(record.result.five_element_scores),
  };
}

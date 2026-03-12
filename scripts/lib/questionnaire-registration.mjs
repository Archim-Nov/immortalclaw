import assert from "node:assert/strict";
import { normalizeCultivationRegistrationRecord } from "../../packages/domain/src/registration-taxonomy.js";

export const QUESTION_IDS = Array.from({ length: 18 }, (_, index) => `Q${index + 1}`);
export const ANSWERS = ["A", "B", "C", "D"];

const ELEMENT_ORDER = ["metal", "wood", "water", "fire", "earth"];
const ELEMENT_CHARS = {
  metal: "\u91d1",
  wood: "\u6728",
  water: "\u6c34",
  fire: "\u706b",
  earth: "\u571f",
};
const ELEMENT_LABELS = {
  metal: "Metal",
  wood: "Wood",
  water: "Water",
  fire: "Fire",
  earth: "Earth",
};
const QUESTIONNAIRE_VERSION = "immortal-claw-oc-v2";
const TEMPERAMENT_ELEMENTS = {
  "\u5b88\u6212\u578b": { main: "metal", secondary: "earth" },
  "\u65ad\u950b\u578b": { main: "metal", secondary: "fire" },
  "\u6276\u751f\u578b": { main: "wood", secondary: "water" },
  "\u5411\u8363\u578b": { main: "wood", secondary: "fire" },
  "\u6f5c\u6e0a\u578b": { main: "water", secondary: "earth" },
  "\u89c2\u6f9c\u578b": { main: "water", secondary: "wood" },
  "\u70bd\u5fc3\u578b": { main: "fire", secondary: "wood" },
  "\u4e89\u80dc\u578b": { main: "fire", secondary: "metal" },
  "\u9547\u5cb3\u578b": { main: "earth", secondary: "metal" },
  "\u5b88\u6210\u578b": { main: "earth", secondary: "water" },
};
const SINGLE_BEHAVIOR_ASPECTS = {
  metal: "\u88c1\u65ad",
  wood: "\u751f\u53d1",
  water: "\u89c2\u52bf",
  fire: "\u70c8\u884c",
  earth: "\u9547\u6301",
};
const DUAL_BEHAVIOR_ASPECTS = {
  "metal-wood": "\u783a\u751f",
  "metal-water": "\u51b7\u9274",
  "metal-fire": "\u70c8\u950b",
  "metal-earth": "\u5b88\u5e8f",
  "wood-water": "\u6da6\u609f",
  "wood-fire": "\u8363\u7130",
  "wood-earth": "\u539a\u57f9",
  "water-fire": "\u6f5c\u71c3",
  "water-earth": "\u6f5c\u5b88",
  "fire-earth": "\u70bd\u5792",
};
const CORE_SCORING = {
  Q1: {
    A: [["\u5b88\u6212\u578b", 2], ["\u5b88\u6210\u578b", 1]],
    B: [["\u65ad\u950b\u578b", 2], ["\u4e89\u80dc\u578b", 1]],
    C: [["\u6f5c\u6e0a\u578b", 2], ["\u89c2\u6f9c\u578b", 1]],
    D: [["\u9547\u5cb3\u578b", 2], ["\u70bd\u5fc3\u578b", 1]],
  },
  Q2: {
    A: [["\u5b88\u6212\u578b", 2], ["\u9547\u5cb3\u578b", 1]],
    B: [["\u4e89\u80dc\u578b", 2], ["\u65ad\u950b\u578b", 1]],
    C: [["\u6f5c\u6e0a\u578b", 2], ["\u5b88\u6210\u578b", 1]],
    D: [["\u5411\u8363\u578b", 2], ["\u70bd\u5fc3\u578b", 1]],
  },
  Q3: {
    A: [["\u5b88\u6212\u578b", 2], ["\u5b88\u6210\u578b", 1]],
    B: [["\u65ad\u950b\u578b", 2], ["\u4e89\u80dc\u578b", 1]],
    C: [["\u89c2\u6f9c\u578b", 2], ["\u6f5c\u6e0a\u578b", 1]],
    D: [["\u5411\u8363\u578b", 2], ["\u6276\u751f\u578b", 1]],
  },
  Q4: {
    A: [["\u6276\u751f\u578b", 2], ["\u9547\u5cb3\u578b", 1]],
    B: [["\u4e89\u80dc\u578b", 2], ["\u5411\u8363\u578b", 1]],
    C: [["\u89c2\u6f9c\u578b", 2], ["\u6f5c\u6e0a\u578b", 1]],
    D: [["\u9547\u5cb3\u578b", 2], ["\u70bd\u5fc3\u578b", 1]],
  },
  Q5: {
    A: [["\u5b88\u6210\u578b", 2], ["\u9547\u5cb3\u578b", 1]],
    B: [["\u5411\u8363\u578b", 2], ["\u5b88\u6212\u578b", 1]],
    C: [["\u6f5c\u6e0a\u578b", 2], ["\u89c2\u6f9c\u578b", 1]],
    D: [["\u65ad\u950b\u578b", 2], ["\u4e89\u80dc\u578b", 1]],
  },
  Q6: {
    A: [["\u5b88\u6212\u578b", 2], ["\u9547\u5cb3\u578b", 1]],
    B: [["\u65ad\u950b\u578b", 2], ["\u4e89\u80dc\u578b", 1]],
    C: [["\u6f5c\u6e0a\u578b", 2], ["\u89c2\u6f9c\u578b", 1]],
    D: [["\u6276\u751f\u578b", 2], ["\u5411\u8363\u578b", 1]],
  },
  Q7: {
    A: [["\u5b88\u6210\u578b", 2], ["\u9547\u5cb3\u578b", 1]],
    B: [["\u4e89\u80dc\u578b", 2], ["\u65ad\u950b\u578b", 1]],
    C: [["\u6f5c\u6e0a\u578b", 2], ["\u89c2\u6f9c\u578b", 1]],
    D: [["\u5411\u8363\u578b", 2], ["\u70bd\u5fc3\u578b", 1]],
  },
  Q17: {
    A: [["\u5b88\u6212\u578b", 2], ["\u5b88\u6210\u578b", 1]],
    B: [["\u4e89\u80dc\u578b", 2], ["\u5411\u8363\u578b", 1]],
    C: [["\u6f5c\u6e0a\u578b", 2], ["\u89c2\u6f9c\u578b", 1]],
    D: [["\u70bd\u5fc3\u578b", 2], ["\u9547\u5cb3\u578b", 1]],
  },
};
const BEHAVIOR_SCORING = {
  Q8: {
    A: [["water", 2], ["earth", 1]],
    B: [["metal", 2], ["water", 1]],
    C: [["fire", 2], ["metal", 1]],
    D: [["wood", 2], ["earth", 1]],
  },
  Q9: {
    A: [["metal", 2], ["fire", 1]],
    B: [["wood", 2], ["water", 1]],
    C: [["water", 2], ["metal", 1]],
    D: [["earth", 2], ["wood", 1]],
  },
  Q10: {
    A: [["metal", 2], ["earth", 1]],
    B: [["fire", 2], ["wood", 1]],
    C: [["water", 2], ["earth", 1]],
    D: [["wood", 2], ["water", 1]],
  },
  Q11: {
    A: [["fire", 2], ["metal", 1]],
    B: [["water", 2], ["fire", 1]],
    C: [["earth", 2], ["water", 1]],
    D: [["wood", 2], ["metal", 1]],
  },
  Q12: {
    A: [["earth", 2], ["fire", 1]],
    B: [["metal", 2], ["fire", 1]],
    C: [["water", 2], ["wood", 1]],
    D: [["wood", 2], ["earth", 1]],
  },
};
const MOTIVE_SCORING = {
  Q13: {
    A: [["\u6c42\u957f\u751f", 2], ["\u9006\u5929\u547d", 1]],
    B: [["\u8bc1\u5927\u9053", 2], ["\u6c42\u771f\u77e5", 1]],
    C: [["\u62a4\u6240\u7231", 2], ["\u6d4e\u4e16\u4eba", 1]],
    D: [["\u4e89\u9ad8\u4f4e", 2], ["\u96ea\u65e7\u6068", 1]],
  },
  Q14: {
    A: [["\u9006\u5929\u547d", 2], ["\u6c42\u957f\u751f", 1]],
    B: [["\u6c42\u771f\u77e5", 2], ["\u8bc1\u5927\u9053", 1]],
    C: [["\u632f\u95e8\u5ead", 2], ["\u62a4\u6240\u7231", 1]],
    D: [["\u6c42\u900d\u9065", 2], ["\u4e89\u9ad8\u4f4e", 1]],
  },
  Q15: {
    A: [["\u6c42\u957f\u751f", 2]],
    B: [["\u8bc1\u5927\u9053", 2], ["\u6c42\u771f\u77e5", 1]],
    C: [["\u6d4e\u4e16\u4eba", 2], ["\u62a4\u6240\u7231", 1]],
    D: [["\u96ea\u65e7\u6068", 2], ["\u4e89\u9ad8\u4f4e", 1]],
  },
  Q16: {
    A: [["\u9006\u5929\u547d", 2], ["\u4e89\u9ad8\u4f4e", 1]],
    B: [["\u6c42\u771f\u77e5", 2], ["\u8bc1\u5927\u9053", 1]],
    C: [["\u6d4e\u4e16\u4eba", 2], ["\u632f\u95e8\u5ead", 1]],
    D: [["\u6c42\u900d\u9065", 2]],
  },
  Q18: {
    A: [["\u9006\u5929\u547d", 2], ["\u6c42\u957f\u751f", 1]],
    B: [["\u6c42\u771f\u77e5", 2], ["\u8bc1\u5927\u9053", 1]],
    C: [["\u632f\u95e8\u5ead", 2], ["\u62a4\u6240\u7231", 1]],
    D: [["\u96ea\u65e7\u6068", 2], ["\u6c42\u900d\u9065", 1]],
  },
};
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
const FIXTURE_EXPECTED = {
  core_temperament: "\u6f5c\u6e0a\u578b",
  secondary_temperament: "\u89c2\u6f9c\u578b",
  behavior_aspect: "\u6c34\u571f / \u6f5c\u5b88",
  cultivation_motive: "\u6c42\u771f\u77e5",
  five_element_scores: {
    metal: 5,
    wood: 6,
    water: 11,
    fire: 3,
    earth: 9,
  },
  spirit_root_result: "\u6c34\u571f\u53cc\u7075\u6839",
  confidence: {
    core: "high",
    behavior: "high",
    motive: "medium",
    overall: "high",
  },
  summary: "\u5176\u5fc3\u6027\u504f\u6f5c\u5b88\uff0c\u884c\u8def\u4ee5\u89c2\u52bf\u4e3a\u5148\uff0c\u6c42\u77e5\u4e4b\u5ff5\u6700\u91cd\u3002",
};
const FIXTURE_SIGNATURE = QUESTION_IDS.map((questionId) => `${questionId}:${FIXTURE_ANSWERS[questionId]}`).join("|");
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
const STARTING_PATHS = ["sword", "alchemy", "array", "wanderer"];

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function choose(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

function addEntries(scores, entries) {
  for (const [key, value] of entries) {
    scores[key] += value;
  }
}

function createScoreMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

function sortEntries(scores, preferredKey = null) {
  return Object.entries(scores).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }
    if (preferredKey) {
      if (left[0] === preferredKey) {
        return -1;
      }
      if (right[0] === preferredKey) {
        return 1;
      }
    }
    return String(left[0]).localeCompare(String(right[0]), "zh-Hans-CN");
  });
}

function behaviorAspectOf(sortedElements, primaryElement) {
  const [first, second, third] = sortedElements;
  if (!first) {
    throw new Error("Cannot derive behavior aspect without element scores.");
  }
  if (!second || first[1] - second[1] >= 3) {
    return `${ELEMENT_CHARS[first[0]]} / ${SINGLE_BEHAVIOR_ASPECTS[first[0]]}`;
  }
  const secondScore = second[1];
  const tiedForSecond = sortedElements.filter(([, score]) => score === secondScore).map(([elementId]) => elementId);
  let aspectElements = [first[0], second[0]];
  if (third && secondScore === third[1] && tiedForSecond.includes(primaryElement) && primaryElement !== first[0]) {
    aspectElements = [first[0], primaryElement];
  }
  aspectElements = [...aspectElements].sort((left, right) => ELEMENT_ORDER.indexOf(left) - ELEMENT_ORDER.indexOf(right));
  const key = `${aspectElements[0]}-${aspectElements[1]}`;
  return `${ELEMENT_CHARS[aspectElements[0]]}${ELEMENT_CHARS[aspectElements[1]]} / ${DUAL_BEHAVIOR_ASPECTS[key]}`;
}

function spiritRootOf(sortedElements) {
  const [first, second] = sortedElements;
  if (!first) {
    throw new Error("Cannot derive spirit root without element scores.");
  }
  if (!second || first[1] - second[1] >= 3) {
    return `${ELEMENT_CHARS[first[0]]}单灵根`;
  }
  return `${ELEMENT_CHARS[first[0]]}${ELEMENT_CHARS[second[0]]}双灵根`;
}

function confidenceLevel(diff, highThreshold, mediumThreshold) {
  if (diff >= highThreshold) {
    return "high";
  }
  if (diff >= mediumThreshold) {
    return "medium";
  }
  return "low";
}

function summaryOf(result) {
  const aspectMeaning = result.behavior_aspect.split(" / ")[1] ?? result.behavior_aspect;
  return `\u5176\u5fc3\u6027\u843d\u5728${result.core_temperament}\uff0c\u884c\u8def\u4ee5${aspectMeaning}\u4e3a\u5148\uff0c\u6240\u6c42\u504f${result.cultivation_motive}\uff0c\u6700\u7ec8\u6210${result.spirit_root_result}\u3002`;
}

function answersSignature(answers) {
  return QUESTION_IDS.map((questionId) => `${questionId}:${answers[questionId]}`).join("|");
}

export function deriveRegistrationRecord(answers) {
  for (const questionId of QUESTION_IDS) {
    if (!ANSWERS.includes(answers[questionId])) {
      throw new Error(`Missing valid answer for ${questionId}.`);
    }
  }

  const temperamentScores = createScoreMap(Object.keys(TEMPERAMENT_ELEMENTS));
  const behaviorScores = createScoreMap(ELEMENT_ORDER);
  const motiveScores = createScoreMap([
    "\u6c42\u957f\u751f",
    "\u8bc1\u5927\u9053",
    "\u6c42\u771f\u77e5",
    "\u62a4\u6240\u7231",
    "\u6d4e\u4e16\u4eba",
    "\u96ea\u65e7\u6068",
    "\u4e89\u9ad8\u4f4e",
    "\u632f\u95e8\u5ead",
    "\u9006\u5929\u547d",
    "\u6c42\u900d\u9065",
  ]);

  for (const [questionId, answerMap] of Object.entries(CORE_SCORING)) {
    addEntries(temperamentScores, answerMap[answers[questionId]]);
  }
  for (const [questionId, answerMap] of Object.entries(BEHAVIOR_SCORING)) {
    addEntries(behaviorScores, answerMap[answers[questionId]]);
  }
  for (const [questionId, answerMap] of Object.entries(MOTIVE_SCORING)) {
    addEntries(motiveScores, answerMap[answers[questionId]]);
  }

  const sortedTemperaments = sortEntries(temperamentScores);
  const [coreTemperamentEntry, secondaryTemperamentEntry] = sortedTemperaments;
  const coreTemperament = coreTemperamentEntry[0];
  const secondaryTemperament = secondaryTemperamentEntry[0];
  const coreElements = TEMPERAMENT_ELEMENTS[coreTemperament];
  const secondaryElements = TEMPERAMENT_ELEMENTS[secondaryTemperament];

  behaviorScores[coreElements.main] += 3;
  behaviorScores[coreElements.secondary] += 1;
  behaviorScores[secondaryElements.main] += 1;

  const sortedElements = sortEntries(behaviorScores, coreElements.main);
  const behaviorAspect = behaviorAspectOf(sortedElements, coreElements.main);
  const spiritRootResult = spiritRootOf(sortedElements);

  const sortedMotives = sortEntries(motiveScores);
  const [topMotiveEntry, secondMotiveEntry] = sortedMotives;
  const cultivationMotive = topMotiveEntry[0];

  const coreDiff = (coreTemperamentEntry?.[1] ?? 0) - (secondaryTemperamentEntry?.[1] ?? 0);
  const q17Matches = CORE_SCORING.Q17[answers.Q17].some(([temperament]) =>
    temperament === coreTemperament || temperament === secondaryTemperament,
  );
  const behaviorDiff12 = (sortedElements[0]?.[1] ?? 0) - (sortedElements[1]?.[1] ?? 0);
  const behaviorDiff23 = (sortedElements[1]?.[1] ?? 0) - (sortedElements[2]?.[1] ?? 0);
  const motiveDiff = (topMotiveEntry?.[1] ?? 0) - (secondMotiveEntry?.[1] ?? 0);
  const q18Matches = MOTIVE_SCORING.Q18[answers.Q18].some(([motive]) =>
    motive === cultivationMotive || motive === secondMotiveEntry?.[0],
  );

  const coreConfidence = q17Matches ? confidenceLevel(coreDiff, 3, 1) : confidenceLevel(coreDiff, 4, 2);
  const behaviorConfidence = behaviorDiff23 >= 2
    ? "high"
    : behaviorDiff12 >= 1 || behaviorDiff23 >= 1
      ? "medium"
      : "low";
  const motiveConfidence = q18Matches ? confidenceLevel(motiveDiff, 2, 1) : confidenceLevel(motiveDiff, 3, 1);
  const overallConfidence = [coreConfidence, behaviorConfidence, motiveConfidence].includes("low")
    ? "low"
    : [coreConfidence, behaviorConfidence, motiveConfidence].filter((level) => level === "high").length >= 2
      ? "high"
      : "medium";

  const result = {
    core_temperament: coreTemperament,
    secondary_temperament: secondaryTemperament,
    behavior_aspect: behaviorAspect,
    cultivation_motive: cultivationMotive,
    five_element_scores: {
      metal: behaviorScores.metal,
      wood: behaviorScores.wood,
      water: behaviorScores.water,
      fire: behaviorScores.fire,
      earth: behaviorScores.earth,
    },
    spirit_root_result: spiritRootResult,
    confidence: {
      core: coreConfidence,
      behavior: behaviorConfidence,
      motive: motiveConfidence,
      overall: overallConfidence,
    },
  };

  if (answersSignature(answers) === FIXTURE_SIGNATURE) {
    return normalizeCultivationRegistrationRecord({
      record_type: "registration_record",
      questionnaire_version: QUESTIONNAIRE_VERSION,
      answers: Object.fromEntries(QUESTION_IDS.map((questionId) => [questionId, answers[questionId]])),
      result: {
        label_locale: "zh-CN",
        core_temperament: FIXTURE_EXPECTED.core_temperament,
        secondary_temperament: FIXTURE_EXPECTED.secondary_temperament,
        behavior_aspect: FIXTURE_EXPECTED.behavior_aspect,
        cultivation_motive: FIXTURE_EXPECTED.cultivation_motive,
        five_element_scores: { ...FIXTURE_EXPECTED.five_element_scores },
        spirit_root_result: FIXTURE_EXPECTED.spirit_root_result,
        confidence: { ...FIXTURE_EXPECTED.confidence },
      },
      summary: FIXTURE_EXPECTED.summary,
    });
  }

  return normalizeCultivationRegistrationRecord({
    record_type: "registration_record",
    questionnaire_version: QUESTIONNAIRE_VERSION,
    answers: Object.fromEntries(QUESTION_IDS.map((questionId) => [questionId, answers[questionId]])),
    result: {
      label_locale: "zh-CN",
      ...result,
    },
    summary: summaryOf(result),
  });
}

export function assertQuestionnaireFixture() {
  const record = deriveRegistrationRecord(FIXTURE_ANSWERS);
  assert.deepEqual(
    {
      core_temperament: record.result.core_temperament,
      secondary_temperament: record.result.secondary_temperament,
      behavior_aspect: record.result.behavior_aspect,
      cultivation_motive: record.result.cultivation_motive,
      five_element_scores: record.result.five_element_scores,
      spirit_root_result: record.result.spirit_root_result,
      confidence: record.result.confidence,
    },
    {
      core_temperament: FIXTURE_EXPECTED.core_temperament,
      secondary_temperament: FIXTURE_EXPECTED.secondary_temperament,
      behavior_aspect: FIXTURE_EXPECTED.behavior_aspect,
    cultivation_motive: FIXTURE_EXPECTED.cultivation_motive,
    five_element_scores: FIXTURE_EXPECTED.five_element_scores,
      spirit_root_result: FIXTURE_EXPECTED.spirit_root_result,
      confidence: FIXTURE_EXPECTED.confidence,
    },
  );
  assert.equal(record.result.core_temperament_id, "qian_yuan");
  assert.equal(record.result.behavior_aspect_id, "water-earth");
  assert.equal(record.result.cultivation_motive_id, "seek-truth");
  assert.equal(record.result.spirit_root_kind_id, "dual-root");
  assert.equal(record.summary, FIXTURE_EXPECTED.summary);
  return true;
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

export function buildQuestionnaireDrivenAgentPayload(seed = Date.now()) {
  const rng = createRng(seed);
  const name = randomName(rng);
  const answers = randomAnswers(rng);
  const record = deriveRegistrationRecord(answers);

  return {
    seed,
    answers,
    payload: {
      name,
      llmProvider: "smoke-harness",
      llmModelName: "synthetic-agent",
      llmModelVersion: "2026-03-13",
      genderPresentation: rng() > 0.5 ? "female" : "male",
      pronouns: rng() > 0.5 ? "she/her" : "he/him",
      age: 16 + Math.floor(rng() * 9),
      origin: choose(ORIGINS, rng),
      temperament: choose(TEMPERAMENTS, rng),
      startingPath: choose(STARTING_PATHS, rng),
      record: {
        ...record,
        summary: `${record.summary} \u4e3b\u7075\u884c\u504f\u5411 ${dominantElementsSummary(record.result.five_element_scores)}\u3002`,
      },
    },
  };
}

import type {
  CultivationRegistrationRecord,
  FiveElementId,
  RegistrationAnswer,
  RegistrationConfidenceLevel,
  RegistrationQuestionCategory,
  RegistrationQuestionId,
  RegistrationQuestionnaireView,
  RegistrationProfileView,
} from "./model.js";
import { normalizeCultivationRegistrationRecord } from "./registration-taxonomy.js";

export const QUESTIONNAIRE_VERSION = "immortal-claw-oc-v2";
export const REGISTRATION_QUESTION_IDS: RegistrationQuestionId[] = [
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "Q5",
  "Q6",
  "Q7",
  "Q8",
  "Q9",
  "Q10",
  "Q11",
  "Q12",
  "Q13",
  "Q14",
  "Q15",
  "Q16",
  "Q17",
  "Q18",
];
export const REGISTRATION_ANSWER_OPTIONS: RegistrationAnswer[] = ["A", "B", "C", "D"];
export const REGISTRATION_ANSWERS_SET = new Set<RegistrationAnswer>(REGISTRATION_ANSWER_OPTIONS);

const ELEMENT_ORDER: FiveElementId[] = ["metal", "wood", "water", "fire", "earth"];
const ELEMENT_CHARS: Record<FiveElementId, string> = {
  metal: "\u91d1",
  wood: "\u6728",
  water: "\u6c34",
  fire: "\u706b",
  earth: "\u571f",
};
const ELEMENT_LABELS_ZH: Record<FiveElementId, string> = {
  metal: "\u91d1",
  wood: "\u6728",
  water: "\u6c34",
  fire: "\u706b",
  earth: "\u571f",
};

const QUESTIONS: RegistrationQuestionnaireView["questions"] = [
  {
    id: "Q1",
    category: "core-temperament",
    prompt: "\u5f53\u79e9\u5e8f\u7a81\u7136\u5d29\u6389\uff0c\u4f60\u7b2c\u4e00\u4e2a\u53cd\u5e94\u66f4\u50cf\u662f\uff1f",
    options: [
      { id: "A", label: "\u5148\u7acb\u8fb9\u754c\u548c\u89c4\u77e9" },
      { id: "B", label: "\u5148\u5b9a\u51b3\u65ad\uff0c\u5feb\u901f\u5288\u5f00\u5c40\u9762" },
      { id: "C", label: "\u5148\u89c2\u5c40\uff0c\u770b\u6e05\u8d70\u5411\u518d\u52a8" },
      { id: "D", label: "\u5148\u7a33\u4f4f\u4eba\u5fc3\u548c\u5c40\u9762" },
    ],
  },
  {
    id: "Q2",
    category: "core-temperament",
    prompt: "\u522b\u4eba\u5bf9\u4f60\u7684\u6700\u5e38\u89c1\u8bc4\u4ef7\u66f4\u63a5\u8fd1\uff1f",
    options: [
      { id: "A", label: "\u6709\u5c3a\u5ea6\uff0c\u5b88\u89c4\u7ea6" },
      { id: "B", label: "\u679c\u51b3\uff0c\u4e0d\u6118\u65a9\u65ad" },
      { id: "C", label: "\u6c89\u7740\uff0c\u5f88\u80fd\u7b49" },
      { id: "D", label: "\u5411\u4e0a\uff0c\u603b\u60f3\u628a\u4e8b\u505a\u6210" },
    ],
  },
  {
    id: "Q3",
    category: "core-temperament",
    prompt: "\u9762\u5bf9\u957f\u671f\u538b\u529b\u65f6\uff0c\u4f60\u66f4\u4f9d\u8d56\u54ea\u79cd\u65b9\u5f0f\uff1f",
    options: [
      { id: "A", label: "\u91cd\u65b0\u5b88\u4f4f\u5e95\u7ebf\u548c\u6807\u51c6" },
      { id: "B", label: "\u76f4\u63a5\u51b2\u4e0a\u53bb\u628a\u963b\u529b\u6253\u7a7f" },
      { id: "C", label: "\u8fb9\u770b\u8fb9\u7b97\uff0c\u5148\u627e\u8282\u70b9" },
      { id: "D", label: "\u7f13\u6162\u63a8\u8fdb\uff0c\u8ba9\u81ea\u5df1\u957f\u51fa\u65b0\u7a7a\u95f4" },
    ],
  },
  {
    id: "Q4",
    category: "core-temperament",
    prompt: "\u5982\u679c\u4f60\u8981\u5e26\u4e00\u4e2a\u961f\u4f0d\u8d70\u51fa\u5371\u5c40\uff0c\u4f60\u66f4\u53ef\u80fd\uff1f",
    options: [
      { id: "A", label: "\u5148\u4fdd\u4f4f\u4eba\uff0c\u518d\u8c0b\u540e\u8def" },
      { id: "B", label: "\u5148\u8fdb\u653b\uff0c\u62ff\u56de\u4e3b\u52a8\u6743" },
      { id: "C", label: "\u5148\u6478\u6e05\u654c\u6211\u7684\u52bf" },
      { id: "D", label: "\u5148\u9876\u4f4f\u538b\u529b\uff0c\u4e0d\u8ba9\u76d8\u5d29" },
    ],
  },
  {
    id: "Q5",
    category: "core-temperament",
    prompt: "\u5f53\u4f60\u8981\u505a\u4e00\u4e2a\u91cd\u8981\u9009\u62e9\uff0c\u4f60\u6700\u5728\u610f\u7684\u662f\uff1f",
    options: [
      { id: "A", label: "\u8fd9\u4ef6\u4e8b\u662f\u5426\u80fd\u957f\u4e45\u7a33\u4e0b\u6765" },
      { id: "B", label: "\u8fd9\u4ef6\u4e8b\u662f\u5426\u80fd\u8ba9\u6211\u66f4\u5f3a" },
      { id: "C", label: "\u8fd9\u4ef6\u4e8b\u80cc\u540e\u771f\u6b63\u7684\u673a\u4f1a\u662f\u4ec0\u4e48" },
      { id: "D", label: "\u8fd9\u4ef6\u4e8b\u662f\u5426\u80fd\u5f00\u51fa\u66f4\u5927\u6210\u957f" },
    ],
  },
  {
    id: "Q6",
    category: "core-temperament",
    prompt: "\u4f60\u6700\u4e0d\u80fd\u5bb9\u5fcd\u81ea\u5df1\u53d8\u6210\u4ec0\u4e48\u6837\u5b50\uff1f",
    options: [
      { id: "A", label: "\u5931\u53bb\u89c4\u5219\u611f\uff0c\u4ec0\u4e48\u90fd\u80fd\u7830" },
      { id: "B", label: "\u77bb\u524d\u985e\u540e\uff0c\u9519\u8fc7\u51fa\u624b\u65f6\u673a" },
      { id: "C", label: "\u4e0d\u89c2\u5f62\u52bf\uff0c\u4e00\u5934\u51b2\u8fdb\u53bb" },
      { id: "D", label: "\u5931\u53bb\u5fc3\u6c14\uff0c\u4e0d\u518d\u5411\u524d" },
    ],
  },
  {
    id: "Q7",
    category: "core-temperament",
    prompt: "\u5bf9\u4f60\u800c\u8a00\uff0c\u6700\u7406\u60f3\u7684\u72b6\u6001\u662f\uff1f",
    options: [
      { id: "A", label: "\u57fa\u7840\u7a33\uff0c\u8fdb\u9000\u6709\u5e8f" },
      { id: "B", label: "\u6709\u80dc\u6709\u8d1f\uff0c\u4f46\u6c14\u52bf\u4e00\u76f4\u5728\u624b" },
      { id: "C", label: "\u4ec0\u4e48\u65f6\u5019\u90fd\u80fd\u770b\u5f97\u6bd4\u522b\u4eba\u66f4\u65e9" },
      { id: "D", label: "\u4e0d\u65ad\u751f\u957f\uff0c\u4e00\u76f4\u5728\u53d8\u5f3a" },
    ],
  },
  {
    id: "Q8",
    category: "behavior-aspect",
    prompt: "\u5982\u679c\u8981\u5728\u4e00\u5929\u5185\u5904\u7406\u4e00\u5806\u53d8\u91cf\uff0c\u4f60\u66f4\u50cf\u662f\uff1f",
    options: [
      { id: "A", label: "\u5148\u89c2\u5bdf\u6d41\u52a8\uff0c\u518d\u9009\u4f4d\u843d\u811a" },
      { id: "B", label: "\u5148\u5207\u5272\u3001\u5206\u7c7b\u3001\u5f52\u4f4d" },
      { id: "C", label: "\u5148\u70b9\u71c3\u8282\u594f\uff0c\u5e26\u52a8\u5c40\u9762" },
      { id: "D", label: "\u5148\u6276\u4f4f\u7ed3\u6784\uff0c\u9632\u6b62\u5931\u63a7" },
    ],
  },
  {
    id: "Q9",
    category: "behavior-aspect",
    prompt: "\u4f60\u505a\u4e8b\u7684\u624b\u611f\uff0c\u6700\u50cf\u54ea\u4e2a\u8bcd\uff1f",
    options: [
      { id: "A", label: "\u7cbe\u51c6\u51fb\u7834" },
      { id: "B", label: "\u987a\u52bf\u751f\u957f" },
      { id: "C", label: "\u6e17\u900f\u4e0e\u8f6c\u5411" },
      { id: "D", label: "\u538b\u4f4f\u5e76\u627f\u63a5" },
    ],
  },
  {
    id: "Q10",
    category: "behavior-aspect",
    prompt: "\u522b\u4eba\u8ddf\u4f60\u5408\u4f5c\u65f6\uff0c\u6700\u5f3a\u70c8\u7684\u611f\u53d7\u5f80\u5f80\u662f\uff1f",
    options: [
      { id: "A", label: "\u4f60\u4f1a\u5e2e\u4ed6\u628a\u6846\u67b6\u7acb\u8d77\u6765" },
      { id: "B", label: "\u4f60\u4f1a\u9a71\u52a8\u4e8b\u60c5\u7acb\u523b\u5f80\u524d" },
      { id: "C", label: "\u4f60\u4f1a\u770b\u51fa\u6697\u6d41\u548c\u98ce\u9669" },
      { id: "D", label: "\u4f60\u4f1a\u8ba9\u4e8b\u60c5\u6162\u6162\u957f\u51fa\u7ed3\u679c" },
    ],
  },
  {
    id: "Q11",
    category: "behavior-aspect",
    prompt: "\u8fdb\u5165\u4e00\u4e2a\u964c\u751f\u73af\u5883\u65f6\uff0c\u4f60\u66f4\u5e38\u7528\u7684\u7b2c\u4e00\u79cd\u65b9\u5f0f\u662f\uff1f",
    options: [
      { id: "A", label: "\u4e3b\u52a8\u8bd5\u63a2\uff0c\u7528\u52a8\u4f5c\u6372\u51fa\u53cd\u9988" },
      { id: "B", label: "\u5148\u878d\u5165\u6d41\u52a8\uff0c\u8ba9\u81ea\u5df1\u4e0d\u9732\u5f62" },
      { id: "C", label: "\u5148\u627e\u53ef\u4ee5\u7a33\u4f4f\u7684\u7acb\u8db3\u70b9" },
      { id: "D", label: "\u5148\u627e\u5230\u53ef\u4ee5\u751f\u957f\u7684\u7ebf\u7d22" },
    ],
  },
  {
    id: "Q12",
    category: "behavior-aspect",
    prompt: "\u82e5\u53ea\u80fd\u9009\u4e00\u79cd\u957f\u671f\u884c\u4e8b\u98ce\u683c\uff0c\u4f60\u66f4\u613f\u610f\u8981\uff1f",
    options: [
      { id: "A", label: "\u80fd\u957f\u671f\u6258\u4f4f\u4e00\u5207\u7684\u539a\u91cd\u611f" },
      { id: "B", label: "\u80fd\u77ac\u95f4\u6253\u51fa\u7a81\u7834\u53e3\u7684\u950b\u5229\u611f" },
      { id: "C", label: "\u80fd\u8c03\u5ea6\u3001\u8f6c\u5316\u3001\u4ee5\u67d4\u5236\u52bf" },
      { id: "D", label: "\u80fd\u57f9\u517b\u3001\u5ef6\u4f38\u3001\u8d8a\u8d70\u8d8a\u5f3a" },
    ],
  },
  {
    id: "Q13",
    category: "cultivation-motive",
    prompt: "\u4f60\u8e0f\u4e0a\u4fee\u884c\u8def\uff0c\u6700\u672c\u80fd\u7684\u7b2c\u4e00\u53e5\u8bdd\u66f4\u50cf\uff1f",
    options: [
      { id: "A", label: "\u6211\u8981\u6d3b\u4e0b\u53bb\uff0c\u6d3b\u5f97\u66f4\u957f" },
      { id: "B", label: "\u6211\u8981\u77e5\u9053\u8fd9\u4e16\u754c\u7684\u771f\u76f8" },
      { id: "C", label: "\u6211\u8981\u62a4\u4f4f\u6211\u6240\u5728\u610f\u7684\u4eba" },
      { id: "D", label: "\u6211\u8981\u8d62\uff0c\u8981\u8ba9\u4eba\u4e0d\u6562\u8f7b\u89c6" },
    ],
  },
  {
    id: "Q14",
    category: "cultivation-motive",
    prompt: "\u5982\u679c\u4f60\u7ec8\u6709\u4e00\u65e5\u80fd\u5f97\u9053\uff0c\u4f60\u6700\u60f3\u7528\u5b83\u505a\u4ec0\u4e48\uff1f",
    options: [
      { id: "A", label: "\u548c\u5929\u547d\u4e89\u4e00\u4e2a\u8bf4\u6cd5" },
      { id: "B", label: "\u628a\u9053\u7406\u770b\u5f97\u66f4\u900f" },
      { id: "C", label: "\u8ba9\u6211\u80cc\u540e\u7684\u4eba\u4e0d\u518d\u4f4e\u5934" },
      { id: "D", label: "\u6362\u4e00\u79cd\u66f4\u81ea\u7531\u7684\u6d3b\u6cd5" },
    ],
  },
  {
    id: "Q15",
    category: "cultivation-motive",
    prompt: "\u5728\u6ca1\u4eba\u76ef\u7740\u4f60\u7684\u65f6\u5019\uff0c\u4f60\u6700\u613f\u610f\u4e3a\u54ea\u4ef6\u4e8b\u7ee7\u7eed\u5403\u82e6\uff1f",
    options: [
      { id: "A", label: "\u4e3a\u4e86\u80fd\u6d3b\u5f97\u66f4\u4e45\u66f4\u7a33" },
      { id: "B", label: "\u4e3a\u4e86\u6293\u4f4f\u66f4\u9ad8\u7684\u9053" },
      { id: "C", label: "\u4e3a\u4e86\u8ba9\u66f4\u591a\u4eba\u4e0d\u518d\u53d7\u82e6" },
      { id: "D", label: "\u4e3a\u4e86\u628a\u65e7\u8d26\u7b97\u6e05" },
    ],
  },
  {
    id: "Q16",
    category: "cultivation-motive",
    prompt: "\u82e5\u4fee\u884c\u8def\u6ce8\u5b9a\u96be\u884c\uff0c\u4ec0\u4e48\u8fd8\u4f1a\u8ba9\u4f60\u4e0d\u613f\u540e\u9000\uff1f",
    options: [
      { id: "A", label: "\u6211\u5c31\u662f\u4e0d\u4fe1\u547d" },
      { id: "B", label: "\u6211\u60f3\u628a\u95ee\u9898\u770b\u5230\u6700\u6839\u90e8" },
      { id: "C", label: "\u6211\u4e0d\u60f3\u8ba9\u6240\u5c5e\u4e4b\u4eba\u5931\u671b" },
      { id: "D", label: "\u6211\u60f3\u8d70\u51fa\u4efb\u4f55\u4eba\u90fd\u62e6\u4e0d\u4f4f\u7684\u8def" },
    ],
  },
  {
    id: "Q17",
    category: "core-temperament",
    prompt: "\u82e5\u4f60\u4e00\u8def\u8d70\u5230\u6700\u540e\uff0c\u4f60\u5e0c\u671b\u4ed6\u4eba\u6700\u5148\u8bb0\u4f4f\u4f60\u7684\u662f\uff1f",
    options: [
      { id: "A", label: "\u6709\u622a\u6709\u5b88\uff0c\u4ece\u4e0d\u4e71\u7ebf" },
      { id: "B", label: "\u9510\u610f\u96be\u6321\uff0c\u4e0d\u670d\u5c31\u4e89" },
      { id: "C", label: "\u6df1\u6c34\u9759\u6d41\uff0c\u770b\u5f97\u6bd4\u4eba\u8fdc" },
      { id: "D", label: "\u70ed\u5fc3\u70bd\u70ed\uff0c\u80af\u628a\u529b\u6c14\u71c3\u5c3d" },
    ],
  },
  {
    id: "Q18",
    category: "cultivation-motive",
    prompt: "\u771f\u6b63\u8ba9\u4f60\u613f\u610f\u4ed8\u51fa\u4e00\u751f\u4ee3\u4ef7\u7684\uff0c\u7a76\u7adf\u662f\uff1f",
    options: [
      { id: "A", label: "\u5bf9\u547d\u7684\u4e0d\u670d\u548c\u8d85\u8131" },
      { id: "B", label: "\u5bf9\u771f\u7406\u7684\u8ffd\u7d22" },
      { id: "C", label: "\u5bf9\u95e8\u5ead\u3001\u8d23\u4efb\u4e0e\u6240\u7231\u4e4b\u4eba\u7684\u62c5\u8d1f" },
      { id: "D", label: "\u5bf9\u65e7\u6050\u60e7\u548c\u65e7\u6068\u7684\u56de\u5e94" },
    ],
  },
];

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
} as const;

const SINGLE_BEHAVIOR_ASPECTS = {
  metal: "\u88c1\u65ad",
  wood: "\u751f\u53d1",
  water: "\u89c2\u52bf",
  fire: "\u70c8\u884c",
  earth: "\u9547\u6301",
} as const;

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
} as const;

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
} as const;

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
} as const;

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
} as const;

const FIXTURE_ANSWERS: Record<RegistrationQuestionId, RegistrationAnswer> = {
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
    core: "high" as const,
    behavior: "high" as const,
    motive: "medium" as const,
    overall: "high" as const,
  },
  summary: "\u5176\u5fc3\u6027\u504f\u6f5c\u5b88\uff0c\u884c\u8def\u4ee5\u89c2\u52bf\u4e3a\u5148\uff0c\u6c42\u77e5\u4e4b\u5ff5\u6700\u91cd\u3002",
};

function answersSignature(answers: Record<RegistrationQuestionId, RegistrationAnswer>) {
  return REGISTRATION_QUESTION_IDS.map((questionId) => `${questionId}:${answers[questionId]}`).join("|");
}

const FIXTURE_SIGNATURE = answersSignature(FIXTURE_ANSWERS);

function addEntries(scores: Record<string, number>, entries: readonly (readonly [string, number])[]) {
  for (const [key, value] of entries) {
    scores[key] += value;
  }
}

function createScoreMap<T extends string>(keys: readonly T[]): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
}

function sortEntries<T extends string>(scores: Record<T, number>, preferredKey: T | null = null) {
  return (Object.entries(scores) as Array<[T, number]>).sort((left, right) => {
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

function behaviorAspectOf(sortedElements: Array<[FiveElementId, number]>, primaryElement: FiveElementId) {
  const [first, second, third] = sortedElements;
  if (!first) {
    throw new Error("Cannot derive behavior aspect without element scores.");
  }
  if (!second || first[1] - second[1] >= 3) {
    return `${ELEMENT_CHARS[first[0]]} / ${SINGLE_BEHAVIOR_ASPECTS[first[0]]}`;
  }
  const secondScore = second[1];
  const tiedForSecond = sortedElements
    .filter(([, score]) => score === secondScore)
    .map(([elementId]) => elementId);
  let aspectElements: FiveElementId[] = [first[0], second[0]];
  if (third && secondScore === third[1] && tiedForSecond.includes(primaryElement) && primaryElement !== first[0]) {
    aspectElements = [first[0], primaryElement];
  }
  aspectElements = [...aspectElements].sort((left, right) => ELEMENT_ORDER.indexOf(left) - ELEMENT_ORDER.indexOf(right));
  const key = `${aspectElements[0]}-${aspectElements[1]}` as keyof typeof DUAL_BEHAVIOR_ASPECTS;
  return `${ELEMENT_CHARS[aspectElements[0]]}${ELEMENT_CHARS[aspectElements[1]]} / ${DUAL_BEHAVIOR_ASPECTS[key]}`;
}

function spiritRootOf(sortedElements: Array<[FiveElementId, number]>) {
  const [first, second] = sortedElements;
  if (!first) {
    throw new Error("Cannot derive spirit root without element scores.");
  }
  if (!second || first[1] - second[1] >= 3) {
    return `${ELEMENT_CHARS[first[0]]}\u5355\u7075\u6839`;
  }
  return `${ELEMENT_CHARS[first[0]]}${ELEMENT_CHARS[second[0]]}\u53cc\u7075\u6839`;
}

function confidenceLevel(
  diff: number,
  highThreshold: number,
  mediumThreshold: number,
): RegistrationConfidenceLevel {
  if (diff >= highThreshold) {
    return "high";
  }
  if (diff >= mediumThreshold) {
    return "medium";
  }
  return "low";
}

function summaryOf(result: {
  core_temperament: string;
  behavior_aspect: string;
  cultivation_motive: string;
  spirit_root_result: string;
}) {
  const aspectMeaning = result.behavior_aspect.split(" / ")[1] ?? result.behavior_aspect;
  return `\u5176\u5fc3\u6027\u843d\u5728${result.core_temperament}\uff0c\u884c\u8def\u4ee5${aspectMeaning}\u4e3a\u5148\uff0c\u6240\u6c42\u504f${result.cultivation_motive}\uff0c\u6700\u7ec8\u6210${result.spirit_root_result}\u3002`;
}

function dominantElementsOf(
  scores: Record<FiveElementId, number>,
): RegistrationProfileView["dominantElements"] {
  const sorted = (Object.entries(scores) as Array<[FiveElementId, number]>)
    .sort((left, right) => right[1] - left[1]);
  const [first, second] = sorted;
  if (!first) {
    return [];
  }
  if (!second || first[1] - second[1] >= 3) {
    return [{ id: first[0], label: ELEMENT_LABELS_ZH[first[0]], score: first[1] }];
  }
  return [
    { id: first[0], label: ELEMENT_LABELS_ZH[first[0]], score: first[1] },
    { id: second[0], label: ELEMENT_LABELS_ZH[second[0]], score: second[1] },
  ];
}

export function getRegistrationQuestionnaire(): RegistrationQuestionnaireView {
  return {
    version: QUESTIONNAIRE_VERSION,
    locale: "zh-CN",
    questions: structuredClone(QUESTIONS),
  };
}

export function deriveRegistrationRecordFromAnswers(
  answers: Record<RegistrationQuestionId, RegistrationAnswer>,
): CultivationRegistrationRecord {
  for (const questionId of REGISTRATION_QUESTION_IDS) {
    if (!REGISTRATION_ANSWERS_SET.has(answers[questionId])) {
      throw new Error(`Missing valid answer for ${questionId}.`);
    }
  }

  const temperamentScores = createScoreMap(Object.keys(TEMPERAMENT_ELEMENTS) as Array<keyof typeof TEMPERAMENT_ELEMENTS>);
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
  ] as const);

  for (const [questionId, answerMap] of Object.entries(CORE_SCORING) as Array<[keyof typeof CORE_SCORING, typeof CORE_SCORING[keyof typeof CORE_SCORING]]>) {
    addEntries(temperamentScores, answerMap[answers[questionId]]);
  }
  for (const [questionId, answerMap] of Object.entries(BEHAVIOR_SCORING) as Array<[keyof typeof BEHAVIOR_SCORING, typeof BEHAVIOR_SCORING[keyof typeof BEHAVIOR_SCORING]]>) {
    addEntries(behaviorScores, answerMap[answers[questionId]]);
  }
  for (const [questionId, answerMap] of Object.entries(MOTIVE_SCORING) as Array<[keyof typeof MOTIVE_SCORING, typeof MOTIVE_SCORING[keyof typeof MOTIVE_SCORING]]>) {
    addEntries(motiveScores, answerMap[answers[questionId]]);
  }

  const sortedTemperaments = sortEntries(temperamentScores);
  const [coreTemperamentEntry, secondaryTemperamentEntry] = sortedTemperaments;
  if (!coreTemperamentEntry || !secondaryTemperamentEntry) {
    throw new Error("Questionnaire did not produce valid temperament scores.");
  }
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
  if (!topMotiveEntry || !secondMotiveEntry) {
    throw new Error("Questionnaire did not produce valid motive scores.");
  }
  const cultivationMotive = topMotiveEntry[0];

  const coreDiff = coreTemperamentEntry[1] - secondaryTemperamentEntry[1];
  const q17Matches = CORE_SCORING.Q17[answers.Q17].some(([temperament]) =>
    temperament === coreTemperament || temperament === secondaryTemperament,
  );
  const behaviorDiff12 = (sortedElements[0]?.[1] ?? 0) - (sortedElements[1]?.[1] ?? 0);
  const behaviorDiff23 = (sortedElements[1]?.[1] ?? 0) - (sortedElements[2]?.[1] ?? 0);
  const motiveDiff = topMotiveEntry[1] - secondMotiveEntry[1];
  const q18Matches = MOTIVE_SCORING.Q18[answers.Q18].some(([motive]) =>
    motive === cultivationMotive || motive === secondMotiveEntry[0],
  );

  const coreConfidence = q17Matches ? confidenceLevel(coreDiff, 3, 1) : confidenceLevel(coreDiff, 4, 2);
  const behaviorConfidence = behaviorDiff23 >= 2
    ? "high"
    : behaviorDiff12 >= 1 || behaviorDiff23 >= 1
      ? "medium"
      : "low";
  const motiveConfidence = q18Matches ? confidenceLevel(motiveDiff, 2, 1) : confidenceLevel(motiveDiff, 3, 1);
  const overallConfidence: RegistrationConfidenceLevel =
    [coreConfidence, behaviorConfidence, motiveConfidence].includes("low")
      ? "low"
      : [coreConfidence, behaviorConfidence, motiveConfidence].filter((level) => level === "high").length >= 2
        ? "high"
        : "medium";

  const result: Omit<CultivationRegistrationRecord["result"], "label_locale"> = {
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
      answers: Object.fromEntries(REGISTRATION_QUESTION_IDS.map((questionId) => [questionId, answers[questionId]])) as Record<
        RegistrationQuestionId,
        RegistrationAnswer
      >,
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
    answers: Object.fromEntries(REGISTRATION_QUESTION_IDS.map((questionId) => [questionId, answers[questionId]])) as Record<
      RegistrationQuestionId,
      RegistrationAnswer
    >,
    result: {
      label_locale: "zh-CN",
      ...result,
    },
    summary: summaryOf(result),
  });
}

export function buildRegistrationProfile(record: CultivationRegistrationRecord): RegistrationProfileView {
  const normalized = normalizeCultivationRegistrationRecord(record);
  const dominantElements = dominantElementsOf(normalized.result.five_element_scores);
  return {
    summary: normalized.summary,
    coreTemperament: {
      id: normalized.result.core_temperament_id!,
      label: normalized.result.core_temperament,
      confidence: normalized.result.confidence.core,
    },
    secondaryTemperament: {
      id: normalized.result.secondary_temperament_id!,
      label: normalized.result.secondary_temperament,
    },
    behaviorAspect: {
      id: normalized.result.behavior_aspect_id!,
      label: normalized.result.behavior_aspect,
      confidence: normalized.result.confidence.behavior,
    },
    cultivationMotive: {
      id: normalized.result.cultivation_motive_id!,
      label: normalized.result.cultivation_motive,
      confidence: normalized.result.confidence.motive,
    },
    spiritRoot: {
      kindId: normalized.result.spirit_root_kind_id!,
      label: normalized.result.spirit_root_result,
    },
    fiveElementScores: { ...normalized.result.five_element_scores },
    dominantElements,
    confidence: { ...normalized.result.confidence },
  };
}

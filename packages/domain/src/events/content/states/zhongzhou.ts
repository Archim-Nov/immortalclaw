import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Posted Reward Ledger",
    titleCn: "官署赏榜",
    description: "A formally posted reward leaves room for quiet collection and clean payout.",
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Archive Margin Note",
    titleCn: "档册旁注",
    description: "A meticulous note in a registry reveals an efficient cultivation principle.",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "Hall of Discipline",
    titleCn: "清律定神",
    description: "The order of Zhongzhou steadies your breathing and sharpens your restraint.",
    baseWeight: 1.05,
    effects: { statusEffects: [{ effectId: "clear-mind", ticks: 4 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Patrol Drill",
    titleCn: "巡城操演",
    description: "A public drill reminds you that discipline can be a kind of cultivation.",
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Fugitive Sweep",
    titleCn: "缉逃交手",
    description: "A routine pursuit turns into a brief but costly exchange.",
    baseWeight: 0.95,
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Courier Route Rehearsal",
    titleCn: "驿路演练",
    description: "Helping the relay office teaches route discipline and earns travel pay.",
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Sect Liaison Desk",
    titleCn: "接引案牍",
    description: "A sect liaison office pays for clean paperwork and reliable presence.",
    baseWeight: 1.15,
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Witness Statement",
    titleCn: "证词取舍",
    description: "An official hints that one adjusted statement would make life easier for everyone important.",
    effects: {},
    moralityChoice: {
      title: "Zhongzhou Witness Statement",
      prompt: "You are asked to shade testimony against a weaker rogue cultivator. Which line do you hold?",
      expiresInTicks: 6,
      options: [
        {
          id: "truth",
          label: "Keep the record true",
          summary: "Protect procedure even if it closes a political shortcut.",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "favor",
          label: "Trade for favor",
          summary: "Bend the record and take the quiet reward.",
          moralityDelta: -3,
          effectBundle: {
            spiritStones: 35,
          },
        },
      ] as const,
    },
  },
  {
    slot: "h-03",
    semanticType: "human",
    resultType: "status",
    title: "Inspection Talisman",
    titleCn: "巡检凭符",
    description: "A stamped pass grants you a short window of safer movement through monitored routes.",
    baseWeight: 1.1,
    effects: {
      spiritStones: 30,
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
] as const satisfies readonly StateEventRow[];

export function buildZhongzhouEventPack() {
  return buildStateEventPack("zhongzhou", ROWS);
}

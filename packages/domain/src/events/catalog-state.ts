import type { StateId } from "../constants.js";
import type { EventTemplate } from "../events.js";

const STATE_EVENT_PREFIX: Record<StateId, string> = {
  qingzhou: "qz",
  yangzhou: "yz",
  zhongzhou: "zz",
  shuzhou: "sz",
  youzhou: "uz",
  liangzhou: "lz",
  leizhou: "rz",
  cangzhou: "cz",
  wanzhou: "wz",
};

export function buildStateSpecificEvents(stateId: StateId): EventTemplate[] {
  const prefix = STATE_EVENT_PREFIX[stateId];
  const label = stateId;
  const base = [
    { id: `${prefix}-f-01`, semanticType: "fortune", resultType: "resource", title: "Local Herb Cache", titleCn: "州特灵草", effects: { spiritStones: 45 } },
    { id: `${prefix}-f-02`, semanticType: "fortune", resultType: "progression", title: "Regional Stele", titleCn: "州域残碑", effects: { realmProgress: 4 } },
    { id: `${prefix}-f-03`, semanticType: "fortune", resultType: "status", title: "Clean Wind", titleCn: "清风洗尘", effects: { statusEffects: [{ effectId: "clear-mind", ticks: 4 }] } },
    { id: `${prefix}-t-01`, semanticType: "training", resultType: "progression", title: "Route Drill", titleCn: "行路操练", effects: { realmProgress: 3 } },
    { id: `${prefix}-t-02`, semanticType: "training", resultType: "combat", title: "Local Beast", titleCn: "州野妖兽", effects: { qi: -9, spiritStones: 20 } },
    { id: `${prefix}-t-03`, semanticType: "training", resultType: "resource", title: "Terrain Harvest", titleCn: "地形采集", effects: { spiritStones: 35 } },
    { id: `${prefix}-h-01`, semanticType: "human", resultType: "resource", title: "Sect Courier", titleCn: "宗门传信", effects: { spiritStones: 35, reputationChange: 1 } },
    {
      id: `${prefix}-h-02`,
      semanticType: "human",
      resultType: "story",
      title: "Hidden Local",
      titleCn: "山间隐者",
      effects: {},
      moralityChoice: {
        title: `${label}-Hidden Local`,
        prompt: "A local guide offers a shortcut that also exposes a weaker rival. Choose your approach.",
        expiresInTicks: 6,
        options: [
          {
            id: "warn",
            label: "Warn the rival",
            summary: "Keep the local peace even if you lose the shortcut.",
            moralityDelta: 3,
            effectBundle: {
              reputationChange: 1,
            },
          },
          {
            id: "betray",
            label: "Take the shortcut",
            summary: "Use the tip for personal gain and ignore the fallout.",
            moralityDelta: -3,
            effectBundle: {
              spiritStones: 35,
            },
          },
        ] as const,
      },
    },
    { id: `${prefix}-h-03`, semanticType: "human", resultType: "status", title: "Supply Contract", titleCn: "物资求购", effects: { spiritStones: 30, statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
  ] as const;

  return base.map((row) => ({
    id: row.id,
    layer: "state-specific" as const,
    source: "exploration" as const,
    semanticType: row.semanticType,
    resultType: row.resultType,
    name: `${label}-${row.title}`,
    nameCn: row.titleCn,
    description: `${label} local event: ${row.title}.`,
    baseWeight: 1,
    stateId,
    nodeType: null,
    minRealm: null,
    effects: row.effects,
    ...("moralityChoice" in row ? { moralityChoice: row.moralityChoice } : {}),
  }));
}

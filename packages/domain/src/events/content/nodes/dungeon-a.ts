import type { EventTemplate } from "../../../events.js";
import type { Location } from "../../../model.js";

import { buildNodeEvent } from "./shared.js";

export function buildDungeonAEventPack(location: Location): EventTemplate[] {
  return [
    buildNodeEvent(location, {
      idSuffix: "vault-break",
      semanticType: "fortune",
      resultType: "resource",
      nameSuffix: "Vault Break",
      description: `A breached vault in ${location.name} offers a rare high-tier haul if you can stabilize it.`,
      baseWeight: 1,
      effects: {
        spiritStones: 90,
        itemRewards: [
          { itemId: "ruin-fragment", count: 2 },
          { itemId: "ward-talisman", count: 1 },
        ],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: "miasma-well",
      semanticType: "training",
      resultType: "status",
      nameSuffix: "Miasma Well",
      description: `Ancient miasma rising through ${location.name} taxes both qi and spirit.`,
      baseWeight: 1.1,
      effects: {
        qi: -14,
        spiritualPower: -10,
        statusEffects: [{ effectId: "poisoned", ticks: 3 }],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: "guardian-echo",
      semanticType: "training",
      resultType: "combat",
      nameSuffix: "Guardian Echo",
      description: `A dormant guardian echo in ${location.name} lashes out before fading back into the stone.`,
      baseWeight: 0.8,
      effects: {
        qi: -18,
        injuryTicksRemaining: 3,
        realmProgress: 8,
      },
    }),
    buildNodeEvent(location, {
      idSuffix: "survivor-clue",
      semanticType: "human",
      resultType: "status",
      nameSuffix: "Survivor Clue",
      description: `Marks left by a prior survivor reveal one safer route through ${location.name}.`,
      baseWeight: 0.7,
      effects: {
        itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
        statusEffects: [{ effectId: "fortune-marked", ticks: 3 }],
      },
    }),
  ];
}

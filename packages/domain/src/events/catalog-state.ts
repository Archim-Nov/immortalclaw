import type { StateId } from "../constants.js";
import type { EventTemplate } from "../events.js";

import { explorationSceneRowsFor } from "./content/scene-choices.js";
import { buildStateEventPack } from "./content/states/template.js";
import { EXPLORATION_FLAVOR } from "./content/states/flavor-rows.js";
import { EXPLORATION_MORE } from "./content/states/exploration-more.js";
import { buildCangzhouEventPack } from "./content/states/cangzhou.js";
import { buildLeizhouEventPack } from "./content/states/leizhou.js";
import { buildLiangzhouEventPack } from "./content/states/liangzhou.js";
import { buildQingzhouEventPack } from "./content/states/qingzhou.js";
import { buildShuzhouEventPack } from "./content/states/shuzhou.js";
import { buildWanzhouEventPack } from "./content/states/wanzhou.js";
import { buildYangzhouEventPack } from "./content/states/yangzhou.js";
import { buildYouzhouEventPack } from "./content/states/youzhou.js";
import { buildZhongzhouEventPack } from "./content/states/zhongzhou.js";

const STATE_PACK_BUILDERS: Record<string, () => EventTemplate[]> = {
  qingzhou: buildQingzhouEventPack,
  yangzhou: buildYangzhouEventPack,
  zhongzhou: buildZhongzhouEventPack,
  shuzhou: buildShuzhouEventPack,
  youzhou: buildYouzhouEventPack,
  liangzhou: buildLiangzhouEventPack,
  leizhou: buildLeizhouEventPack,
  cangzhou: buildCangzhouEventPack,
  wanzhou: buildWanzhouEventPack,
};

export function buildStateSpecificEvents(stateId: string): EventTemplate[] {
  const base = STATE_PACK_BUILDERS[stateId]?.() ?? [];
  const extra = EXPLORATION_MORE[stateId];
  const flavor = EXPLORATION_FLAVOR[stateId];
  const scene = explorationSceneRowsFor(stateId);
  return [
    ...base,
    ...(extra?.length ? buildStateEventPack(stateId as StateId, extra) : []),
    ...(flavor?.length ? buildStateEventPack(stateId as StateId, flavor) : []),
    ...(scene.length ? buildStateEventPack(stateId as StateId, scene) : []),
  ];
}

import type { StateId } from "../constants.js";
import type { EventTemplate } from "../events.js";

import { buildStateEventPack } from "./content/states/template.js";
import { TRAVEL_STATE_MORE } from "./content/travel/state-more.js";
import { buildCangzhouTravelEventPack } from "./content/travel/states/cangzhou.js";
import { buildLeizhouTravelEventPack } from "./content/travel/states/leizhou.js";
import { buildLiangzhouTravelEventPack } from "./content/travel/states/liangzhou.js";
import { buildQingzhouTravelEventPack } from "./content/travel/states/qingzhou.js";
import { buildShuzhouTravelEventPack } from "./content/travel/states/shuzhou.js";
import { buildWanzhouTravelEventPack } from "./content/travel/states/wanzhou.js";
import { buildYangzhouTravelEventPack } from "./content/travel/states/yangzhou.js";
import { buildYouzhouTravelEventPack } from "./content/travel/states/youzhou.js";
import { buildZhongzhouTravelEventPack } from "./content/travel/states/zhongzhou.js";

const STATE_TRAVEL_PACK_BUILDERS: Record<string, () => EventTemplate[]> = {
  qingzhou: buildQingzhouTravelEventPack,
  yangzhou: buildYangzhouTravelEventPack,
  zhongzhou: buildZhongzhouTravelEventPack,
  shuzhou: buildShuzhouTravelEventPack,
  youzhou: buildYouzhouTravelEventPack,
  liangzhou: buildLiangzhouTravelEventPack,
  leizhou: buildLeizhouTravelEventPack,
  cangzhou: buildCangzhouTravelEventPack,
  wanzhou: buildWanzhouTravelEventPack,
};

export function buildTravelStateSpecificEvents(stateId: string): EventTemplate[] {
  const base = STATE_TRAVEL_PACK_BUILDERS[stateId]?.() ?? [];
  const extra = TRAVEL_STATE_MORE[stateId];
  if (!extra?.length) {
    return base;
  }
  return [...base, ...buildStateEventPack(stateId as StateId, extra, "travel")];
}

import type { EventTemplate } from "../events.js";

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
  return STATE_PACK_BUILDERS[stateId]?.() ?? [];
}

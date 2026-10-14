import type { EventTemplate } from "../events.js";
import type { Location } from "../model.js";

import { buildDungeonStateSingletons } from "./content/nodes/dungeon-singletons.js";
import { buildCangzhouDungeonEventPack } from "./content/nodes/states/cangzhou.js";
import { buildLeizhouDungeonEventPack } from "./content/nodes/states/leizhou.js";
import { buildLiangzhouDungeonEventPack } from "./content/nodes/states/liangzhou.js";
import { buildQingzhouDungeonEventPack } from "./content/nodes/states/qingzhou.js";
import { buildShuzhouDungeonEventPack } from "./content/nodes/states/shuzhou.js";
import { buildWanzhouDungeonEventPack } from "./content/nodes/states/wanzhou.js";
import { buildYangzhouDungeonEventPack } from "./content/nodes/states/yangzhou.js";
import { buildYouzhouDungeonEventPack } from "./content/nodes/states/youzhou.js";
import { buildZhongzhouDungeonEventPack } from "./content/nodes/states/zhongzhou.js";

const STATE_DUNGEON_PACK_BUILDERS: Record<string, (location: Location) => EventTemplate[]> = {
  qingzhou: buildQingzhouDungeonEventPack,
  yangzhou: buildYangzhouDungeonEventPack,
  zhongzhou: buildZhongzhouDungeonEventPack,
  shuzhou: buildShuzhouDungeonEventPack,
  youzhou: buildYouzhouDungeonEventPack,
  liangzhou: buildLiangzhouDungeonEventPack,
  leizhou: buildLeizhouDungeonEventPack,
  cangzhou: buildCangzhouDungeonEventPack,
  wanzhou: buildWanzhouDungeonEventPack,
};

export function buildDungeonStateOverlayEvents(location: Location): EventTemplate[] {
  const pack = STATE_DUNGEON_PACK_BUILDERS[location.stateId]?.(location) ?? [];
  return [...pack, ...buildDungeonStateSingletons(location)];
}

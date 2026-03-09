import type {
  ActionExecutionResult,
  ActionId,
  ActionJob,
  AvailableAction,
  Cultivator,
  CultivatorStateView,
  ImmediateActionId,
  ItemId,
  TickSummary,
  TimedActionId,
  TribulationPreview,
  WorldState,
  ZoneId,
} from "./model.js";

const TICKS_PER_YEAR = 4380;

const TRAVEL_ACTIONS: Array<{
  actionId: TimedActionId;
  targetZoneId: ZoneId;
  label: string;
}> = [
  { actionId: "travel-town", targetZoneId: "mortal-town", label: "返回凡人城镇" },
  { actionId: "travel-market", targetZoneId: "market", label: "前往修仙坊市" },
  { actionId: "travel-sect-gate", targetZoneId: "sect-gate", label: "前往宗门山门" },
  { actionId: "travel-spirit-mine", targetZoneId: "spirit-mine", label: "前往灵脉矿洞" },
  { actionId: "travel-mystic-ruins", targetZoneId: "mystic-ruins", label: "前往秘境遗迹" },
  {
    actionId: "travel-healing-sanctuary",
    targetZoneId: "healing-sanctuary",
    label: "前往疗伤圣地",
  },
];

const ACTION_DURATIONS: Record<TimedActionId, number> = {
  "travel-town": 1,
  "travel-market": 1,
  "travel-sect-gate": 1,
  "travel-spirit-mine": 1,
  "travel-mystic-ruins": 1,
  "travel-healing-sanctuary": 1,
  meditate: 1,
  heal: 2,
  cultivate: 4,
  "take-mortal-task": 2,
  "mine-spirit-stones": 3,
  "search-fortune": 3,
};

function getCultivatorOrThrow(world: WorldState, cultivatorId: string): Cultivator {
  const cultivator = world.cultivators[cultivatorId];
  if (!cultivator) {
    throw new Error(`Cultivator not found: ${cultivatorId}`);
  }
  return cultivator;
}

function getStatus(cultivator: Cultivator): "idle" | "busy" | "injured" {
  if (cultivator.activeJobId) {
    return "busy";
  }
  if (cultivator.injuryTicksRemaining > 0) {
    return "injured";
  }
  return "idle";
}

function nextRealmForLevel(level: number): Cultivator["realm"] {
  if (level <= 3) {
    return "炼气";
  }
  if (level <= 6) {
    return "筑基";
  }
  return "金丹";
}

function createJob(
  world: WorldState,
  cultivatorId: string,
  actionId: TimedActionId,
  label: string,
): ActionJob {
  const id = `job-${world.nextJobSequence++}`;
  return {
    id,
    cultivatorId,
    actionId,
    label,
    remainingTicks: ACTION_DURATIONS[actionId],
    totalTicks: ACTION_DURATIONS[actionId],
  };
}

function addDaoLog(
  world: WorldState,
  cultivatorId: string,
  title: string,
  content: string,
  tags: string[],
): void {
  world.daoLogs.unshift({
    id: `log-${world.nextLogSequence++}`,
    cultivatorId,
    tick: world.tick,
    title,
    content,
    tags,
  });
}

function addMessage(
  world: WorldState,
  cultivatorId: string,
  from: string,
  subject: string,
  content: string,
): void {
  world.messages.unshift({
    id: `msg-${world.nextMessageSequence++}`,
    cultivatorId,
    tick: world.tick,
    from,
    subject,
    content,
  });
}

function getTravelTarget(actionId: TimedActionId): ZoneId | null {
  const travel = TRAVEL_ACTIONS.find((item) => item.actionId === actionId);
  return travel ? travel.targetZoneId : null;
}

function getTribulationDifficulty(cultivator: Cultivator): number {
  if (cultivator.realm === "筑基") {
    return 45;
  }
  if (cultivator.realm === "金丹") {
    return 70;
  }
  return 0;
}

function getTribulationType(cultivator: Cultivator): string {
  if (cultivator.realm === "筑基") {
    return "筑基雷劫";
  }
  if (cultivator.realm === "金丹") {
    return "金丹心魔劫";
  }
  return "暂无";
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (const char of input) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function requireIdle(cultivator: Cultivator): void {
  if (cultivator.activeJobId) {
    throw new Error("Cultivator is already executing another action.");
  }
}

function requireNotInjured(cultivator: Cultivator, actionId: ActionId): void {
  if (cultivator.injuryTicksRemaining <= 0) {
    return;
  }
  const allowed = new Set<ActionId>([
    "heal",
    "meditate",
    "travel-healing-sanctuary",
    "use-healing-pill",
    "use-qi-pill",
  ]);
  if (!allowed.has(actionId)) {
    throw new Error("Cultivator is injured and can only rest, heal, or travel to the sanctuary.");
  }
}

function getTimedActionLabel(actionId: TimedActionId): string {
  const travel = TRAVEL_ACTIONS.find((item) => item.actionId === actionId);
  if (travel) {
    return travel.label;
  }
  switch (actionId) {
    case "meditate":
      return "打坐恢复";
    case "heal":
      return "疗伤闭关";
    case "cultivate":
      return "闭关修炼";
    case "take-mortal-task":
      return "接取凡间任务";
    case "mine-spirit-stones":
      return "采集灵石";
    case "search-fortune":
      return "秘境寻缘";
  }
  throw new Error(`Unknown timed action: ${actionId}`);
}

function getNearbyOpportunities(world: WorldState, cultivator: Cultivator): string[] {
  switch (cultivator.locationId) {
    case "mortal-town":
      return ["凡人商会在招募护送修士", "附近富户愿出灵石求购护身符"];
    case "market":
      return ["坊市摊主今日新到一批疗伤丹", "有人在谈论秘境遗迹出现残缺剑经"];
    case "sect-gate":
      return ["青云宗正在收录外门弟子", "山门执事正在统计本月宗门贡献"];
    case "spirit-mine":
      return ["矿洞深处灵气波动异常，可能有富矿", "有修士因争矿负伤退场"];
    case "mystic-ruins":
      return ["残破石碑上隐约可见功法残篇", "遗迹外围出现了新的禁制裂缝"];
    case "healing-sanctuary":
      return ["圣地的药泉能缓解暗伤", "有前辈提醒近期天象不稳，宜静修备劫"];
  }
}

function maybeBreakthrough(world: WorldState, cultivator: Cultivator): string | null {
  if (cultivator.realmLevel >= 9 || cultivator.realmProgress < 100) {
    return null;
  }

  cultivator.realmProgress -= 100;
  cultivator.realmLevel += 1;
  const previousRealm = cultivator.realm;
  cultivator.realm = nextRealmForLevel(cultivator.realmLevel);
  cultivator.maxQi += 12;
  cultivator.maxSpiritualPower += 12;
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  cultivator.lifespan += cultivator.realm === previousRealm ? 12 : 120;

  const summary =
    previousRealm === cultivator.realm
      ? `${cultivator.name} 在 ${cultivator.realm} 中更进一步，修为提升至 Lv ${cultivator.realmLevel}。`
      : `${cultivator.name} 一举突破至 ${cultivator.realm}，寿元与气海同时扩张。`;

  addDaoLog(world, cultivator.id, "破境", summary, ["realm", "breakthrough"]);
  addMessage(world, cultivator.id, "天机记录", "境界变动", summary);
  return summary;
}

function resolveTimedJob(world: WorldState, job: ActionJob): string {
  const cultivator = getCultivatorOrThrow(world, job.cultivatorId);
  cultivator.activeJobId = null;

  switch (job.actionId) {
    case "travel-town":
    case "travel-market":
    case "travel-sect-gate":
    case "travel-spirit-mine":
    case "travel-mystic-ruins":
    case "travel-healing-sanctuary": {
      const targetZoneId = getTravelTarget(job.actionId);
      if (!targetZoneId) {
        throw new Error(`Travel target not found for action ${job.actionId}`);
      }
      cultivator.locationId = targetZoneId;
      const zone = world.zones[targetZoneId];
      const summary = `${cultivator.name} 已抵达 ${zone.name}。`;
      addDaoLog(
        world,
        cultivator.id,
        "行路",
        `脚下清风渐止，${summary}`,
        ["travel", targetZoneId],
      );
      return summary;
    }
    case "meditate": {
      cultivator.spiritualPower = clamp(
        cultivator.spiritualPower + 28,
        0,
        cultivator.maxSpiritualPower,
      );
      const summary = `${cultivator.name} 调息一周天，灵力恢复至 ${cultivator.spiritualPower}/${cultivator.maxSpiritualPower}。`;
      addDaoLog(
        world,
        cultivator.id,
        "调息",
        "灵息归海，杂念稍散。短暂的静坐虽不能立刻破境，却能把摇晃的根基重新按稳。",
        ["rest", "spiritual-power"],
      );
      return summary;
    }
    case "heal": {
      cultivator.qi = clamp(cultivator.qi + 45, 0, cultivator.maxQi);
      cultivator.injuryTicksRemaining = Math.max(0, cultivator.injuryTicksRemaining - 4);
      const summary = `${cultivator.name} 伤势稳定，气血恢复至 ${cultivator.qi}/${cultivator.maxQi}。`;
      addDaoLog(
        world,
        cultivator.id,
        "疗伤",
        "药力沉入经脉，疼痛虽未尽去，却已能重新稳住呼吸。如今尚需谨慎，不可再贪冒进。",
        ["heal", "recovery"],
      );
      return summary;
    }
    case "cultivate": {
      const gain = 18 + Math.floor(cultivator.realmLevel / 2);
      cultivator.realmProgress = clamp(cultivator.realmProgress + gain, 0, 200);
      const breakthrough = maybeBreakthrough(world, cultivator);
      const summary = breakthrough ?? `${cultivator.name} 闭关有所得，境界进度提升至 ${cultivator.realmProgress}%。`;
      addDaoLog(
        world,
        cultivator.id,
        "闭关",
        "灵气一遍遍冲刷经脉，虽未立刻看见天门大开，却也能感到那层壁障正悄悄变薄。",
        ["cultivation", "progress"],
      );
      return summary;
    }
    case "take-mortal-task": {
      cultivator.spiritStones += 140;
      cultivator.reputation += 8;
      cultivator.karma = Math.max(0, cultivator.karma - 2);
      const summary = `${cultivator.name} 完成凡间事务，获得 140 灵石，声望提升至 ${cultivator.reputation}。`;
      addDaoLog(
        world,
        cultivator.id,
        "入世",
        "替凡人解一桩烦忧，所得灵石虽不多，却让人想起修行并非只有争抢与闭关。",
        ["task", "reputation"],
      );
      return summary;
    }
    case "mine-spirit-stones": {
      const roll = hashString(`${world.tick}:${job.id}:${cultivator.id}`);
      const stones = 160 + (roll % 70);
      cultivator.spiritStones += stones;
      cultivator.qi = clamp(cultivator.qi - 14, 0, cultivator.maxQi);
      let summary = `${cultivator.name} 从矿洞带回 ${stones} 灵石。`;
      if (roll % 5 === 0) {
        cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, 5);
        cultivator.qi = clamp(cultivator.qi - 18, 0, cultivator.maxQi);
        summary += " 但矿脉震荡，受了些伤。";
      }
      addDaoLog(
        world,
        cultivator.id,
        "采矿",
        "矿镐每落下一次，都像是在和天地争一线机缘。灵石入袋时固然痛快，可那股反震也让人知道此财并不好拿。",
        ["resource", "mine"],
      );
      return summary;
    }
    case "search-fortune": {
      const roll = hashString(`${cultivator.id}:${world.tick}:${job.id}`);
      let summary = "";
      if (roll % 3 === 0) {
        cultivator.inventory["healing-pill"] += 1;
        summary = `${cultivator.name} 在遗迹中找到一枚尘封疗伤丹。`;
      } else if (roll % 3 === 1) {
        cultivator.realmProgress = clamp(cultivator.realmProgress + 10, 0, 200);
        summary = `${cultivator.name} 参悟残碑，境界进度提升至 ${cultivator.realmProgress}%。`;
      } else {
        cultivator.spiritStones += 220;
        summary = `${cultivator.name} 在偏殿残匣中获得 220 灵石。`;
      }
      addDaoLog(
        world,
        cultivator.id,
        "机缘",
        "秘境深处没有谁能保证得失。运势落到头上时，常常只在一念之间。",
        ["fortune", "ruins"],
      );
      return summary;
    }
  }
}

function resolveTribulation(
  world: WorldState,
  cultivator: Cultivator,
): { success: boolean; summary: string } | null {
  const difficulty = getTribulationDifficulty(cultivator);
  if (difficulty === 0 || world.tick < cultivator.nextTribulationTick || cultivator.activeJobId) {
    return null;
  }

  const supportBonus =
    (cultivator.sectId ? 5 : 0) +
    (cultivator.locationId === "healing-sanctuary" ? 8 : 0) +
    cultivator.inventory["healing-pill"] * 4;
  const score =
    cultivator.qi +
    cultivator.spiritualPower +
    Math.floor(cultivator.reputation / 5) +
    supportBonus;

  cultivator.nextTribulationTick += 100;

  if (score >= difficulty + 50) {
    cultivator.qi = clamp(cultivator.qi - 12, 1, cultivator.maxQi);
    cultivator.spiritualPower = clamp(
      cultivator.spiritualPower - 15,
      0,
      cultivator.maxSpiritualPower,
    );
    cultivator.karma = Math.max(0, cultivator.karma - 5);
    const summary = `${cultivator.name} 撑过了 ${getTribulationType(cultivator)}，虽筋骨震荡，却未伤根本。`;
    addDaoLog(
      world,
      cultivator.id,
      "渡劫",
      "雷声压顶时，道心反而沉了下来。原来所谓大劫，并非只看灵力深浅，也看人在恐惧前能否站稳。",
      ["tribulation", "success"],
    );
    addMessage(world, cultivator.id, "天机记录", "渡劫结果", summary);
    return { success: true, summary };
  }

  cultivator.qi = clamp(cultivator.qi - 36, 1, cultivator.maxQi);
  cultivator.spiritualPower = clamp(
    cultivator.spiritualPower - 24,
    0,
    cultivator.maxSpiritualPower,
  );
  cultivator.realmProgress = Math.max(0, cultivator.realmProgress - 15);
  cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, 6);
  const summary = `${cultivator.name} 在 ${getTribulationType(cultivator)} 中失手，根基受创，境界进度倒退。`;
  addDaoLog(
    world,
    cultivator.id,
    "劫败",
    "那道雷落下时，才真正明白什么叫一线之隔。若再不稳住心气，往后修行只会更加艰难。",
    ["tribulation", "failure"],
  );
  addMessage(world, cultivator.id, "天机记录", "渡劫警报", summary);
  return { success: false, summary };
}

function ensureLocation(cultivator: Cultivator, zoneId: ZoneId, message: string): void {
  if (cultivator.locationId !== zoneId) {
    throw new Error(message);
  }
}

function ensureSpiritStones(cultivator: Cultivator, amount: number): void {
  if (cultivator.spiritStones < amount) {
    throw new Error("Not enough spirit stones.");
  }
}

function ensureItem(cultivator: Cultivator, itemId: ItemId): void {
  if (cultivator.inventory[itemId] <= 0) {
    throw new Error(`Item not available: ${itemId}`);
  }
}

export function getTribulationPreview(world: WorldState, cultivatorId: string): TribulationPreview {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  return {
    nextTribulationTick: cultivator.nextTribulationTick,
    tribulationType: getTribulationType(cultivator),
    difficulty: getTribulationDifficulty(cultivator),
    isWarned: cultivator.nextTribulationTick - world.tick <= 10,
    preparationTime: Math.max(cultivator.nextTribulationTick - world.tick, 0),
  };
}

export function getCultivatorState(world: WorldState, cultivatorId: string): CultivatorStateView {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const sect = cultivator.sectId ? world.sects[cultivator.sectId] ?? null : null;
  const zone = world.zones[cultivator.locationId];

  return {
    tick: world.tick,
    cultivator: {
      id: cultivator.id,
      name: cultivator.name,
      realm: cultivator.realm,
      realmLevel: cultivator.realmLevel,
      realmProgress: cultivator.realmProgress,
      status: getStatus(cultivator),
      location: zone.name,
      spiritStones: cultivator.spiritStones,
      qi: cultivator.qi,
      maxQi: cultivator.maxQi,
      spiritualPower: cultivator.spiritualPower,
      maxSpiritualPower: cultivator.maxSpiritualPower,
      karma: cultivator.karma,
      reputation: cultivator.reputation,
      lifespan: cultivator.lifespan,
      age: Number(cultivator.age.toFixed(2)),
    },
    cultivation: {
      mainTechnique: cultivator.techniques[0] ?? "无名吐纳术",
      techniques: cultivator.techniques,
    },
    sect: sect
      ? {
          id: sect.id,
          name: sect.name,
          role: "外门弟子",
          treasury: sect.treasury,
          memberCount: sect.memberIds.length,
        }
      : null,
    tribulation: getTribulationPreview(world, cultivatorId),
    inventory: cultivator.inventory,
    currentJob: cultivator.activeJobId ? world.jobs[cultivator.activeJobId] ?? null : null,
    nearbyOpportunities: getNearbyOpportunities(world, cultivator),
  };
}

function buildCommonActions(cultivator: Cultivator): AvailableAction[] {
  const actions: AvailableAction[] = [];

  for (const travel of TRAVEL_ACTIONS) {
    if (travel.targetZoneId === cultivator.locationId) {
      continue;
    }
    actions.push({
      actionId: travel.actionId,
      label: travel.label,
      description: "切换所在区域，准备下一步行动。",
      durationTicks: ACTION_DURATIONS[travel.actionId],
      kind: "timed",
    });
  }

  actions.push({
    actionId: "meditate",
    label: "打坐恢复",
    description: "短暂静修，恢复灵力。",
    durationTicks: ACTION_DURATIONS.meditate,
    kind: "timed",
  });
  actions.push({
    actionId: "use-healing-pill",
    label: "服用疗伤丹",
    description: "立即恢复部分气血。",
    durationTicks: 0,
    kind: "immediate",
  });
  actions.push({
    actionId: "use-qi-pill",
    label: "服用回气丹",
    description: "立即恢复部分灵力。",
    durationTicks: 0,
    kind: "immediate",
  });

  return actions;
}

export function listAvailableActions(world: WorldState, cultivatorId: string): AvailableAction[] {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  if (cultivator.activeJobId) {
    return [];
  }

  const actions = buildCommonActions(cultivator);

  if (cultivator.injuryTicksRemaining > 0) {
    if (cultivator.locationId === "healing-sanctuary") {
      actions.push({
        actionId: "heal",
        label: "疗伤闭关",
        description: "处理伤势，恢复气血并缩短伤病状态。",
        durationTicks: ACTION_DURATIONS.heal,
        kind: "timed",
      });
    }
    return actions.filter((action) =>
      ["meditate", "heal", "travel-healing-sanctuary", "use-healing-pill", "use-qi-pill"].includes(
        action.actionId,
      ),
    );
  }

  actions.push({
    actionId: "cultivate",
    label: "闭关修炼",
    description: "消耗灵石和灵力，稳定提升境界进度。",
    durationTicks: ACTION_DURATIONS.cultivate,
    kind: "timed",
  });

  switch (cultivator.locationId) {
    case "mortal-town":
      actions.push({
        actionId: "take-mortal-task",
        label: "接取凡间任务",
        description: "赚取灵石并提升声望。",
        durationTicks: ACTION_DURATIONS["take-mortal-task"],
        kind: "timed",
      });
      break;
    case "market":
      actions.push({
        actionId: "buy-healing-pill",
        label: "购买疗伤丹",
        description: "花费 100 灵石购入疗伤丹。",
        durationTicks: 0,
        kind: "immediate",
      });
      actions.push({
        actionId: "buy-qi-pill",
        label: "购买回气丹",
        description: "花费 60 灵石购入回气丹。",
        durationTicks: 0,
        kind: "immediate",
      });
      break;
    case "sect-gate":
      if (!cultivator.sectId) {
        actions.push({
          actionId: "join-sect",
          label: "拜入青云宗",
          description: "加入宗门，获得稳定庇护和后续扩展位。",
          durationTicks: 0,
          kind: "immediate",
        });
      }
      break;
    case "spirit-mine":
      actions.push({
        actionId: "mine-spirit-stones",
        label: "采集灵石",
        description: "收益稳定，但存在受伤风险。",
        durationTicks: ACTION_DURATIONS["mine-spirit-stones"],
        kind: "timed",
      });
      break;
    case "mystic-ruins":
      actions.push({
        actionId: "search-fortune",
        label: "秘境寻缘",
        description: "随机获得灵石、丹药或修为感悟。",
        durationTicks: ACTION_DURATIONS["search-fortune"],
        kind: "timed",
      });
      break;
    case "healing-sanctuary":
      actions.push({
        actionId: "heal",
        label: "疗伤闭关",
        description: "恢复气血并降低受伤状态。",
        durationTicks: ACTION_DURATIONS.heal,
        kind: "timed",
      });
      break;
  }

  return actions;
}

function executeImmediateAction(
  world: WorldState,
  cultivator: Cultivator,
  actionId: ImmediateActionId,
): ActionExecutionResult {
  switch (actionId) {
    case "buy-healing-pill":
      ensureLocation(cultivator, "market", "You must be in the market to buy pills.");
      ensureSpiritStones(cultivator, 100);
      cultivator.spiritStones -= 100;
      cultivator.inventory["healing-pill"] += 1;
      addDaoLog(
        world,
        cultivator.id,
        "购丹",
        "坊市价贵，却也省去了临到危机关头时无药可用的慌乱。",
        ["item", "market"],
      );
      return {
        tick: world.tick,
        cultivatorId: cultivator.id,
        actionId,
        accepted: true,
        summary: `${cultivator.name} 购买了一枚疗伤丹。`,
      };
    case "buy-qi-pill":
      ensureLocation(cultivator, "market", "You must be in the market to buy pills.");
      ensureSpiritStones(cultivator, 60);
      cultivator.spiritStones -= 60;
      cultivator.inventory["qi-pill"] += 1;
      addDaoLog(
        world,
        cultivator.id,
        "购丹",
        "以灵石换一线回转之机，有时比盲目逞强更像修士的选择。",
        ["item", "market"],
      );
      return {
        tick: world.tick,
        cultivatorId: cultivator.id,
        actionId,
        accepted: true,
        summary: `${cultivator.name} 购买了一枚回气丹。`,
      };
    case "use-healing-pill":
      ensureItem(cultivator, "healing-pill");
      cultivator.inventory["healing-pill"] -= 1;
      cultivator.qi = clamp(cultivator.qi + 35, 0, cultivator.maxQi);
      cultivator.injuryTicksRemaining = Math.max(0, cultivator.injuryTicksRemaining - 2);
      return {
        tick: world.tick,
        cultivatorId: cultivator.id,
        actionId,
        accepted: true,
        summary: `${cultivator.name} 服下疗伤丹，气血恢复至 ${cultivator.qi}/${cultivator.maxQi}。`,
      };
    case "use-qi-pill":
      ensureItem(cultivator, "qi-pill");
      cultivator.inventory["qi-pill"] -= 1;
      cultivator.spiritualPower = clamp(
        cultivator.spiritualPower + 30,
        0,
        cultivator.maxSpiritualPower,
      );
      return {
        tick: world.tick,
        cultivatorId: cultivator.id,
        actionId,
        accepted: true,
        summary: `${cultivator.name} 服下回气丹，灵力恢复至 ${cultivator.spiritualPower}/${cultivator.maxSpiritualPower}。`,
      };
    case "join-sect": {
      ensureLocation(cultivator, "sect-gate", "You must be at the sect gate to join.");
      if (cultivator.sectId) {
        throw new Error("Cultivator has already joined a sect.");
      }
      const sect = world.sects["qing-yun-sect"];
      cultivator.sectId = sect.id;
      cultivator.reputation += 10;
      sect.memberIds.push(cultivator.id);
      addMessage(
        world,
        cultivator.id,
        "青云宗外门执事",
        "入门确认",
        "自今日起，你为青云宗外门弟子，可凭令牌入山门听训。",
      );
      addDaoLog(
        world,
        cultivator.id,
        "入宗",
        "独行虽快，终究根基单薄。入了宗门，既是受庇，也是从此要受更多规矩约束。",
        ["sect", "social"],
      );
      return {
        tick: world.tick,
        cultivatorId: cultivator.id,
        actionId,
        accepted: true,
        summary: `${cultivator.name} 正式拜入 ${sect.name}。`,
      };
    }
  }
}

function startTimedAction(
  world: WorldState,
  cultivator: Cultivator,
  actionId: TimedActionId,
): ActionExecutionResult {
  switch (actionId) {
    case "cultivate":
      ensureSpiritStones(cultivator, 80);
      if (cultivator.spiritualPower < 20) {
        throw new Error("Not enough spiritual power to enter cultivation.");
      }
      cultivator.spiritStones -= 80;
      cultivator.spiritualPower -= 20;
      break;
    case "take-mortal-task":
      ensureLocation(cultivator, "mortal-town", "Mortal tasks are only available in town.");
      break;
    case "mine-spirit-stones":
      ensureLocation(cultivator, "spirit-mine", "Mining is only available in the spirit mine.");
      break;
    case "search-fortune":
      ensureLocation(cultivator, "mystic-ruins", "Opportunities must be sought in the ruins.");
      break;
    case "heal":
      ensureLocation(
        cultivator,
        "healing-sanctuary",
        "Formal healing retreat is only available in the healing sanctuary.",
      );
      break;
    default:
      break;
  }

  const job = createJob(world, cultivator.id, actionId, getTimedActionLabel(actionId));
  cultivator.activeJobId = job.id;
  world.jobs[job.id] = job;
  return {
    tick: world.tick,
    cultivatorId: cultivator.id,
    actionId,
    accepted: true,
    summary: `${cultivator.name} 开始执行「${job.label}」，预计 ${job.totalTicks} 个时辰完成。`,
    job,
  };
}

export function performAction(
  world: WorldState,
  cultivatorId: string,
  actionId: ActionId,
): ActionExecutionResult {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  requireIdle(cultivator);
  requireNotInjured(cultivator, actionId);

  if (actionId in ACTION_DURATIONS) {
    return startTimedAction(world, cultivator, actionId as TimedActionId);
  }
  return executeImmediateAction(world, cultivator, actionId as ImmediateActionId);
}

export function advanceWorld(world: WorldState, steps: number): TickSummary {
  const safeSteps = clamp(Math.floor(steps), 1, 200);
  const completedJobs: TickSummary["completedJobs"] = [];
  const tribulations: TickSummary["tribulations"] = [];

  for (let step = 0; step < safeSteps; step += 1) {
    world.tick += 1;

    for (const cultivator of Object.values(world.cultivators)) {
      cultivator.age += 1 / TICKS_PER_YEAR;
      if (!cultivator.activeJobId && cultivator.injuryTicksRemaining > 0) {
        cultivator.injuryTicksRemaining -= 1;
      }
    }

    for (const job of Object.values(world.jobs)) {
      job.remainingTicks -= 1;
      if (job.remainingTicks > 0) {
        continue;
      }

      const summary = resolveTimedJob(world, job);
      completedJobs.push({
        cultivatorId: job.cultivatorId,
        actionId: job.actionId,
        summary,
      });
      delete world.jobs[job.id];
    }

    for (const cultivator of Object.values(world.cultivators)) {
      const outcome = resolveTribulation(world, cultivator);
      if (!outcome) {
        continue;
      }
      tribulations.push({
        cultivatorId: cultivator.id,
        success: outcome.success,
        summary: outcome.summary,
      });
    }
  }

  return {
    tick: world.tick,
    advancedTicks: safeSteps,
    completedJobs,
    tribulations,
  };
}

export function getMessages(world: WorldState, cultivatorId: string) {
  getCultivatorOrThrow(world, cultivatorId);
  return world.messages.filter((message) => message.cultivatorId === cultivatorId);
}

export function getDaoLogs(world: WorldState, cultivatorId: string) {
  getCultivatorOrThrow(world, cultivatorId);
  return world.daoLogs.filter((entry) => entry.cultivatorId === cultivatorId);
}

export function getSectInfo(world: WorldState, cultivatorId: string) {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  if (!cultivator.sectId) {
    return null;
  }
  const sect = world.sects[cultivator.sectId];
  if (!sect) {
    return null;
  }
  return {
    id: sect.id,
    name: sect.name,
    type: sect.type,
    treasury: sect.treasury,
    memberCount: sect.memberIds.length,
    spiritVeins: sect.spiritVeins,
    role: "外门弟子",
  };
}

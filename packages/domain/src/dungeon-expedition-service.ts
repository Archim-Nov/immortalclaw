import { interiorPlaceName, interiorWakeDraft, interiorWakeEffect, pickLateWakeKind } from "./dungeon-interior.js";
import { jiaFightWarning } from "./high-realm-dungeon.js";
import { mysteryForRank } from "./high-realm.js";
import { ITEM_CATALOG } from "./items/catalog.js";
import { jiaRelicHint } from "./jia-relics.js";
import { lightMysteryHint } from "./yi-mystery.js";
import type {
  ActionJob,
  Cultivator,
  DungeonBeat,
  DungeonExpeditionPolicy,
  DungeonExpeditionProgress,
  DungeonExpeditionReport,
  DungeonExpeditionStateView,
  DungeonGrade,
  DungeonRank,
  DungeonRankYieldHint,
  DungeonStateView,
  ItemId,
  RunStrategy,
  WakeNode,
  WorldState,
} from "./model.js";

export const DUNGEON_EXPEDITION_DURATION_TICKS = 30;
export const DUNGEON_EXPEDITION_STEP_TICKS = 3;
export const DUNGEON_EXPEDITION_MAX_STEPS = DUNGEON_EXPEDITION_DURATION_TICKS / DUNGEON_EXPEDITION_STEP_TICKS;
export const DUNGEON_EXPEDITION_POLICIES = ["conservative", "balanced", "aggressive"] as const satisfies readonly DungeonExpeditionPolicy[];
const MAX_DUNGEON_FLAVOR_EVENTS = 3;
const MAX_DUNGEON_WAKE_NODES = 3;
const DUNGEON_WAKE_TIMEOUT_TICKS = 10;
const DUNGEON_WAKE_DECISION_LINE = "地宫岔路待决";
const DUNGEON_ROUTE_SPLIT_STEPS = new Set([3, 6, 8]);
const DUNGEON_STRATEGY_POSTURES = ["conservative", "balanced", "aggressive"] as const satisfies readonly RunStrategy["posture"][];

const SECONDARY_DROPS_BY_BAND: Record<"1-3" | "4-6" | "7-9", ItemId[]> = {
  "1-3": ["ruin-fragment"],
  "4-6": ["ruin-fragment", "healing-pill", "qi-pill"],
  "7-9": ["ruin-fragment", "healing-pill", "qi-pill", "ward-talisman"],
};

const ESTIMATED_MATERIAL_YIELD_BY_BAND: Record<
  "1-3" | "4-6" | "7-9",
  Record<DungeonExpeditionPolicy, { min: number; max: number }>
> = {
  "1-3": {
    conservative: { min: 2, max: 3 },
    balanced: { min: 3, max: 4 },
    aggressive: { min: 3, max: 5 },
  },
  "4-6": {
    conservative: { min: 3, max: 4 },
    balanced: { min: 4, max: 5 },
    aggressive: { min: 4, max: 6 },
  },
  "7-9": {
    conservative: { min: 4, max: 5 },
    balanced: { min: 5, max: 6 },
    aggressive: { min: 5, max: 7 },
  },
};

const POLICY_GUARDIAN_WEIGHT: Record<DungeonExpeditionPolicy, number> = {
  conservative: 20,
  balanced: 50,
  aggressive: 80,
};

function strategyFromPosture(posture: RunStrategy["posture"]): RunStrategy {
  if (posture === "conservative") {
    return { posture, bias: "survival-first", pushPreference: "retreat" };
  }
  if (posture === "aggressive") {
    return { posture, bias: "reward-first", pushPreference: "push" };
  }
  return { posture, bias: "survival-first", pushPreference: "neutral" };
}

export function strategyFromPolicy(policy: DungeonExpeditionPolicy): RunStrategy {
  return strategyFromPosture(policy);
}

function hashString(input: string): number {
  return Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

export function startDungeonExpeditionActionIdOf(rank: DungeonRank, policy: DungeonExpeditionPolicy) {
  return `start-dungeon-expedition:rank-${rank}:${policy}` as const;
}

export function enterDungeonActionIdOf(rank: DungeonRank, posture: RunStrategy["posture"]) {
  return `enter-dungeon:rank-${rank}:${posture}` as const;
}

export function parseStartDungeonExpeditionActionId(
  actionId: string,
): { rank: DungeonRank; policy: DungeonExpeditionPolicy } | null {
  const prefix = "start-dungeon-expedition:rank-";
  if (!actionId.startsWith(prefix)) {
    return null;
  }

  const [rankPart, policyPart] = actionId.slice(prefix.length).split(":");
  const rank = Number.parseInt(rankPart ?? "", 10);
  if (!Number.isInteger(rank) || rank < 1 || rank > 9) {
    return null;
  }
  if (!DUNGEON_EXPEDITION_POLICIES.includes(policyPart as DungeonExpeditionPolicy)) {
    return null;
  }

  return {
    rank: rank as DungeonRank,
    policy: policyPart as DungeonExpeditionPolicy,
  };
}

export function isAbortDungeonExpeditionAction(actionId: string): actionId is "abort-dungeon-expedition" {
  return actionId === "abort-dungeon-expedition";
}

function yieldBandForRank(rank: DungeonRank): "1-3" | "4-6" | "7-9" {
  if (rank <= 3) {
    return "1-3";
  }
  if (rank <= 6) {
    return "4-6";
  }
  return "7-9";
}

export function buildDungeonRankYieldHints(
  availableRanks: DungeonRank[],
  primaryMaterial: ItemId,
  grade?: DungeonGrade,
  stateId?: string,
): DungeonRankYieldHint[] {
  return availableRanks.map((rank) => {
    const band = yieldBandForRank(rank);
    const mystery = grade ? mysteryForRank(grade, rank) : null;
    const light = !mystery && grade ? lightMysteryHint(grade, rank, stateId) : null;
    const notableSecondaryDrops = [...SECONDARY_DROPS_BY_BAND[band]];
    if (mystery && !notableSecondaryDrops.includes(mystery.cultivationItemId)) {
      notableSecondaryDrops.push(mystery.cultivationItemId);
    }
    const relicLine = jiaRelicHint(grade, rank);
    return {
      rank,
      primaryMaterial,
      primaryMaterialName: playerItemName(primaryMaterial),
      estimatedExpeditionYieldByPolicy: {
        conservative: { ...ESTIMATED_MATERIAL_YIELD_BY_BAND[band].conservative },
        balanced: { ...ESTIMATED_MATERIAL_YIELD_BY_BAND[band].balanced },
        aggressive: { ...ESTIMATED_MATERIAL_YIELD_BY_BAND[band].aggressive },
      },
      notableSecondaryDrops,
      notableSecondaryDropCards: notableSecondaryDrops.map((itemId) => ({
        itemId,
        itemName: playerItemName(itemId),
      })),
      ...(mystery
        ? {
            mysteryName: mystery.name,
            mysteryLine: `${mystery.line}${jiaFightWarning(rank)}`,
            entryMinLevel: mystery.minLevel,
          }
        : light
          ? {
              mysteryName: light.name,
              mysteryLine: light.line,
            }
          : {}),
      ...(relicLine ? { relicLine } : {}),
    };
  });
}

function riskLabelForPolicy(policy: DungeonExpeditionPolicy): string {
  if (policy === "conservative") {
    return "姿态稳妥，有真正的警示就撤。";
  }
  if (policy === "balanced") {
    return "姿态均衡，前面值得的时候再往里走。";
  }
  return "姿态冒进，会压着门口往里，也受得住更深的伤。";
}

export function describeDungeonExpeditionAction(input: {
  dungeon: DungeonStateView;
  rank: DungeonRank;
  policy: DungeonExpeditionPolicy;
}): string {
  const hint = input.dungeon.rankYieldHints.find((entry) => entry.rank === input.rank);
  const estimate = hint?.estimatedExpeditionYieldByPolicy[input.policy];
  const primaryName = playerItemName(hint?.primaryMaterial ?? input.dungeon.materialBand);
  const estimatedRange = estimate ? `${estimate.min}到${estimate.max}` : "一些";
  const frontierNote = input.rank === input.dungeon.frontierRank
    ? "这一阶还是门口。跑得稳的话，会去碰守关。"
    : "这一阶已经开过，这一趟不往上推。";

  return `这一趟要三十刻，走${input.dungeon.grade}级第${input.rank}阶，大约能带回${estimatedRange}份${primaryName}。${frontierNote}${riskLabelForPolicy(input.policy)}`;
}

export function createDungeonExpeditionProgress(input: {
  cultivatorId: string;
  jobId: string;
  locationId: string;
  grade: DungeonGrade;
  targetRank: DungeonRank;
  policy: DungeonExpeditionPolicy;
  strategy?: RunStrategy;
  startedAtTick: number;
}): DungeonExpeditionProgress {
  const strategy = input.strategy ?? strategyFromPolicy(input.policy);
  return {
    cultivatorId: input.cultivatorId,
    jobId: input.jobId,
    locationId: input.locationId,
    grade: input.grade,
    targetRank: input.targetRank,
    policy: input.policy,
    strategy,
    startedAtTick: input.startedAtTick,
    stepIndex: 0,
    maxSteps: DUNGEON_EXPEDITION_MAX_STEPS,
    nextResolutionTick: input.startedAtTick + DUNGEON_EXPEDITION_STEP_TICKS,
    searchSteps: 0,
    guardianSteps: 0,
    primaryMaterialCount: 0,
    secondaryDrops: {},
    spiritStoneGain: 0,
    realmProgressGain: 0,
    unlockedNextRank: false,
    lastResolvedAction: null,
    flavorEventTitles: [],
    beats: [],
    qiSpent: 0,
    spiritualPowerSpent: 0,
    injuryTicksGained: 0,
    stonesLost: 0,
    wakeNodesEncountered: 0,
    maxWakeNodes: MAX_DUNGEON_WAKE_NODES,
    pendingWakeNode: null,
    pendingWakeNodeDeadlineTick: null,
    resolvedWakeNodeCount: 0,
    usedWakeScenes: [],
    beatsSeen: 0,
    beatsTold: 0,
    nextSightingGap: sightingGapFor(input.jobId),
  };
}

export function parseEnterDungeonActionId(
  actionId: string,
): { rank: DungeonRank; posture: RunStrategy["posture"] } | null {
  const prefix = "enter-dungeon:rank-";
  if (!actionId.startsWith(prefix)) {
    return null;
  }

  const [rankPart, posturePart] = actionId.slice(prefix.length).split(":");
  const rank = Number.parseInt(rankPart ?? "", 10);
  if (!Number.isInteger(rank) || rank < 1 || rank > 9) {
    return null;
  }
  if (!DUNGEON_STRATEGY_POSTURES.includes(posturePart as RunStrategy["posture"])) {
    return null;
  }

  return {
    rank: rank as DungeonRank,
    posture: posturePart as RunStrategy["posture"],
  };
}

export function getActiveDungeonExpedition(
  world: WorldState,
  cultivatorId: string,
): DungeonExpeditionProgress | null {
  return world.dungeonExpeditions[cultivatorId] ?? null;
}

export function buildDungeonExpeditionStateView(
  world: WorldState,
  cultivator: Cultivator,
  job: ActionJob | null,
): DungeonExpeditionStateView {
  const active = getActiveDungeonExpedition(world, cultivator.id);
  const lastReport = world.dungeonExpeditionReports[cultivator.id] ?? null;
  const pendingWakeNode = active?.pendingWakeNode ?? null;
  const companionIds = active?.companionIds && active.companionIds.length > 0
    ? active.companionIds
    : active?.companionId
      ? [active.companionId]
      : [];
  const companionNames = companionIds
    .map((companionId) => world.cultivators[companionId]?.name)
    .filter((name): name is string => Boolean(name));

  return {
    active: active
      ? {
          grade: active.grade,
          targetRank: active.targetRank,
          policy: active.policy,
          strategy: active.strategy,
          startedAtTick: active.startedAtTick,
          stepsResolved: active.stepIndex,
          maxSteps: active.maxSteps,
          nextResolutionTick: active.nextResolutionTick,
          remainingTicks: job?.remainingTicks ?? 0,
          companionId: companionIds[0] ?? null,
          companionName: companionNames[0] ?? null,
          companionNames: companionNames.length > 0 ? companionNames : undefined,
          shareNote: companionIds.length > 0
            ? `同队的${companionNames.join("、") || "同伴"}跟着这一趟，不另开工。结束时还在身边，会分灵石或分伤。`
            : null,
        }
      : null,
    lastReport,
    wakeNodeHint: pendingWakeNode
      ? {
          nodeId: pendingWakeNode.nodeId,
          context: pendingWakeNode.context,
          defaultOptionId: pendingWakeNode.defaultOptionId,
          timeoutTicks: pendingWakeNode.timeoutTicks,
          decisionLine: DUNGEON_WAKE_DECISION_LINE,
          options: pendingWakeNode.options.map((option) => ({
            optionId: option.optionId,
            label: option.label,
            description: option.description,
          })),
        }
      : null,
  };
}

const SAFE_WAKE_TOKENS = ["safe", "stable", "avoid", "bank", "retreat", "aid", "share", "leave", "yield", "offer", "point"] as const;

export function isSafeDungeonWakeOption(optionId: string): boolean {
  return SAFE_WAKE_TOKENS.some((token) => optionId.includes(token));
}

const MORAL_WAKE_EFFECTS: Record<string, { stoneDelta: number; moralityDelta: number; realmDelta?: number; beat: DungeonBeat }> = {
  "aid-wounded": {
    stoneDelta: -6,
    moralityDelta: 2,
    beat: {
      kind: "person",
      title: "扶起伤者",
      detail: "岔路里躺着个被阵纹擦伤的人。你把水囊留下，又分了几枚灵石，看他扶着墙往外走。袋子比进来时轻了一点。",
      mood: "东西少了，人还在",
    },
  },
  "share-water": {
    stoneDelta: 0,
    moralityDelta: 1,
    beat: {
      kind: "person",
      title: "分了一口水",
      detail: "你把水囊递过去，喝完又还了回来。谁也没多拿谁的东西。各自点了下头，岔路就在这里分开。",
      mood: "算是认识了一个人",
    },
  },
  "take-pouch": {
    stoneDelta: 16,
    moralityDelta: -3,
    beat: {
      kind: "close-call",
      title: "拿走了袋子",
      detail: "那人伤得站不稳，袋子就挂在腕上。你拿走了。他没有追，只是看着你走进更暗的那一条。灵石还热着。",
      mood: "手里有东西，心里不干净",
    },
  },
  "stable-route": {
    stoneDelta: 0,
    moralityDelta: 0,
    beat: {
      kind: "mood",
      title: "走了稳路",
      detail: "两条岔路里选了灯还亮着的那条。脚步慢，靴底是干的。",
      mood: "心里定一点",
    },
  },
  "stable-lamp": {
    stoneDelta: 2,
    moralityDelta: 0,
    beat: {
      kind: "find",
      title: "沿壁灯走",
      detail: "你贴着一排没灭的壁灯往前。灯油味很重，路也长，墙根里却摸到两枚还温的灵石。",
      mood: "慢，可不是白走",
    },
  },
  "stable-mark": {
    stoneDelta: 0,
    moralityDelta: 1,
    beat: {
      kind: "insight",
      title: "做了记号",
      detail: "你在分岔的砖上划了一道，又退回灯下看了看。这条路还在，人不必现在就赌。",
      mood: "知道回头的地方",
    },
  },
  "volatile-route": {
    stoneDelta: 18,
    moralityDelta: 0,
    realmDelta: 2,
    beat: {
      kind: "close-call",
      title: "抄了短路",
      detail: "两条路里选了更暗的那条。脚步快了，后背也凉了，袋子里多出一截还烫的残材。",
      mood: "还想再往里",
    },
  },
  "avoid-elite": {
    stoneDelta: 0,
    moralityDelta: 0,
    beat: {
      kind: "mood",
      title: "绕开精英",
      detail: "前面的脚步声太齐。你灭了灯，贴着墙等那一阵过去，再从旁边的窄缝走。",
      mood: "人还全乎",
    },
  },
  "aid-flank": {
    stoneDelta: -2,
    moralityDelta: 1,
    beat: {
      kind: "person",
      title: "让旁边的人压住",
      detail: "同路的人肩上已经见血。你把半袋药粉拍给他，自己退到他侧后，等那阵脚步偏过去。",
      mood: "两个人都还在",
    },
  },
  "share-warning": {
    stoneDelta: 0,
    moralityDelta: 1,
    beat: {
      kind: "person",
      title: "低声说了一句",
      detail: "你只对旁边的人说了前面有精英，就一起退了半步。谁也没冲出去。",
      mood: "话是说了",
    },
  },
  "engage-elite": {
    stoneDelta: 18,
    moralityDelta: 0,
    realmDelta: 2,
    beat: {
      kind: "close-call",
      title: "迎上精英",
      detail: "你没有绕。那个人比普通巡守站得更稳，交手只有几息，袖口还是裂了，地上留下一枚别人没拿走的灵石。",
      mood: "手还在抖",
    },
  },
  "bank-progress": {
    stoneDelta: 0,
    moralityDelta: 0,
    beat: {
      kind: "mood",
      title: "先把收获收好",
      detail: "你把已经到手的东西缠进内袋，打了死结。再往里的路还在，这一截先不赌。",
      mood: "袋子是实的",
    },
  },
  "stable-pocket": {
    stoneDelta: 4,
    moralityDelta: 0,
    beat: {
      kind: "find",
      title: "只揣最好的一件",
      detail: "你把最像样的那一件塞进贴身处，其余的原样放下，然后照着原来的灯继续走。",
      mood: "拿得少，拿得住",
    },
  },
  "share-cache": {
    stoneDelta: 2,
    moralityDelta: 1,
    beat: {
      kind: "person",
      title: "留了一半",
      detail: "石龛里的东西你拿了一半，另一半用石块压住，留了个能看见的角。后来的人还找得到。",
      mood: "不是一个人的地宫",
    },
  },
  "push-deeper": {
    stoneDelta: 18,
    moralityDelta: 0,
    realmDelta: 2,
    beat: {
      kind: "close-call",
      title: "又往里走了一段",
      detail: "收获已经够沉，你还是往更暗的地方走了一段。气短了一点，袋子却又沉了一点。",
      mood: "还想再往里",
    },
  },
  "leave-relic": {
    stoneDelta: 0,
    moralityDelta: 1,
    beat: {
      kind: "insight",
      title: "把残片留在原处",
      detail: "壁龛里躺着一块还温的残片。你看清纹路，没有拿。离开时它还在原来的灰里。",
      mood: "知道它在那儿",
    },
  },
  "offer-relic": {
    stoneDelta: -2,
    moralityDelta: 2,
    beat: {
      kind: "insight",
      title: "就地祭了一祭",
      detail: "你把两枚灵石压在残片旁边，低声说了句路过。残片没亮，心里那点紧倒松了。",
      mood: "算是打过招呼",
    },
  },
  "bank-relic": {
    stoneDelta: 4,
    moralityDelta: 0,
    beat: {
      kind: "find",
      title: "收起残片",
      detail: "残片不大，贴着掌心还有一点热。你用布裹好，放进不会响的那一层。",
      mood: "手里多了一件能说的东西",
    },
  },
  "pry-relic": {
    stoneDelta: 10,
    moralityDelta: -1,
    beat: {
      kind: "close-call",
      title: "把残片撬开",
      detail: "你顺着裂缝撬了一下。里面滚出几枚灵石，也溅了点灰在眼睛上。残片本身裂得不能再看纹路。",
      mood: "拿到了，也弄坏了",
    },
  },
  "aid-fellow": {
    stoneDelta: -4,
    moralityDelta: 2,
    beat: {
      kind: "person",
      title: "搭了一把手",
      detail: "同路的人被石缝夹住了袖口。你蹲下去把石头掀开，又分了几枚灵石让他买水。两个人的路从这里还能一起走一段。",
      mood: "袖子脏了，人还在",
    },
  },
  "share-pill": {
    stoneDelta: -2,
    moralityDelta: 1,
    beat: {
      kind: "person",
      title: "分了一颗丹",
      detail: "你把疗伤的那颗掰开，只给了半颗。对方含下去，点了下头，没有再要。",
      mood: "袋子轻了一点",
    },
  },
  "point-path": {
    stoneDelta: 0,
    moralityDelta: 1,
    beat: {
      kind: "person",
      title: "只指了一条路",
      detail: "你没有停步，只把灯往安全的那条偏了偏，说了一句墙根能走。人已经过去了。",
      mood: "话是送到了",
    },
  },
  "take-map": {
    stoneDelta: 8,
    moralityDelta: -1,
    beat: {
      kind: "close-call",
      title: "收下了那张草图",
      detail: "对方把半张路线递过来，想换你手里的水。你把图拿走了，水还在自己袋里。他没有追。",
      mood: "图是有了",
    },
  },
  "yield-loot": {
    stoneDelta: 0,
    moralityDelta: 1,
    beat: {
      kind: "person",
      title: "让了一步",
      detail: "石台上的袋子同时有两只手。你先松开。对方把东西收进怀里，侧身让出了路。",
      mood: "路还在",
    },
  },
  "share-split": {
    stoneDelta: 6,
    moralityDelta: 0,
    beat: {
      kind: "find",
      title: "对半拆开",
      detail: "你们把袋子里的灵石在灯下数开，一人一半。谁也没再伸第二次手。",
      mood: "分得清楚",
    },
  },
  "share-witness": {
    stoneDelta: 2,
    moralityDelta: 1,
    beat: {
      kind: "person",
      title: "喊人来看",
      detail: "你没有先拿，而是把旁边的人叫过来一起看。最后只分到两枚，可三个人都看见了怎么分的。",
      mood: "有人能作证",
    },
  },
  "seize-loot": {
    stoneDelta: 12,
    moralityDelta: -2,
    beat: {
      kind: "close-call",
      title: "先伸了手",
      detail: "你比对面快了半息，袋子到了自己腕上。对方骂了一句，没有打起来，灯却被他碰灭了。",
      mood: "手里有东西，身后不静",
    },
  },
};

export interface DungeonWakeSettlement {
  progress: DungeonExpeditionProgress;
  chosenOptionId: string;
  stoneDelta: number;
  moralityDelta: number;
  injuryTicks: number;
  beat: DungeonBeat | null;
}

export function chooseDefaultDungeonWakeOptionId(progress: DungeonExpeditionProgress): string {
  const node = progress.pendingWakeNode;
  if (!node) {
    return "";
  }
  const safeOption = node.options.find((option) => isSafeDungeonWakeOption(option.optionId));
  const riskyOption = node.options.find((option) => !isSafeDungeonWakeOption(option.optionId));
  if (progress.strategy.posture === "conservative" && progress.strategy.bias === "survival-first") {
    return safeOption?.optionId ?? node.defaultOptionId;
  }
  if (progress.strategy.posture === "aggressive" && progress.strategy.bias === "reward-first") {
    return riskyOption?.optionId ?? node.defaultOptionId;
  }
  return node.defaultOptionId;
}

export function settleDungeonWakeNode(
  progress: DungeonExpeditionProgress,
  chosenOptionId: string,
  source: "chosen" | "timeout" = "chosen",
): DungeonWakeSettlement {
  if (!progress.pendingWakeNode) {
    return {
      progress,
      chosenOptionId,
      stoneDelta: 0,
      moralityDelta: 0,
      injuryTicks: 0,
      beat: null,
    };
  }

  const extra = interiorWakeEffect(chosenOptionId);
  const known = MORAL_WAKE_EFFECTS[chosenOptionId] ?? extra;
  const risky = !isSafeDungeonWakeOption(chosenOptionId);
  const rawBeat: DungeonBeat | null = known
    ? known.beat
    : risky
      ? {
          kind: "close-call",
          title: "走了短路",
          detail: "两条路里选了更险的那条。脚步快了，后背也凉了。",
          mood: "还想再往里",
        }
      : {
          kind: "mood",
          title: "走了稳路",
          detail: "岔路选了更稳的一条。慢，可灯还在。",
          mood: "心里定一点",
        };
  const place = extra ? interiorPlaceName(progress.grade, progress.targetRank) : "";
  const placed: DungeonBeat | null = rawBeat && place && !rawBeat.detail.startsWith(place)
    ? { ...rawBeat, detail: `${place}里。${rawBeat.detail}` }
    : rawBeat;
  const label = progress.pendingWakeNode.options.find((option) => option.optionId === chosenOptionId)?.label ?? "这一条";
  const lead = source === "timeout" ? `时辰到了，代选了${label}。` : `你选了${label}。`;
  const beat: DungeonBeat | null = placed && !placed.detail.startsWith(lead)
    ? { ...placed, detail: `${lead}${placed.detail}` }
    : placed;
  const stoneDelta = known ? known.stoneDelta : 0;
  const reportStone = known ? known.stoneDelta : (risky ? 18 : 0);
  const reportRealm = known?.realmDelta ?? (known ? 0 : (risky ? 2 : 0));

  return {
    chosenOptionId,
    stoneDelta,
    moralityDelta: known?.moralityDelta ?? 0,
    injuryTicks: extra?.injuryTicks ?? 0,
    beat,
    progress: {
      ...progress,
      spiritStoneGain: progress.spiritStoneGain + reportStone,
      realmProgressGain: progress.realmProgressGain + reportRealm,
      beats: [...(progress.beats ?? []), beat].slice(-8),
      beatsSeen: (progress.beatsSeen ?? (progress.beats?.length ?? 0)) + 1,
      pendingWakeNode: null,
      pendingWakeNodeDeadlineTick: null,
      resolvedWakeNodeCount: progress.resolvedWakeNodeCount + 1,
    },
  };
}

export function resolveDungeonWakeNodeByDefault(progress: DungeonExpeditionProgress): DungeonExpeditionProgress {
  if (!progress.pendingWakeNode) {
    return progress;
  }
  return settleDungeonWakeNode(progress, chooseDefaultDungeonWakeOptionId(progress), "timeout").progress;
}

type DungeonWakeSceneKind = "moral" | "fork" | "relic" | "fellow" | "loot" | "elite" | "bank" | "trap" | "shrine" | "chamber" | "nest" | "sealed" | "well" | "span" | "lantern" | "voice" | "ford";

function finishWake(input: {
  nodeId: string;
  sceneKind: DungeonWakeSceneKind;
  context: string;
  options: WakeNode["options"];
  defaultOptionId: string;
}): WakeNode {
  return {
    nodeId: input.nodeId,
    sceneKind: input.sceneKind,
    context: input.context,
    options: input.options,
    defaultOptionId: input.defaultOptionId,
    timeoutTicks: DUNGEON_WAKE_TIMEOUT_TICKS,
  };
}

function moralWake(nodeId: string, posture: DungeonExpeditionPolicy): WakeNode {
  return finishWake({
    nodeId,
    sceneKind: "moral",
    context: "岔路里有个被阵纹擦伤的人，水囊和袋子都在。扶他、分水，或者拿走袋子。",
    options: [
      { optionId: "aid-wounded", label: "扶起伤者", description: "留下水囊和几枚灵石，看他往外走。" },
      { optionId: "share-water", label: "分一口水", description: "把水囊递过去，喝完再还回来。" },
      { optionId: "take-pouch", label: "拿走袋子", description: "袋子还热着。人伤得追不上。" },
    ],
    defaultOptionId: posture === "aggressive" ? "take-pouch" : posture === "balanced" ? "share-water" : "aid-wounded",
  });
}

function forkWake(nodeId: string, posture: DungeonExpeditionPolicy): WakeNode {
  return finishWake({
    nodeId,
    sceneKind: "fork",
    context: "前面岔成几条。一条灯还亮着，一条贴着壁灯，一条可以先做记号退回来，还有一条又黑又短。",
    options: [
      { optionId: "stable-route", label: "走亮着灯的路", description: "慢一点，靴底是干的。" },
      { optionId: "stable-lamp", label: "沿壁灯走", description: "路长，墙根里偶尔有漏下的灵石。" },
      { optionId: "stable-mark", label: "做个记号再看", description: "先在砖上划一道，人不必现在就赌。" },
      { optionId: "volatile-route", label: "抄那条短路", description: "暗，快，袋子里可能多一件烫手的东西。" },
    ],
    defaultOptionId: posture === "aggressive" ? "volatile-route" : posture === "balanced" ? "stable-lamp" : "stable-route",
  });
}

function relicWake(nodeId: string, posture: DungeonExpeditionPolicy): WakeNode {
  return finishWake({
    nodeId,
    sceneKind: "relic",
    context: "壁龛里躺着一块还温的残片，灰没盖严。可以留下、祭一祭、裹起来带走，或者顺着裂缝撬开。",
    options: [
      { optionId: "leave-relic", label: "留在原处", description: "看清纹路就走，残片还在灰里。" },
      { optionId: "offer-relic", label: "就地祭一祭", description: "压上两枚灵石，低声打个招呼。" },
      { optionId: "bank-relic", label: "收进袋子", description: "用布裹好，放进不会响的那一层。" },
      { optionId: "pry-relic", label: "撬开看看", description: "裂缝里可能有灵石，纹路也就没了。" },
    ],
    defaultOptionId: posture === "aggressive" ? "pry-relic" : posture === "balanced" ? "bank-relic" : "leave-relic",
  });
}

function fellowWake(nodeId: string, posture: DungeonExpeditionPolicy, sectName: string | null): WakeNode {
  const who = sectName ? `${sectName}的人` : "一个同路的修士";
  return finishWake({
    nodeId,
    sceneKind: "fellow",
    context: `岔路里遇见${who}，袖口被石缝夹住了，手里还攥着半张草图。你可以搭把手、分半颗丹、只指一条路，或者把图拿走。`,
    options: [
      { optionId: "aid-fellow", label: "搭一把手", description: "把石头掀开，再分几枚灵石让他买水。" },
      { optionId: "share-pill", label: "分半颗丹", description: "疗伤的那颗掰开，只给一半。" },
      { optionId: "point-path", label: "只指一条路", description: "灯往安全的那边偏一偏，人不必停。" },
      { optionId: "take-map", label: "拿走草图", description: "图到手，水还在自己袋里。" },
    ],
    defaultOptionId: posture === "aggressive" ? "take-map" : posture === "balanced" ? "point-path" : "aid-fellow",
  });
}

function lootWake(nodeId: string, posture: DungeonExpeditionPolicy): WakeNode {
  return finishWake({
    nodeId,
    sceneKind: "loot",
    context: "石台上一只袋子，你和对面的人同时看见了。可以让开、对半拆、喊旁边的人来看，或者先伸手。",
    options: [
      { optionId: "yield-loot", label: "让一步", description: "先松开。对方收进怀里，侧身让路。" },
      { optionId: "share-split", label: "对半拆开", description: "灯下把灵石数开，一人一半。" },
      { optionId: "share-witness", label: "喊人来看", description: "先不拿，叫旁边的人一起看怎么分。" },
      { optionId: "seize-loot", label: "先伸手", description: "比对面快半息。灯可能被碰灭。" },
    ],
    defaultOptionId: posture === "aggressive" ? "seize-loot" : posture === "balanced" ? "share-split" : "yield-loot",
  });
}

function eliteWake(nodeId: string, posture: DungeonExpeditionPolicy): WakeNode {
  return finishWake({
    nodeId,
    sceneKind: "elite",
    context: "前面的脚步声太齐，不像普通巡守。可以绕开、让旁边的人压住、低声提醒一声，或者直接迎上去。",
    options: [
      { optionId: "avoid-elite", label: "绕开", description: "灭灯，贴墙，等那一阵过去。" },
      { optionId: "aid-flank", label: "让旁边的人压住", description: "把半袋药粉拍给同路的人，自己退到侧后。" },
      { optionId: "share-warning", label: "低声说一句", description: "只告诉旁边的人前面有精英，一起退半步。" },
      { optionId: "engage-elite", label: "迎上去", description: "不绕。袖口可能裂，地上也许留下一枚灵石。" },
    ],
    defaultOptionId: posture === "conservative" ? "avoid-elite" : posture === "balanced" ? "aid-flank" : "engage-elite",
  });
}

function bankWake(nodeId: string, posture: DungeonExpeditionPolicy): WakeNode {
  return finishWake({
    nodeId,
    sceneKind: "bank",
    context: "这一截已经有收获，人也不如进来时稳。可以把东西收死、只揣最好的一件、留一半给后来的人，或者再往暗处走一段。",
    options: [
      { optionId: "bank-progress", label: "先收好", description: "缠进内袋，打上死结，这一截不赌。" },
      { optionId: "stable-pocket", label: "只揣最好的一件", description: "像样的塞进贴身处，其余放下。" },
      { optionId: "share-cache", label: "留一半", description: "拿一半，另一半用石块压住，留个能看见的角。" },
      { optionId: "push-deeper", label: "再往里走一段", description: "袋子会更沉，气也会更短。" },
    ],
    defaultOptionId: posture === "conservative" ? "bank-progress" : posture === "balanced" ? "stable-pocket" : "push-deeper",
  });
}

export function maybeCreateDungeonWakeNode(input: {
  progress: DungeonExpeditionProgress;
  cultivator: Cultivator;
  actionKind: "search" | "guardian";
  worldTick: number;
  sectName?: string | null;
}): WakeNode | null {
  const { progress, cultivator, actionKind } = input;
  if (progress.wakeNodesEncountered >= progress.maxWakeNodes || progress.pendingWakeNode) {
    return null;
  }

  const nodeId = `dungeon-wake-${progress.jobId}-${progress.stepIndex}-${progress.wakeNodesEncountered + 1}`;
  const used = new Set(progress.usedWakeScenes ?? []);
  const posture = progress.policy;
  if (progress.stepIndex === 3 && !used.has("moral")) {
    return moralWake(nodeId, posture);
  }
  if (!DUNGEON_ROUTE_SPLIT_STEPS.has(progress.stepIndex)) {
    return null;
  }

  const qiRatio = cultivator.maxQi > 0 ? cultivator.qi / cultivator.maxQi : 0;
  const spiritualRatio = cultivator.maxSpiritualPower > 0
    ? cultivator.spiritualPower / cultivator.maxSpiritualPower
    : 0;
  const elite = actionKind === "guardian" && (qiRatio < 0.55 || spiritualRatio < 0.55 || cultivator.injuryTicksRemaining > 0);
  const rewardsSignificant = progress.spiritStoneGain >= 180 || progress.primaryMaterialCount >= 4;
  const pressureHigh = qiRatio < 0.5 || spiritualRatio < 0.5 || cultivator.injuryTicksRemaining >= 3;
  let roll = hashString(`${progress.jobId}:${progress.stepIndex}:${nodeId}:${input.worldTick}:scene`);
  roll = Math.imul(roll ^ (roll >>> 16), 0x7feb352d);
  roll = Math.imul(roll ^ (roll >>> 15), 0x846ca68b);
  roll = (roll ^ (roll >>> 16)) >>> 0;
  const kind = pickLateWakeKind({
    used,
    elite,
    bank: rewardsSignificant && pressureHigh,
    roll,
  });
  if (!kind) return null;
  if (kind === "fork") return forkWake(nodeId, posture);
  if (kind === "relic") return relicWake(nodeId, posture);
  if (kind === "fellow") return fellowWake(nodeId, posture, input.sectName ?? null);
  if (kind === "loot") return lootWake(nodeId, posture);
  if (kind === "elite") return eliteWake(nodeId, posture);
  if (kind === "bank") return bankWake(nodeId, posture);
  const draft = interiorWakeDraft(kind, posture, interiorPlaceName(progress.grade, progress.targetRank));
  if (!draft) return bankWake(nodeId, posture);
  return finishWake({ nodeId, ...draft });
}

export function chooseDungeonExpeditionStepKind(input: {
  targetRank: DungeonRank;
  frontierRank: DungeonRank;
  highestClearedRank: number;
  policy: DungeonExpeditionPolicy;
  jobId: string;
  stepIndex: number;
  worldTick: number;
  cultivatorId: string;
  grade?: DungeonGrade;
}): "search" | "guardian" {
  if (input.highestClearedRank >= input.targetRank || input.targetRank < input.frontierRank) {
    return "search";
  }

  // An uncleared 甲 floor wounds on the guardian and the run then leaves.
  // The first three steps stay on the road so a side choice and the step-3 wake
  // are already on the table before that fight.
  if (input.grade === "甲" && input.stepIndex < 3) {
    return "search";
  }

  const guardianWeight = POLICY_GUARDIAN_WEIGHT[input.policy];
  const roll = hashString(
    `${input.cultivatorId}:${input.jobId}:${input.worldTick}:${input.stepIndex}:dungeon-expedition`,
  ) % 100;

  return roll < guardianWeight ? "guardian" : "search";
}

export function shouldRetreatDungeonExpedition(
  cultivator: Cultivator,
  policy: DungeonExpeditionPolicy,
): boolean {
  const qiRatio = cultivator.maxQi > 0 ? cultivator.qi / cultivator.maxQi : 0;
  if (policy === "conservative") {
    return qiRatio < 0.6 || cultivator.injuryTicksRemaining > 0;
  }
  if (policy === "balanced") {
    return qiRatio < 0.4 || cultivator.injuryTicksRemaining >= 4;
  }
  return qiRatio < 0.25 || cultivator.injuryTicksRemaining >= 8;
}

export function isDungeonExpeditionCatastrophic(cultivator: Cultivator): boolean {
  const qiThreshold = cultivator.maxQi * 0.1;
  const spiritualThreshold = cultivator.maxSpiritualPower * 0.1;
  return cultivator.qi <= qiThreshold
    || cultivator.spiritualPower <= spiritualThreshold
    || cultivator.injuryTicksRemaining >= 10;
}

function mergeDropCounts(
  base: Partial<Record<ItemId, number>>,
  delta: Partial<Record<ItemId, number>>,
): Partial<Record<ItemId, number>> {
  const merged = { ...base };
  for (const [itemId, count] of Object.entries(delta) as Array<[ItemId, number]>) {
    if (count <= 0) {
      continue;
    }
    merged[itemId] = (merged[itemId] ?? 0) + count;
  }
  return merged;
}

function mergeFlavorEventTitles(
  existing: readonly string[],
  delta: readonly string[],
): string[] {
  const merged = [...existing];
  for (const title of delta) {
    if (!title || merged.includes(title)) {
      continue;
    }
    merged.push(title);
    if (merged.length >= MAX_DUNGEON_FLAVOR_EVENTS) {
      return merged.slice(0, MAX_DUNGEON_FLAVOR_EVENTS);
    }
  }

  return merged;
}

export function recordDungeonExpeditionStep(input: {
  progress: DungeonExpeditionProgress;
  action: "search" | "guardian";
  primaryMaterialCount: number;
  secondaryDrops: Partial<Record<ItemId, number>>;
  spiritStoneGain: number;
  realmProgressGain: number;
  unlockedNextRank: boolean;
  resolvedAtTick: number;
  flavorEventTitles: string[];
}): DungeonExpeditionProgress {
  return {
    ...input.progress,
    stepIndex: input.progress.stepIndex + 1,
    nextResolutionTick: input.resolvedAtTick + DUNGEON_EXPEDITION_STEP_TICKS,
    searchSteps: input.progress.searchSteps + (input.action === "search" ? 1 : 0),
    guardianSteps: input.progress.guardianSteps + (input.action === "guardian" ? 1 : 0),
    primaryMaterialCount: input.progress.primaryMaterialCount + input.primaryMaterialCount,
    secondaryDrops: mergeDropCounts(input.progress.secondaryDrops, input.secondaryDrops),
    spiritStoneGain: input.progress.spiritStoneGain + Math.max(0, input.spiritStoneGain),
    realmProgressGain: input.progress.realmProgressGain + Math.max(0, input.realmProgressGain),
    unlockedNextRank: input.progress.unlockedNextRank || input.unlockedNextRank,
    lastResolvedAction: input.action,
    flavorEventTitles: mergeFlavorEventTitles(input.progress.flavorEventTitles, input.flavorEventTitles),
  };
}

function playerItemName(itemId: string): string {
  const name = ITEM_CATALOG[itemId as ItemId]?.name;
  if (name && /[\u4e00-\u9fff]/u.test(name)) return name;
  return "一件东西";
}

function summarizeSecondaryDrops(drops: Partial<Record<ItemId, number>>): string | null {
  const topDrops = (Object.entries(drops) as Array<[ItemId, number | undefined]>)
    .filter((entry): entry is [ItemId, number] => typeof entry[1] === "number" && entry[1] > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([itemId, count]) => `${count}份${playerItemName(itemId)}`);

  return topDrops.length > 0 ? topDrops.join("，") : null;
}

function fightLine(progress: DungeonExpeditionProgress): string | null {
  const last = progress.combatRounds?.[progress.combatRounds.length - 1];
  if (!last) return null;
  const result = last.outcome === "win" ? "胜" : last.outcome === "loss" ? "负" : last.outcome === "draw" ? "平" : "撤";
  const who = last.party.map((member) => `${member.name}（${member.roleLabel}）`).join("、");
  const wound = last.wound
    ?? ((progress.injuryTicksGained ?? 0) > 0 ? "这一趟已经挂了伤。" : "");
  return `最近一战对上${last.enemyName}，${who ? `${who}上场，` : ""}结果${result}。${last.beats.join("")}${wound}`;
}

function outcomePhrase(outcome: DungeonExpeditionReport["outcome"]): string {
  if (outcome === "completed") {
    return "走完了";
  }
  if (outcome === "withdrew") {
    return "提前撤出了";
  }
  if (outcome === "aborted") {
    return "中途放弃了";
  }
  return "几乎是被抬出来的";
}

const POSTURE_LABEL: Record<DungeonExpeditionPolicy, string> = {
  conservative: "稳妥",
  balanced: "均衡",
  aggressive: "冒进",
};

export function dungeonPostureLabel(policy: DungeonExpeditionPolicy): string {
  return POSTURE_LABEL[policy];
}

function rankOneHerbGatherer(grade: DungeonGrade): DungeonBeat {
  return {
    kind: "person",
    title: "灯下的采药人",
    detail: `${grade}级地宫的第一层里，一个采药人蹲在灯下分拣断根。见你来，把一截还能用的灵草推过来，说再往里别一个人走。`,
    mood: "记住了那张被灯熏黄的脸",
  };
}

const RANK_ONE_BEATS_REST: readonly DungeonBeat[] = [
  {
    kind: "find",
    title: "砖缝里的储物袋",
    detail: "一块松动的地砖下压着一只发潮的小袋，里面是碎灵石和半张画到一半的路线。画的人没有再回来。",
    mood: "收获不大，可像捡到了别人的后半程",
  },
  {
    kind: "close-call",
    title: "活阵眨了一下",
    detail: "脚下的阵纹亮了半息。你踩着灭掉的那一格跨过去，靴底还是烫的。",
    mood: "后颈还凉着",
  },
  {
    kind: "insight",
    title: "壁上的半句口诀",
    detail: "石壁上只剩半句，读出声的时候呼吸自己顺了一拍。不是功法，是有人把活着走出去的方法刻在这里。",
    mood: "心里亮了一下",
  },
  {
    kind: "person",
    title: "往外走的散修",
    detail: "对面来了一个往外撤的散修，袖口是破的。他只说了一句「里面的东西不值这条命」，就侧身让开了路。",
    mood: "有点想跟着他出去",
  },
  {
    kind: "mood",
    title: "第一层的潮气",
    detail: "第一层并不深，潮气却已经压到胸口。灯火矮，脚步声显得很长。",
    mood: "还没出事，已经想记下来",
  },
];

export function rankOneMoralFork(
  policy: DungeonExpeditionPolicy,
  seed: string,
): { beat: DungeonBeat; stoneDelta: number; moralityDelta: number } | null {
  if (hashString(`${seed}:fork`) % 4 !== 0) {
    return null;
  }
  if (policy === "conservative") {
    return {
      stoneDelta: -6,
      moralityDelta: 2,
      beat: {
        kind: "person",
        title: "扶起伤者",
        detail: "岔路里躺着个被阵纹擦伤的人。你把水囊留下，又分了几枚灵石，看他扶着墙往外走。袋子比进来时轻了一点。",
        mood: "东西少了，人还在",
      },
    };
  }
  if (policy === "aggressive") {
    return {
      stoneDelta: 16,
      moralityDelta: -3,
      beat: {
        kind: "close-call",
        title: "拿走了袋子",
        detail: "那人伤得站不稳，袋子就挂在腕上。你拿走了。他没有追，只是看着你走进更暗的那一条。灵石还热着。",
        mood: "手里有东西，心里不干净",
      },
    };
  }
  return {
    stoneDelta: 0,
    moralityDelta: 1,
    beat: {
      kind: "person",
      title: "分了一口水",
      detail: "你把水囊递过去，喝完又还了回来。谁也没多拿谁的东西。各自点了下头，岔路就在这里分开。",
      mood: "算是认识了一个人",
    },
  };
}

function rankOneBeats(grade: DungeonGrade): readonly DungeonBeat[] {
  return [rankOneHerbGatherer(grade), ...RANK_ONE_BEATS_REST];
}

function beatForRank(rank: DungeonRank, grade: DungeonGrade, seed: string): DungeonBeat {
  const pool = rank === 1 ? rankOneBeats(grade) : DUNGEON_BEAT_POOL;
  return pool[hashString(`${seed}:beat`) % pool.length]!;
}

const AGGRESSIVE_LOW_QI_BEAT: DungeonBeat = {
  kind: "injury",
  title: "气不够了还在往里走",
  detail: "灵台发空，脚步开始飘。冒进的路还没到头，肩上已经先挨了一下，血顺着袖口往下走。",
  mood: "该撤了，腿还在往前",
};

export function dangerousDungeonExit(input: {
  policy: DungeonExpeditionPolicy;
  qi: number;
  maxQi: number;
  spiritualPower: number;
  maxSpiritualPower: number;
  injuryTicks: number;
  rank: DungeonRank;
  spiritStones: number;
}): {
  outcome: "withdrew" | "catastrophic";
  stoneLoss: number;
  injuryTicks: number;
  beat: DungeonBeat;
} | null {
  const qiRatio = input.maxQi > 0 ? input.qi / input.maxQi : 0;
  const spiritualRatio = input.maxSpiritualPower > 0 ? input.spiritualPower / input.maxSpiritualPower : 0;
  const catastrophic = qiRatio <= 0.1 || spiritualRatio <= 0.1 || input.injuryTicks >= 10;
  const aggressiveCollapse = input.policy === "aggressive"
    && (qiRatio < 0.37 || spiritualRatio < 0.2 || input.injuryTicks >= 7);
  if (!catastrophic && !aggressiveCollapse) {
    return null;
  }
  const stoneLoss = Math.min(input.spiritStones, 80 + input.rank * 8);
  const outcome = catastrophic ? "catastrophic" : "withdrew";
  const beat: DungeonBeat = outcome === "catastrophic"
    ? {
        kind: "setback",
        title: "几乎是被抬出来的",
        detail: `气快断了。最后一段路是别人拖着你过的门槛，袋子在石阶上磕开，灵石散了 ${stoneLoss} 枚。醒来时人已经在城门口。`,
        mood: "活着，可这一趟是亏的",
      }
    : {
        kind: "injury",
        title: "冒进被地宫吐出来",
        detail: `气血撑不住那条短路。你连滚带爬退到入口，护腕浸透了，路上又洒了 ${stoneLoss} 枚灵石。门在身后合上。`,
        mood: "疼，而且记得为什么疼",
      };
  return {
    outcome,
    stoneLoss,
    injuryTicks: catastrophic ? 8 : 6,
    beat,
  };
}

const DUNGEON_BEAT_POOL: readonly DungeonBeat[] = [
  {
    kind: "find",
    title: "石室残材",
    detail: "塌掉的石室角落里还剩一截温热的灵材，像是有人刚挖走过一回，又没能拿干净。",
    mood: "小有收获，脚步轻了些",
  },
  {
    kind: "find",
    title: "壁缝灵光",
    detail: "墙缝里渗出一点细碎的灵光，刮下来能入药，也沾了满手潮灰。",
    mood: "手还是脏的，心里却稳",
  },
  {
    kind: "close-call",
    title: "夹壁骤合",
    detail: "阵纹忽然亮了一下，左右石壁往中间挤。人是侧身挤出来的，背后的衣料撕了一条。",
    mood: "后背还在发凉",
  },
  {
    kind: "close-call",
    title: "暗器擦肩",
    detail: "岔路上方掉下一枚生锈的暗器，贴着肩膀落下，钉在脚边的砖缝里还在颤。",
    mood: "走得比进来时小心",
  },
  {
    kind: "person",
    title: "岔路散修",
    detail: "遇见一个同样在探路的散修。对方只点了点头，把一盏快灭的灯往这边偏了偏，就拐进另一条岔路。",
    mood: "地宫里居然不算只剩自己",
  },
  {
    kind: "person",
    title: "石台上的人",
    detail: "石台上坐着个调息的人，看见来客就收了功，说前面三丈有活阵，说完便起身往回走。",
    mood: "记住了那句话",
  },
  {
    kind: "insight",
    title: "残诀半行",
    detail: "石壁上剩半行刻痕，读到第二遍时灵台清了一瞬，像是把刚才乱掉的呼吸又顺了回去。",
    mood: "心里亮了一下",
  },
  {
    kind: "mood",
    title: "潮气压胸",
    detail: "越往里走潮气越重，灯火显得很矮。并没有出事，只是胸口一直发紧。",
    mood: "想出去透口气",
  },
  {
    kind: "mood",
    title: "路还算顺",
    detail: "这一段居然没什么岔子。脚印、壁灯、落灰的石阶都按着该有的样子排开。",
    mood: "走得顺，胆子也大了一点",
  },
  {
    kind: "injury",
    title: "肩上的口子",
    detail: "暗处扫来一道锋芒，肩上被拉开一道不深的口子。血不多，可袖子已经湿了一块。",
    mood: "带伤，还想再看一段",
  },
];

export function expeditionPressureFor(input: {
  policy: DungeonExpeditionPolicy;
  rank: DungeonRank;
  grade: DungeonGrade;
  action: "search" | "guardian";
  seed: string;
  qiRatio: number;
}): {
  qiDrain: number;
  spiritualDrain: number;
  injuryTicks: number;
  realmProgress: number;
  stoneDelta: number;
  moralityDelta: number;
  beat: DungeonBeat;
} {
  const roll = hashString(`${input.seed}:pressure`) % 100;
  const beat = beatForRank(input.rank, input.grade, input.seed);
  const rankBump = input.rank >= 7 ? 2 : input.rank >= 4 ? 1 : 0;
  const guardianBump = input.action === "guardian" ? 1 : 0;
  const aggressiveRankDrain = input.policy === "aggressive" && input.rank >= 4
    ? (input.rank >= 7 ? 6 : 3)
    : 0;
  const stoneDelta = 0;
  const moralityDelta = 0;

  if (input.policy === "conservative") {
    return {
      qiDrain: 1 + rankBump,
      spiritualDrain: 1 + guardianBump,
      injuryTicks: 0,
      realmProgress: 2 + guardianBump,
      stoneDelta,
      moralityDelta,
      beat: beat.kind === "injury"
        ? {
            kind: "close-call",
            title: "收手及时",
            detail: "那一下本来能伤到人。稳妥的走法让你提前侧开，只留下掌心一层冷汗。",
            mood: "还活着，而且知道自己为什么还活着",
          }
        : beat,
    };
  }

  if (input.policy === "aggressive") {
    const lowQi = input.qiRatio < 0.6;
    const injured = lowQi || roll < 28;
    return {
      qiDrain: 4 + rankBump + guardianBump + aggressiveRankDrain,
      spiritualDrain: 3 + guardianBump,
      injuryTicks: injured ? 4 : 0,
      realmProgress: 7 + guardianBump + Math.floor((input.rank - 1) / 3),
      stoneDelta,
      moralityDelta,
      beat: injured ? AGGRESSIVE_LOW_QI_BEAT : beat,
    };
  }

  const grazed = roll < 8;
  return {
    qiDrain: 2 + rankBump,
    spiritualDrain: 2 + guardianBump,
    injuryTicks: grazed ? 2 : 0,
    realmProgress: 4 + guardianBump,
    stoneDelta,
    moralityDelta,
    beat: grazed
      ? {
          kind: "injury",
          title: "擦伤",
          detail: "均衡着往前走，还是被阵纹擦到了小臂。不至于退，接下来几步会疼。",
          mood: "挂着轻伤，还没到该撤的时候",
        }
      : beat,
  };
}

export function sightingGapFor(seed: string): 2 | 3 | 4 {
  return (2 + (hashString(`${seed}:sighting`) % 3)) as 2 | 3 | 4;
}

function closedSentence(text: string): string {
  const trimmed = text.trim().replace(/。+$/u, "");
  return trimmed.length > 0 ? `${trimmed}。` : "";
}

export function composeDungeonSighting(beats: readonly DungeonBeat[], place: string): DungeonBeat {
  const recent = beats.slice(-4);
  const last = recent[recent.length - 1];
  const parts = recent.map((beat) => closedSentence(beat.detail)).filter((part) => part.length > 0);
  const body = parts.length > 0 ? parts.join("") : "这一段没有留下能拿回去说的事。";
  return {
    kind: last?.kind ?? "mood",
    title: "这一段见闻",
    detail: `${place}这一段的见闻：${body}`,
    mood: last?.mood ?? "值得回去说",
  };
}

export function appendDungeonBeats(
  progress: DungeonExpeditionProgress,
  added: readonly DungeonBeat[],
  seed: string,
  place: string,
): { progress: DungeonExpeditionProgress; sighting: DungeonBeat | null } {
  if (added.length === 0) {
    return { progress, sighting: null };
  }
  const beats = [...(progress.beats ?? []), ...added].slice(-8);
  const seen = (progress.beatsSeen ?? 0) + added.length;
  const told = progress.beatsTold ?? 0;
  const gap = progress.nextSightingGap ?? sightingGapFor(seed);
  const untold = seen - told;
  if (untold < gap) {
    return {
      progress: { ...progress, beats, beatsSeen: seen, beatsTold: told, nextSightingGap: gap },
      sighting: null,
    };
  }
  const slice = beats.slice(-Math.min(untold, beats.length));
  return {
    sighting: composeDungeonSighting(slice, place),
    progress: {
      ...progress,
      beats,
      beatsSeen: seen,
      beatsTold: seen,
      nextSightingGap: sightingGapFor(`${seed}:${seen}`),
    },
  };
}

export function flushDungeonSighting(
  progress: DungeonExpeditionProgress,
  place: string,
): { progress: DungeonExpeditionProgress; sighting: DungeonBeat | null } {
  const beats = progress.beats ?? [];
  const seen = progress.beatsSeen ?? beats.length;
  const told = progress.beatsTold ?? 0;
  const untold = seen - told;
  if (untold <= 0 || beats.length === 0) {
    return { progress: { ...progress, beatsSeen: seen, beatsTold: told }, sighting: null };
  }
  return {
    sighting: composeDungeonSighting(beats.slice(-Math.min(untold, beats.length)), place),
    progress: { ...progress, beatsSeen: seen, beatsTold: seen },
  };
}

const CARRIED_FLAVOR = ["掌心一点还温的壁灰", "半片刮下来的阵纹", "一截没人认领的灯芯", "袖里沾上的灵砂"] as const;

export function carriedClause(input: {
  stones: number;
  items: readonly { name: string; count: number }[];
  seed: string;
}): string {
  const bits: string[] = [];
  for (const item of input.items.slice(0, 2)) {
    if (!item.name || item.count <= 0) continue;
    bits.push(item.count > 1 ? `${item.count}份${item.name}` : item.name);
  }
  if (input.stones > 0) bits.push(`${input.stones}枚灵石`);
  if (bits.length === 0) {
    bits.push(CARRIED_FLAVOR[hashString(`${input.seed}:carried`) % CARRIED_FLAVOR.length]!);
  }
  return `带出何物：${bits.join("，")}。`;
}

export function withCarriedLine(beats: readonly string[], carried: string): string[] {
  if (!carried) return [...beats];
  if (beats.length === 0) return [carried];
  const next = [...beats];
  const last = next[next.length - 1] ?? "";
  if (last.includes(carried) || last.includes("带出何物")) return next;
  const trimmed = last.replace(/。+$/u, "");
  next[next.length - 1] = `${trimmed}。${carried}`;
  return next;
}

export function createDungeonExpeditionReport(input: {
  progress: DungeonExpeditionProgress;
  outcome: DungeonExpeditionReport["outcome"];
  endedAtTick: number;
  returnLocationId: string;
  returnPlaceName?: string;
  primaryMaterial: ItemId;
  relic?: DungeonExpeditionReport["relic"];
  realmProgressCapped?: boolean;
}): DungeonExpeditionReport {
  const remembered = input.progress.beats?.[input.progress.beats.length - 1];
  const secondaryDrops = { ...input.progress.secondaryDrops };
  if (input.relic) {
    secondaryDrops[input.relic.itemId] = (secondaryDrops[input.relic.itemId] ?? 0) + 1;
  }
  const place = input.returnPlaceName?.trim() || "能歇脚的地方";
  const sideLoot = summarizeSecondaryDrops(secondaryDrops);
  const summary = [
    `地宫${outcomePhrase(input.outcome)}${input.progress.grade}级第${input.progress.targetRank}阶，姿态是${POSTURE_LABEL[input.progress.policy]}。`,
    `带回${input.progress.primaryMaterialCount}份${playerItemName(input.primaryMaterial)}，${sideLoot ? `旁支${sideLoot}` : "没有显眼的旁支"}，灵石${input.progress.spiritStoneGain}枚，${input.realmProgressCapped ? "修为已经满了，再涨要等破境" : `修为涨了${input.progress.realmProgressGain}`}。`,
    `气血耗去${input.progress.qiSpent ?? 0}，灵力耗去${input.progress.spiritualPowerSpent ?? 0}。`,
    (input.progress.stonesLost ?? 0) > 0 ? `路上散落灵石${input.progress.stonesLost}枚。` : null,
    remembered ? `记得最清楚的是：${remembered.detail}` : null,
    input.progress.carriedLine ?? null,
    input.relic?.arcLine ?? null,
    fightLine(input.progress),
    `人已回到${place}。`,
  ].filter((part): part is string => Boolean(part)).join("");

  return {
    cultivatorId: input.progress.cultivatorId,
    grade: input.progress.grade,
    targetRank: input.progress.targetRank,
    policy: input.progress.policy,
    outcome: input.outcome,
    startedAtTick: input.progress.startedAtTick,
    endedAtTick: input.endedAtTick,
    stepsResolved: input.progress.stepIndex,
    primaryMaterial: {
      itemId: input.primaryMaterial,
      itemName: playerItemName(input.primaryMaterial),
      count: input.progress.primaryMaterialCount,
    },
    secondaryDrops,
    secondaryDropCards: (Object.entries(secondaryDrops) as Array<[ItemId, number | undefined]>)
      .filter((entry): entry is [ItemId, number] => typeof entry[1] === "number" && entry[1] > 0)
      .map(([itemId, count]) => ({ itemId, itemName: playerItemName(itemId), count })),
    ...(input.relic ? { relic: input.relic } : {}),
    spiritStoneGain: input.progress.spiritStoneGain,
    realmProgressGain: input.progress.realmProgressGain,
    unlockedNextRank: input.progress.unlockedNextRank,
    returnLocationId: input.returnLocationId,
    summary,
    flavorEvents: [...input.progress.flavorEventTitles],
    beats: [...(input.progress.beats ?? [])],
    qiSpent: input.progress.qiSpent ?? 0,
    spiritualPowerSpent: input.progress.spiritualPowerSpent ?? 0,
    injuryTicksGained: input.progress.injuryTicksGained ?? 0,
    stonesLost: input.progress.stonesLost ?? 0,
    combatRounds: [...(input.progress.combatRounds ?? [])],
  };
}

/**
 * 归虚五处的中文名、岔路和见闻。
 * 时辰到了不得套用这些效果。只有提交的选项才结算。
 */

import type { ItemId } from "./model.js";

export const GUIXU_CHOICE_TICKS = 10;
export const GUIXU_POCKET_STONES = 36;
export const GUIXU_RISK_STONES = 64;

export interface GuixuNodeFacing {
  name: string;
  tierLabel: string;
  typeLabel: string;
  advice: string;
}

export interface GuixuChoiceOption {
  optionId: string;
  label: string;
  description: string;
  line: string;
  stones?: number;
  realmProgress?: number;
  qiCost?: number;
  injuryTicks?: number;
  rewards?: Partial<Record<ItemId, number>>;
}

export interface GuixuScene {
  sceneId: string;
  context: string;
  options: readonly GuixuChoiceOption[];
}

const REALM_FACING: Record<string, string> = {
  "炼气": "炼气",
  "鐐兼皵": "炼气",
  "筑基": "筑基",
  "绛戝熀": "筑基",
  "金丹": "金丹",
  "閲戜腹": "金丹",
  "元婴": "元婴",
  "化神": "化神",
  "炼虚": "炼虚",
  "合体": "合体",
  "大乘": "大乘",
};

const TIER_LABEL: Record<string, string> = {
  entry: "入门",
  mid: "中层",
  deep: "深层",
  core: "核心",
};

const TYPE_LABEL: Record<string, string> = {
  exploration: "探路",
  guardian: "守关",
  resource: "取材",
  sanctuary: "歇处",
};

export const GUIXU_FACING: Record<string, GuixuNodeFacing> = {
  "guixu-threshold-gate": {
    name: "归虚门槛",
    tierLabel: "入门",
    typeLabel: "探路",
    advice: "归虚门槛要筑基，仙缘到二才应。这一处只记在自己名下。走进去会停一次，三四个做法里选。时辰到了不代选，这一步的灵石不进袋子。",
  },
  "guixu-ancient-seal": {
    name: "归虚古印",
    tierLabel: "核心",
    typeLabel: "守关",
    advice: "归虚古印要金丹，仙缘到二才应。一个人打开，旁人也能探。收尾会落下传说遗宝。走进去会停一次。时辰到了不代选，这一步的灵石不进袋子。",
  },
  "guixu-spirit-nexus": {
    name: "归虚灵枢",
    tierLabel: "核心",
    typeLabel: "探路",
    advice: "归虚灵枢要金丹，仙缘到四才应。这一处只记在自己名下。走进去会停两次，场面不一样。时辰到了不代选，这一步的灵石不进袋子。",
  },
  "guixu-void-corridor": {
    name: "归虚虚廊",
    tierLabel: "深层",
    typeLabel: "守关",
    advice: "归虚虚廊要金丹，仙缘到六才应。一个人打开，旁人也能探。收尾会落下传说遗宝和上古遗宝。走进去会停两次。时辰到了不代选，这一步的灵石不进袋子。",
  },
  "guixu-origin-heart": {
    name: "归虚本源心",
    tierLabel: "深层",
    typeLabel: "守关",
    advice: "归虚本源心要金丹，仙缘到八才应。一个人打开，旁人也能探。收尾会落下两件传说遗宝。走进去会停两次。时辰到了不代选，这一步的灵石不进袋子。",
  },
};

const SCENES: Record<string, readonly GuixuScene[]> = {
  "guixu-threshold-gate": [
    {
      sceneId: "threshold-seal",
      context: "归虚门槛上浮着半截残印。印还没干，脚印只到印前就断了。",
      options: [
        {
          optionId: "threshold-follow",
          label: "顺着断掉的脚印走",
          description: "人顺着断印往前，不伸手。",
          line: "顺着断掉的脚印走了一段，残印还在原处。",
        },
        {
          optionId: "threshold-press",
          label: "把残印按实",
          description: "气往印上送一点，修为会顺一些。",
          line: "把残印按实了，气顺了一点。",
          realmProgress: 6,
        },
        {
          optionId: "threshold-pocket",
          label: "抠下印边的石屑",
          description: "手里多三十六枚灵石。",
          line: "印边的石屑进了袋子，手里多了三十六枚灵石。",
          stones: GUIXU_POCKET_STONES,
        },
        {
          optionId: "threshold-look",
          label: "退半步只看",
          description: "人退半步，印不动。",
          line: "退了半步，只把残印看清。",
        },
      ],
    },
  ],
  "guixu-ancient-seal": [
    {
      sceneId: "seal-seam",
      context: "归虚古印压着一道缝。缝里有光，光里有东西在应，应完又沉下去。",
      options: [
        {
          optionId: "seal-hold",
          label: "稳住印面",
          description: "手按在印上，不往缝里伸。",
          line: "印面稳住了，缝里的光没有溢出来。",
          realmProgress: 6,
        },
        {
          optionId: "seal-pocket",
          label: "顺着缝摸一把",
          description: "手里多三十六枚灵石。",
          line: "顺着缝摸了一把，手里多了三十六枚灵石。",
          stones: GUIXU_POCKET_STONES,
        },
        {
          optionId: "seal-risk",
          label: "把印掀开一角",
          description: "手里多六十四枚灵石，气血会下去一截。",
          line: "印被掀开一角，手里多了六十四枚灵石，气血下去一截。",
          stones: GUIXU_RISK_STONES,
          qiCost: 16,
        },
        {
          optionId: "seal-read",
          label: "记下印纹就走",
          description: "纹路记下，印不掀。",
          line: "印纹记在心里，人没有掀印。",
        },
      ],
    },
  ],
  "guixu-spirit-nexus": [
    {
      sceneId: "nexus-vein",
      context: "归虚灵枢在慢慢转。几条旧脉还亮着，靠近时气会被吸过去一截。",
      options: [
        {
          optionId: "nexus-follow",
          label: "顺着亮脉走",
          description: "人跟着还亮的那一条，不把气送进去。",
          line: "顺着亮脉走了一段，气没有被吸走。",
        },
        {
          optionId: "nexus-feed",
          label: "把气送进去一点",
          description: "送进去一截气血，修为会顺一些。",
          line: "把气送进灵枢，修为顺了一点，气血下去一截。",
          realmProgress: 8,
          qiCost: 8,
        },
        {
          optionId: "nexus-pocket",
          label: "摘一截脉纹",
          description: "手里多三十六枚灵石。",
          line: "摘下来的脉纹进了袋子，手里多了三十六枚灵石。",
          stones: GUIXU_POCKET_STONES,
        },
        {
          optionId: "nexus-wait",
          label: "停在枢外",
          description: "人停在外面，枢继续转。",
          line: "停在灵枢外面，看它转完这一圈。",
        },
      ],
    },
    {
      sceneId: "nexus-pool",
      context: "归虚灵枢背面有一汪不往外流的水。水里沉着没人拿走的碎屑。",
      options: [
        {
          optionId: "nexus-leave",
          label: "不碰这汪水",
          description: "水留在原处，人从旁边过去。",
          line: "这汪水没有碰，碎屑还沉在下面。",
        },
        {
          optionId: "nexus-pool-pocket",
          label: "从水边摸一把",
          description: "手里多三十六枚灵石。",
          line: "水边摸了一把，手里多了三十六枚灵石。",
          stones: GUIXU_POCKET_STONES,
        },
        {
          optionId: "nexus-scoop",
          label: "捧一捧碎屑",
          description: "手里多四十八枚灵石，气血会下去一截。",
          line: "捧起来的碎屑是温的，手里多了四十八枚灵石，气血下去一截。",
          stones: 48,
          qiCost: 12,
        },
        {
          optionId: "nexus-look",
          label: "只看水清不清",
          description: "看清就走，手不伸进水里。",
          line: "水是清的，碎屑还在底下，人没有伸手。",
        },
      ],
    },
  ],
  "guixu-void-corridor": [
    {
      sceneId: "corridor-gap",
      context: "归虚虚廊两边的距离不对。脚下有一段是空的，空的那边没有回声。",
      options: [
        {
          optionId: "corridor-wall",
          label: "贴着墙走",
          description: "人贴着还有墙的那一侧，不踩空处。",
          line: "贴着墙走过去了，空的那一段没有踩。",
        },
        {
          optionId: "corridor-count",
          label: "闭眼数步",
          description: "数完再睁眼，修为会顺一些。",
          line: "闭眼数完步子，脚落地的时候修为顺了一点。",
          realmProgress: 6,
        },
        {
          optionId: "corridor-jump",
          label: "从空处跳过去",
          description: "手里多六十四枚灵石，气血会下去一截。",
          line: "从空处跳了过去，手里多了六十四枚灵石，气血下去一截。",
          stones: GUIXU_RISK_STONES,
          qiCost: 18,
        },
        {
          optionId: "corridor-soft",
          label: "把脚步放轻",
          description: "步子放轻，不往空处探。",
          line: "脚步放轻了，虚廊没有应。",
        },
      ],
    },
    {
      sceneId: "corridor-lamp",
      context: "归虚虚廊中段挂着一盏不灭的灯。灯不照路，只照自己的影子，影子比人短一截。",
      options: [
        {
          optionId: "corridor-skip",
          label: "不看这盏灯",
          description: "人从灯下过去，不抬头。",
          line: "灯还亮着，人没有看它。",
        },
        {
          optionId: "corridor-lamp-pocket",
          label: "在灯座下摸一把",
          description: "手里多三十六枚灵石。",
          line: "灯座下摸了一把，手里多了三十六枚灵石。",
          stones: GUIXU_POCKET_STONES,
        },
        {
          optionId: "corridor-turn",
          label: "把灯转过来",
          description: "转灯耗一截气血，修为会顺一些。",
          line: "灯转过来以后仍不照路，修为顺了一点，气血下去一截。",
          realmProgress: 8,
          qiCost: 10,
        },
        {
          optionId: "corridor-mark",
          label: "记下影子的长短",
          description: "长短记下，灯不转。",
          line: "影子比人短一截，这句话记下了。",
        },
      ],
    },
  ],
  "guixu-origin-heart": [
    {
      sceneId: "origin-pulse",
      context: "归虚本源心外面一圈光在跳。跳一下，人就轻一分，脚下的灰也跟着浮起来。",
      options: [
        {
          optionId: "origin-match",
          label: "跟着它跳",
          description: "人跟着光跳，不伸手。",
          line: "跟着那圈光跳了一拍，灰又落回去。",
        },
        {
          optionId: "origin-press",
          label: "把气按住",
          description: "气按住，修为会顺一些。",
          line: "气按住了，那圈光仍在跳，修为顺了一点。",
          realmProgress: 8,
        },
        {
          optionId: "origin-touch",
          label: "伸手去碰那圈光",
          description: "手里多六十四枚灵石，气血会下去一截。",
          line: "碰到那圈光，手里多了六十四枚灵石，气血下去一截。",
          stones: GUIXU_RISK_STONES,
          qiCost: 20,
        },
        {
          optionId: "origin-listen",
          label: "先听它跳完",
          description: "听完这一拍，手不伸。",
          line: "听那圈光跳完，人没有伸手。",
        },
      ],
    },
    {
      sceneId: "origin-ember",
      context: "归虚本源心里有一粒还没熄的火。旁边散着别人没拿走的灰，灰是温的。",
      options: [
        {
          optionId: "origin-guard",
          label: "把火护住",
          description: "火护着，不吹，修为会顺一些。",
          line: "火没有灭，也没有被吹旺，修为顺了一点。",
          realmProgress: 8,
        },
        {
          optionId: "origin-ash",
          label: "捧一把灰",
          description: "手里多三十六枚灵石。",
          line: "灰是温的，捧进袋子，手里多了三十六枚灵石。",
          stones: GUIXU_POCKET_STONES,
        },
        {
          optionId: "origin-stoke",
          label: "把火吹旺一点",
          description: "手里多六十四枚灵石，气血下去一截，还会挂两刻伤。",
          line: "火被吹旺了一点，手里多了六十四枚灵石，气血下去一截，人挂了两刻伤。",
          stones: GUIXU_RISK_STONES,
          qiCost: 24,
          injuryTicks: 2,
        },
        {
          optionId: "origin-back",
          label: "退后看着",
          description: "人退后，火和灰都不动。",
          line: "退了一步看着，火还是那么一点。",
        },
      ],
    },
  ],
};

const AMBIENT: Record<string, readonly string[]> = {
  "guixu-threshold-gate": [
    "门槛外的风停了一停，残印自己亮了一下，又暗回去。",
    "有人在门槛这边留下半句没说完的话，字已经看不清。",
    "仙缘在门槛上应了一下，像有人在另一头敲了敲。",
  ],
  "guixu-ancient-seal": [
    "古印缝里的光换了一次方向，没有人出来。",
    "印面上多了一道新压痕，比手掌窄。",
    "这一处很安静，前面走过的人没有把印合上。",
  ],
  "guixu-spirit-nexus": [
    "旧脉亮了两息，又灭了。被吸走的那一截气没有回来。",
    "枢心转过去的时候，听见很远的水声。",
    "有一截脉纹自己落在脚边，没有人捡。",
  ],
  "guixu-void-corridor": [
    "虚廊里数到第七步，第八步的地面晚了半息才出现。",
    "灯还亮着，影子仍比人短。",
    "廊壁上有一处被摸得发亮，不是自己摸的。",
  ],
  "guixu-origin-heart": [
    "那圈光又跳了一下。灰浮起来，又落回原处。",
    "火没有灭，也没有旺。灰还是温的。",
    "心口那一声很轻，像从很深的地方传上来。",
  ],
};

export function realmGateLabel(realm: string): string {
  return REALM_FACING[realm] ?? "这一境";
}

export function guixuTierLabel(tier: string): string {
  return TIER_LABEL[tier] ?? "这一层";
}

export function guixuTypeLabel(nodeType: string): string {
  return TYPE_LABEL[nodeType] ?? "这一处";
}

export function guixuNodeName(node: { nodeId: string; name: string }): string {
  const facing = GUIXU_FACING[node.nodeId]?.name;
  if (facing) return facing;
  if (/[\u4e00-\u9fff]/u.test(node.name)) return node.name;
  return "归虚";
}

export function guixuScenes(nodeId: string): readonly GuixuScene[] {
  return SCENES[nodeId] ?? [];
}

export function guixuWakeCap(nodeId: string, totalTicks: number): number {
  const limit = totalTicks >= 3 ? 2 : 1;
  return Math.min(guixuScenes(nodeId).length, limit);
}

export function guixuSceneById(sceneId: string): GuixuScene | null {
  for (const scenes of Object.values(SCENES)) {
    const found = scenes.find((scene) => scene.sceneId === sceneId);
    if (found) return found;
  }
  return null;
}

export function guixuOption(sceneId: string, optionId: string): GuixuChoiceOption | null {
  const scene = guixuSceneById(sceneId);
  return scene?.options.find((option) => option.optionId === optionId) ?? null;
}

export function nextAmbientLine(nodeId: string, used: readonly string[]): string | null {
  const lines = AMBIENT[nodeId] ?? [];
  return lines.find((line) => !used.includes(line)) ?? null;
}

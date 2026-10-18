/**
 * Band-specific 八荒 wakes.
 * A timeout must not apply these effects. Only a submitted option does.
 */

export type BahuangOptionEffect =
  | { kind: "ease"; pressure: number }
  | { kind: "pocket"; amount: number }
  | { kind: "stones"; amount: number; pressure?: number }
  | { kind: "realm"; amount: number; pressure: number }
  | { kind: "ration"; delta: number; pressure: number }
  | { kind: "stock"; rations: number; pressure: number }
  | { kind: "spend"; cost: number; gain: number }
  | { kind: "retreat" };

const POCKET = 28;

export interface BahuangSceneOption {
  optionId: string;
  label: string;
  description: string;
  effect: BahuangOptionEffect;
}

export interface BahuangScene {
  sceneKind: string;
  context: string;
  options: readonly BahuangSceneOption[];
  defaultOptionId: string;
}

const DUST: readonly BahuangScene[] = [
  {
    sceneKind: "dust-rope",
    context: "荒尘驿里风忽然一顿。沙客站在前头，尘骑的绳子横过来，断法压在手上，符纸发沉。",
    defaultOptionId: "dust-rope-wait",
    options: [
      { optionId: "dust-rope-duck", label: "从绳子底下钻过去", description: "人从绳子底下过去，符没开。", effect: { kind: "ease", pressure: 1 } },
      { optionId: "dust-rope-pocket", label: "在绳边摸一把", description: "手里多二十八枚灵石，断法也更沉一点。", effect: { kind: "pocket", amount: POCKET } },
      { optionId: "dust-rope-wait", label: "停在沙后等风过去", description: "等这一阵风过去，人没往前挤。", effect: { kind: "ease", pressure: 2 } },
      { optionId: "dust-rope-push", label: "顶着断法往前挤", description: "压力升高，修为也会多一点。", effect: { kind: "realm", amount: 5, pressure: 3 } },
    ],
  },
  {
    sceneKind: "dust-prints",
    context: "荒尘驿的沙上有一串还没被盖住的脚印。沙客的印子比靴子深，尘骑的蹄印绕到侧面。",
    defaultOptionId: "dust-prints-wait",
    options: [
      { optionId: "dust-prints-smooth", label: "把脚印抹平", description: "后来的人少被这串脚印带偏。", effect: { kind: "ease", pressure: 1 } },
      { optionId: "dust-prints-pocket", label: "顺着印子摸一把", description: "印子边上有二十八枚灵石。", effect: { kind: "pocket", amount: POCKET } },
      { optionId: "dust-prints-mark", label: "在旁边做个记号", description: "自己的记号留下，脚印不动。", effect: { kind: "stones", amount: 12 } },
      { optionId: "dust-prints-wait", label: "不跟这串脚印", description: "人按原来的方向走。", effect: { kind: "ease", pressure: 1 } },
    ],
  },
  {
    sceneKind: "dust-camp",
    context: "荒尘驿背风处有一堆灭掉的火。尘骑的绳子还压在柴上，沙客没有留人。",
    defaultOptionId: "dust-camp-warm",
    options: [
      { optionId: "dust-camp-warm", label: "在余温里停一会儿", description: "火已经灭了，余温还在。", effect: { kind: "ease", pressure: 2 } },
      { optionId: "dust-camp-pocket", label: "把灰翻开", description: "灰里有二十八枚灵石，沙也扑到脸上。", effect: { kind: "pocket", amount: POCKET } },
      { optionId: "dust-camp-leave", label: "把干柴留下", description: "自己不烤，留给后来的人。", effect: { kind: "ease", pressure: 1 } },
      { optionId: "dust-camp-read", label: "只看灰里有没有字", description: "有字就记下，灰不翻。", effect: { kind: "stones", amount: 18 } },
    ],
  },
  {
    sceneKind: "dust-well",
    context: "荒尘驿路边一口井，沙已经埋到井沿。沙客蹲在边上，尘骑的绳子垂进井里。断法让符纸贴在井壁上。",
    defaultOptionId: "dust-well-wait",
    options: [
      { optionId: "dust-well-wait", label: "不下去", description: "人站在井沿，没有下去。", effect: { kind: "ease", pressure: 1 } },
      { optionId: "dust-well-pocket", label: "在井沿摸一把", description: "井沿上有二十八枚灵石，断法也更沉一点。", effect: { kind: "pocket", amount: POCKET } },
      { optionId: "dust-well-rope", label: "把绳子拉上来", description: "绳子是干的，手里多了一点灵石。", effect: { kind: "stones", amount: 18 } },
      { optionId: "dust-well-stock", label: "把干粮袋捞上来", description: "袋是别人的，人还是收进了自己袋里。压力高一点，干粮多两口。", effect: { kind: "stock", rations: 2, pressure: 2 } },
    ],
  },
];

const STELE: readonly BahuangScene[] = [
  {
    sceneKind: "stele-root",
    context: "断碑原上碑是断的。你念了半行残字，脚先被石缝定住。碑影缩得很短，碑仆在碑下没抬头。定根从石上往上爬。",
    defaultOptionId: "stele-root-ease",
    options: [
      { optionId: "stele-root-ease", label: "不念那半行字", description: "嘴闭上，脚慢慢松开。", effect: { kind: "ease", pressure: 2 } },
      { optionId: "stele-root-pocket", label: "从石缝里抠一把", description: "缝里有二十八枚灵石，步子更沉。", effect: { kind: "pocket", amount: POCKET } },
      { optionId: "stele-root-wait", label: "拔出来再停住", description: "人站住了，不往碑影那边走。", effect: { kind: "ease", pressure: 1 } },
      { optionId: "stele-root-push", label: "顺着碑影往前挤", description: "定根还在，修为多一点。", effect: { kind: "realm", amount: 5, pressure: 3 } },
    ],
  },
  {
    sceneKind: "stele-shadow",
    context: "断碑原上没有树。碑影在你脚边拉得很长，碑仆跟在碑下。定根拖着小腿。",
    defaultOptionId: "stele-shadow-ease",
    options: [
      { optionId: "stele-shadow-ease", label: "不踩进碑影", description: "从影子外面绕过去。", effect: { kind: "ease", pressure: 1 } },
      { optionId: "stele-shadow-pocket", label: "在碑影边上摸一把", description: "影子边上有二十八枚灵石。", effect: { kind: "pocket", amount: POCKET } },
      { optionId: "stele-shadow-leave", label: "往回撤", description: "这一趟到此为止，人先出去。", effect: { kind: "retreat" } },
      { optionId: "stele-shadow-ration", label: "在碑下留一截干粮", description: "少一口粮，步子轻一点。", effect: { kind: "ration", delta: -1, pressure: 2 } },
    ],
  },
  {
    sceneKind: "stele-seam",
    context: "断碑原的碑肚子里有一条缝。碑仆挡着缝口，定根从石上往上爬，碑影盖住半条缝。",
    defaultOptionId: "stele-seam-ease",
    options: [
      { optionId: "stele-seam-ease", label: "绕开碑仆", description: "不跟碑仆争这条缝。", effect: { kind: "ease", pressure: 1 } },
      { optionId: "stele-seam-pocket", label: "从缝里摸一把", description: "缝里有二十八枚灵石，石粉沾手。", effect: { kind: "pocket", amount: POCKET } },
      { optionId: "stele-seam-spend", label: "用灵石敲开缝", description: "花二十四枚灵石，缝里比花掉的多一些。", effect: { kind: "spend", cost: 24, gain: 48 } },
      { optionId: "stele-seam-read", label: "只记下碑上的字", description: "字是残的，人没伸手。", effect: { kind: "stones", amount: 12 } },
    ],
  },
  {
    sceneKind: "stele-bowl",
    context: "断碑原碑下有一碗干粮。碑影压着碗沿，碑仆没动。定根从石缝里往上爬。",
    defaultOptionId: "stele-bowl-leave",
    options: [
      { optionId: "stele-bowl-leave", label: "不拿这碗", description: "碗留在碑下，人从旁边走。", effect: { kind: "ease", pressure: 2 } },
      { optionId: "stele-bowl-pocket", label: "在碗边摸一把", description: "碗沿上有二十八枚灵石，步子更沉。", effect: { kind: "pocket", amount: POCKET } },
      { optionId: "stele-bowl-look", label: "只看碗是空是满", description: "看清就走，碗没端起来。", effect: { kind: "stones", amount: 12 } },
      { optionId: "stele-bowl-stock", label: "把干粮收进来", description: "干粮进了自己的袋子。压力高一点，能多走两步。", effect: { kind: "stock", rations: 2, pressure: 2 } },
    ],
  },
];

const RAVINE: readonly BahuangScene[] = [
  {
    sceneKind: "lamp-ash",
    context: "无灯壑里灯点不着。灯烬堆在脚边，壑影站在你以为有光的地方。幻惑先花了眼。",
    defaultOptionId: "lamp-ash-wait",
    options: [
      { optionId: "lamp-ash-ease", label: "不朝那团光走", description: "眼睛还花着，脚停在灯烬外面。", effect: { kind: "ease", pressure: 1 } },
      { optionId: "lamp-ash-pocket", label: "把灯烬拨开", description: "灰里有二十八枚灵石，眼前更花。", effect: { kind: "pocket", amount: POCKET } },
      { optionId: "lamp-ash-wait", label: "闭眼数干粮", description: "数完再睁眼，人还在原处。", effect: { kind: "ease", pressure: 2 } },
      { optionId: "lamp-ash-push", label: "朝壑影走两步", description: "幻惑更重，修为多一点。", effect: { kind: "realm", amount: 5, pressure: 3 } },
    ],
  },
  {
    sceneKind: "ravine-prints",
    context: "无灯壑脚下忽然软了一块。你看见的脚印比靴子深，人已经不在。灯烬灭着，壑影站在深印旁边。幻惑让第二眼和第一眼对不上。",
    defaultOptionId: "ravine-prints-ease",
    options: [
      { optionId: "ravine-prints-ease", label: "退半步", description: "不跟这串深印。", effect: { kind: "ease", pressure: 1 } },
      { optionId: "ravine-prints-pocket", label: "顺着深脚印摸一把", description: "印子边上有二十八枚灵石。", effect: { kind: "pocket", amount: POCKET } },
      { optionId: "ravine-prints-smooth", label: "把脚印抹平", description: "后来的人少被这串印子带偏。", effect: { kind: "ease", pressure: 1 } },
      { optionId: "ravine-prints-mark", label: "留一盏没点着的灯", description: "灯没点着，记号留下了。", effect: { kind: "stones", amount: 12 } },
    ],
  },
  {
    sceneKind: "illusion-voice",
    context: "无灯壑暗处有人低声问你还走不走。灯烬亮了一下就灭。壑影站在问话的方向。幻惑让那声音像从你自己袖子里出来。",
    defaultOptionId: "illusion-voice-ease",
    options: [
      { optionId: "illusion-voice-ease", label: "不应这句", description: "嘴闭上，人不往声音那边走。", effect: { kind: "ease", pressure: 1 } },
      { optionId: "illusion-voice-pocket", label: "应一声再摸一把", description: "应了之后，脚边有二十八枚灵石。", effect: { kind: "pocket", amount: POCKET } },
      { optionId: "illusion-voice-wait", label: "把那点光吹灭", description: "光本来也没稳住，吹完眼前静一点。", effect: { kind: "ease", pressure: 2 } },
      { optionId: "illusion-voice-push", label: "朝声音走过去", description: "幻惑更重，修为多一点。", effect: { kind: "realm", amount: 5, pressure: 3 } },
    ],
  },
  {
    sceneKind: "lamp-ration",
    context: "无灯壑脚边有一盏灭掉的灯，灯盏下压着一小袋干粮。灯烬是凉的，壑影站在灯后。幻惑让袋口看起来比实际深。",
    defaultOptionId: "lamp-ration-leave",
    options: [
      { optionId: "lamp-ration-leave", label: "不掀这盏灯", description: "灯留在脚边，人没有蹲下去。", effect: { kind: "ease", pressure: 1 } },
      { optionId: "lamp-ration-pocket", label: "在灯下摸一把", description: "灯下有二十八枚灵石，眼前更花。", effect: { kind: "pocket", amount: POCKET } },
      { optionId: "lamp-ration-mark", label: "把灯留在原处", description: "灯没点着，人只在旁边停了一停。", effect: { kind: "stones", amount: 12 } },
      { optionId: "lamp-ration-stock", label: "把干粮收进来", description: "干粮进了袋子。幻惑更重一点，能多走两步。", effect: { kind: "stock", rations: 2, pressure: 2 } },
    ],
  },
];

const SCENES_BY_PLACE: Record<string, readonly BahuangScene[]> = {
  荒尘驿: DUST,
  断碑原: STELE,
  无灯壑: RAVINE,
};

const EFFECT_BY_ID = new Map<string, BahuangOptionEffect>();
for (const scenes of Object.values(SCENES_BY_PLACE)) {
  for (const scene of scenes) {
    for (const option of scene.options) EFFECT_BY_ID.set(option.optionId, option.effect);
  }
}

export function bahuangBandScenes(placeName: string): readonly BahuangScene[] {
  return SCENES_BY_PLACE[placeName] ?? DUST;
}

export function bahuangOptionEffect(optionId: string): BahuangOptionEffect | null {
  return EFFECT_BY_ID.get(optionId) ?? null;
}

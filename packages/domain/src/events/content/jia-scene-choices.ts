import type { JiaTemperamentId } from "../../model.js";
import type { EventTemplate } from "../../events.js";
import { sceneEventFromBeat, type Beat } from "./scene-choices.js";

/**
 * Side choices inside 甲级.
 * The walk / help / take / risk skeleton stays. The sentences stay in the
 * 丹霞内府: furnace ash, fire poison, and array lines, not a street market.
 */

const JIA_BEATS: readonly Beat[] = [
  {
    id: "jia-sc-01",
    name: "Warm Ash in the Furnace",
    nameCn: "丹炉里的余灰",
    semanticType: "fortune",
    description: "丹炉还烫着。灰里压着一页没烧完的丹方，炉口有一缕火毒慢慢往外吐。",
    title: "丹炉里的余灰",
    prompt: "丹炉还烫着，灰里压着一页没烧完的丹方，火毒在炉口轻轻往外吐。你怎么做？",
    walk: ["离炉三步，不拨这堆灰", "炉还烫着，灰仍压着那页丹方。"],
    help: ["把丹方抽出，压在炉外的石上", "你把丹方抽出来压在石上。后来收炉的人只留了很少的谢礼。"],
    take: ["只取灰下那几枚灵石", "丹方还压在灰里，灰下的灵石进了你的袋。", 8],
    risk: ["连带着火毒的那一层灰也刮下来", "你刮下一层带火毒的灰，又多摸到几枚。袖口被烫了一下，灵力沉了些。", 14],
  },
  {
    id: "jia-sc-02",
    name: "Fire Poison in the Crack",
    nameCn: "石缝里的火毒",
    semanticType: "fortune",
    description: "石缝里凝着一滴火毒，旁边搁着半只没封口的瓶子。画阵的人已经走远。",
    title: "石缝里的火毒",
    prompt: "石缝里凝着一滴火毒，旁边搁着半只没封口的瓶子。人已经走远。你怎么做？",
    walk: ["看一眼就离开这条缝", "火毒还凝在缝里，瓶子也还在。"],
    help: ["把瓶子扶正，滴回瓶里盖上", "你把那一滴送回瓶子。回来的人只给了很少的封口钱。"],
    take: ["拿走瓶边压着的灵石", "瓶子还开着，瓶边那几枚进了口袋。", 6],
    risk: ["用自己的小瓶吸走那一滴", "你吸走了火毒，又在缝底多摸到几枚。毒气温了一下，灵力沉了些。", 12],
  },
  {
    id: "jia-sc-03",
    name: "Half-Lit Array",
    nameCn: "半亮的阵纹",
    semanticType: "human",
    description: "地面上的阵纹只亮了半边。纹心里压着几枚灵石，踩上去会响。",
    title: "半亮的阵纹",
    prompt: "地面上的阵纹只亮了半边，纹心里压着几枚灵石。踩上去会响。你怎么做？",
    walk: ["贴着暗的那半边走过去", "阵纹还半亮着，你没有踩进纹心。"],
    help: ["把断掉的那一笔用指尖补上", "你补上断笔，纹心的灵石留在原处。后来巡阵的人只给了很少的谢礼。"],
    take: ["只取纹心里的灵石", "阵纹还亮着半边，纹心的灵石不在了。", 8],
    risk: ["顺着亮纹再往里摸一截", "你顺着亮纹摸进一截，多带出几枚。阵纹弹了一下，灵力沉了些。", 14],
  },
  {
    id: "jia-sc-04",
    name: "Dew in the Danxia Wall",
    nameCn: "丹霞壁上的露",
    semanticType: "fortune",
    description: "丹霞壁裂开一条缝。缝里渗着露，露下压着一小袋没人收的灵石。",
    title: "丹霞壁上的露",
    prompt: "丹霞壁裂开一条缝，缝里渗着露，露下压着一小袋没人收的灵石。你怎么做？",
    walk: ["不伸手，继续沿壁走", "露还在渗，袋子也还在缝里。"],
    help: ["用空瓶接下那点露，袋子留着", "你接下露，袋子留在原处。后来取露的人只给了很少的谢礼。"],
    take: ["只拿走那一小袋", "露还在渗，袋子进了你手里。", 10],
    risk: ["连壁缝深处那一层也刮下来", "你刮下深处一层，又多换了几枚。丹霞的热气扑到脸上，灵力沉了些。", 16],
  },
  {
    id: "jia-sc-05",
    name: "Lamp on the Array Eye",
    nameCn: "阵眼上的灵火",
    semanticType: "human",
    description: "灵火灯还在阵眼上烧，油不多了。灯座下压着一张残符和几枚灵石。",
    title: "阵眼上的灵火",
    prompt: "灵火灯还在阵眼上烧，油不多了，灯座下压着一张残符。你怎么做？",
    walk: ["借着这点火走过去", "灯还在阵眼上，残符也还压着。"],
    help: ["添一点自己的灯油，残符留着", "你添了油，残符和灵石都留在灯座下。后来取灯的人把人情记了一笔。"],
    take: ["取走灯座下的灵石", "灯还烧着，灯座下的灵石不在了。残符还压着。", 6],
    risk: ["把残符上没干的朱砂也刮下来", "你刮下朱砂，又多摸到座里的几枚。灵火跳了一下，灵力沉了些。", 12],
  },
  {
    id: "jia-sc-06",
    name: "Scorched Recipe",
    nameCn: "丹炉边烧去一角的丹方",
    semanticType: "fortune",
    description: "丹炉边上，丹方烧去了一角，字还认得。纸下夹着定这一炉的灵石，炉边没有人。",
    title: "丹炉边烧去一角的丹方",
    prompt: "丹炉边的丹方烧去了一角，字还认得，纸下夹着定这一炉的灵石。炉边没有人。你怎么做？",
    walk: ["用石块压住，让后来的人看见", "丹方还在炉边，你只用石块压住。"],
    help: ["把烧角的地方折好，灵石留在纸下", "你折好烧角。回来的人只给了很少的等候钱。"],
    take: ["抽出纸下的灵石，丹方留着", "丹方还在，纸下的灵石不在了。", 8],
    risk: ["按方子残句再去炉肚摸一把", "你按残句在炉肚摸到一小把，又多换了几枚。热气反上来，灵力沉了些。", 14],
  },
  {
    id: "jia-sc-07",
    name: "Poisoned Water Skin",
    nameCn: "结着火毒的水囊",
    semanticType: "human",
    description: "一只水囊靠在丹炉边上，囊口结着火毒的霜。主人的手印还在，人却不在。",
    title: "结着火毒的水囊",
    prompt: "一只水囊靠在丹炉边上，囊口结着火毒的霜。主人的手印还在，人却不在。你怎么做？",
    walk: ["不碰水囊，绕开丹炉", "水囊还靠在炉边，霜也还结着。"],
    help: ["把霜擦掉，水囊留在原处", "你擦掉囊口的霜。后来回来的人只给了很少的谢礼。"],
    take: ["解下水囊上系着的灵石", "水囊还在，系着的那几枚进了口袋。", 8],
    risk: ["把囊里没封死的那一点也倒出来", "你倒出囊底一点，又多换了几枚。火毒沾到指节，灵力沉了些。", 14],
  },
  {
    id: "jia-sc-08",
    name: "Scorch on the Stone Table",
    nameCn: "石台上的焦痕",
    semanticType: "fortune",
    description: "石台上有一溜被阵纹擦出来的焦痕。焦痕尽头放着一只没盖严的匣子。",
    title: "石台上的焦痕",
    prompt: "石台上有一溜被阵纹擦出来的焦痕，焦痕尽头放着一只没盖严的匣子。你怎么做？",
    walk: ["看过焦痕就离开石台", "匣子还开着一条缝，你没有伸手。"],
    help: ["把匣盖盖严，推到焦痕外面", "你盖严匣子。后来回来的人只留了很少的谢礼。"],
    take: ["只取匣口露出来的灵石", "匣子还开着，露在口上的灵石不在了。", 10],
    risk: ["把匣底那一层阵纹碎片也带上", "你带上匣底的碎片，又多摸到几枚。阵纹刺了一下指腹，灵力沉了些。", 16],
  },
];

const JIA_SCENE_PACK: Record<string, JiaTemperamentId> = {
  "jia-sc-01": "danxia",
  "jia-sc-04": "danxia",
  "jia-sc-06": "danxia",
  "jia-sc-02": "fire-poison",
  "jia-sc-07": "fire-poison",
  "jia-sc-03": "array",
  "jia-sc-05": "array",
  "jia-sc-08": "array",
};

export function jiaScenePack(eventId: string): JiaTemperamentId | null {
  return JIA_SCENE_PACK[eventId] ?? null;
}

export function jiaDungeonSideEvents(temperament?: JiaTemperamentId): EventTemplate[] {
  const beats = temperament
    ? JIA_BEATS.filter((beat) => JIA_SCENE_PACK[beat.id] === temperament)
    : JIA_BEATS;
  return beats.map(sceneEventFromBeat);
}

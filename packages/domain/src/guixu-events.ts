import type { ItemId, WorldEvent } from "./model.js";

export interface GuixuEventDefinition {
  eventId: string;
  title: string;
  content: string;
  summary: string;
  severity: WorldEvent["severity"];
  tags: string[];
  spiritStoneReward?: number;
  realmProgressReward?: number;
  rewards?: Partial<Record<ItemId, number>>;
}

const GUIXU_TAGS = ["guixu", "endgame"] as const;

function guixuEvent(
  eventId: string,
  title: string,
  content: string,
  summary: string,
  extras: Omit<GuixuEventDefinition, "eventId" | "title" | "content" | "summary" | "severity" | "tags"> & {
    severity?: WorldEvent["severity"];
    tags?: string[];
  } = {},
): GuixuEventDefinition {
  return {
    eventId,
    title,
    content,
    summary,
    severity: extras.severity ?? "medium",
    tags: extras.tags ?? [...GUIXU_TAGS],
    spiritStoneReward: extras.spiritStoneReward,
    realmProgressReward: extras.realmProgressReward,
    rewards: extras.rewards,
  };
}

export const GUIXU_EVENT_POOL: Record<string, GuixuEventDefinition> = {
  "guixu-threshold-vision": guixuEvent(
    "guixu-threshold-vision",
    "门槛上的残影",
    "残影在归虚门槛上停了一停，往前的路比进来时清楚一点。",
    "在归虚门槛上看清了一段残影",
    { spiritStoneReward: 90, realmProgressReward: 12, rewards: { "ancient-artifact": 1 }, tags: [...GUIXU_TAGS, "vision"] },
  ),
  "guixu-threshold-echo": guixuEvent(
    "guixu-threshold-echo",
    "门槛应了一声",
    "归虚门槛自己应了一声，应完就静了。脚下那道印比刚才深。",
    "听见归虚门槛应了一声",
    { spiritStoneReward: 70, realmProgressReward: 12, rewards: { "ancient-artifact": 1 }, tags: [...GUIXU_TAGS, "vision"] },
  ),
  "guixu-abyssal-cache": guixuEvent(
    "guixu-abyssal-cache",
    "门槛下的旧匣",
    "归虚门槛下面露出一只没合严的旧匣，匣里的东西还在。",
    "打开了归虚门槛下的旧匣",
    { spiritStoneReward: 120, rewards: { "ancient-artifact": 1, "ruin-fragment": 1 }, tags: [...GUIXU_TAGS, "cache"] },
  ),
  "guixu-ancient-seal": guixuEvent(
    "guixu-ancient-seal",
    "古印松了一线",
    "归虚古印应了这一趟，缝里的光松了一线，又合上。",
    "让归虚古印松了一线",
    { severity: "high", realmProgressReward: 24, rewards: { "legendary-artifact": 1 }, tags: [...GUIXU_TAGS, "guardian", "shared-progress"] },
  ),
  "guixu-ancient-seal-light": guixuEvent(
    "guixu-ancient-seal-light",
    "印纹自己亮了",
    "归虚古印上的纹路自己亮了一遍，亮完就暗，暗处多了一件东西。",
    "看见归虚古印的纹路亮了一遍",
    { severity: "high", spiritStoneReward: 40, realmProgressReward: 16, rewards: { "legendary-artifact": 1 }, tags: [...GUIXU_TAGS, "guardian", "shared-progress"] },
  ),
  "guixu-ancient-seal-crack": guixuEvent(
    "guixu-ancient-seal-crack",
    "印边裂了一道",
    "归虚古印边上裂开一道细缝，缝里滚出一件东西，缝随即合上。",
    "从归虚古印的细缝里取出东西",
    { severity: "high", realmProgressReward: 24, rewards: { "legendary-artifact": 1, "ruin-fragment": 1 }, tags: [...GUIXU_TAGS, "guardian", "shared-progress"] },
  ),
  "guixu-spirit-nexus-echo": guixuEvent(
    "guixu-spirit-nexus-echo",
    "灵枢应脉",
    "归虚灵枢转完这一圈，旧脉应了一下，气比进来时厚。",
    "在归虚灵枢里应上了旧脉",
    { spiritStoneReward: 150, realmProgressReward: 15, rewards: { "ancient-artifact": 1 }, tags: [...GUIXU_TAGS, "nexus"] },
  ),
  "guixu-spirit-nexus-well": guixuEvent(
    "guixu-spirit-nexus-well",
    "枢背的水落定",
    "归虚灵枢背面那汪水终于平了，水底的东西露了出来。",
    "等归虚灵枢背面的水落定",
    { spiritStoneReward: 120, realmProgressReward: 12, rewards: { "ancient-artifact": 1 }, tags: [...GUIXU_TAGS, "nexus"] },
  ),
  "guixu-spirit-nexus-pulse": guixuEvent(
    "guixu-spirit-nexus-pulse",
    "灵枢多转了一圈",
    "归虚灵枢多转了一圈，亮脉灭了又亮，灭的时候留下一件东西。",
    "看归虚灵枢多转了一圈",
    { spiritStoneReward: 150, realmProgressReward: 18, rewards: { "ancient-artifact": 1 }, tags: [...GUIXU_TAGS, "nexus"] },
  ),
  "guixu-void-corridor-trial": guixuEvent(
    "guixu-void-corridor-trial",
    "虚廊走到了头",
    "归虚虚廊的空处在脚下合上，人走出来的时候手里多了东西。",
    "走完了归虚虚廊",
    { severity: "high", realmProgressReward: 30, rewards: { "legendary-artifact": 1, "ancient-artifact": 2 }, tags: [...GUIXU_TAGS, "guardian", "shared-progress", "trial"] },
  ),
  "guixu-void-corridor-span": guixuEvent(
    "guixu-void-corridor-span",
    "虚廊把路补上",
    "归虚虚廊晚了半息才把路补上，补上的那一截边上搁着东西。",
    "等归虚虚廊把路补上",
    { severity: "high", spiritStoneReward: 40, realmProgressReward: 24, rewards: { "legendary-artifact": 1, "ancient-artifact": 2 }, tags: [...GUIXU_TAGS, "guardian", "shared-progress", "trial"] },
  ),
  "guixu-void-corridor-lamp": guixuEvent(
    "guixu-void-corridor-lamp",
    "灯灭了一息",
    "归虚虚廊那盏灯灭了一息，再亮的时候影子恢复了原长，灯座边多了东西。",
    "看见归虚虚廊的灯灭了一息",
    { severity: "high", realmProgressReward: 30, rewards: { "legendary-artifact": 1, "ancient-artifact": 2 }, tags: [...GUIXU_TAGS, "guardian", "shared-progress", "trial"] },
  ),
  "guixu-origin-heart-awakening": guixuEvent(
    "guixu-origin-heart-awakening",
    "本源心跳了一拍",
    "归虚本源心跳完这一拍，火还在，灰还是温的，拍子里落下东西。",
    "听见归虚本源心跳了一拍",
    { severity: "high", spiritStoneReward: 300, realmProgressReward: 50, rewards: { "legendary-artifact": 2 }, tags: [...GUIXU_TAGS, "guardian", "shared-progress", "origin", "finale"] },
  ),
  "guixu-origin-heart-ember": guixuEvent(
    "guixu-origin-heart-ember",
    "本源心的火没灭",
    "归虚本源心那粒火到底没有灭，人退出去的时候火光里夹着东西。",
    "确认归虚本源心的火还在",
    { severity: "high", spiritStoneReward: 240, realmProgressReward: 40, rewards: { "legendary-artifact": 2 }, tags: [...GUIXU_TAGS, "guardian", "shared-progress", "origin", "finale"] },
  ),
  "guixu-origin-heart-ash": guixuEvent(
    "guixu-origin-heart-ash",
    "本源心的灰还温",
    "归虚本源心旁边的灰到离开时还是温的，灰下压着这一趟的东西。",
    "从归虚本源心的暖灰下取出东西",
    { severity: "high", spiritStoneReward: 300, realmProgressReward: 50, rewards: { "legendary-artifact": 2, "ancient-artifact": 1 }, tags: [...GUIXU_TAGS, "guardian", "shared-progress", "origin", "finale"] },
  ),
};

export const GUIXU_NODE_EVENT_POOLS: Record<string, readonly string[]> = {
  "guixu-threshold-gate": ["guixu-threshold-vision", "guixu-threshold-echo", "guixu-abyssal-cache"],
  "guixu-ancient-seal": ["guixu-ancient-seal", "guixu-ancient-seal-light", "guixu-ancient-seal-crack"],
  "guixu-spirit-nexus": ["guixu-spirit-nexus-echo", "guixu-spirit-nexus-well", "guixu-spirit-nexus-pulse"],
  "guixu-void-corridor": ["guixu-void-corridor-trial", "guixu-void-corridor-span", "guixu-void-corridor-lamp"],
  "guixu-origin-heart": ["guixu-origin-heart-awakening", "guixu-origin-heart-ember", "guixu-origin-heart-ash"],
};

export function eventPoolForNode(nodeId: string, fallback: readonly string[]): string[] {
  const canonical = GUIXU_NODE_EVENT_POOLS[nodeId];
  if (canonical && canonical.length > 0) return [...canonical];
  return fallback.length > 0 ? [...fallback] : ["guixu-threshold-vision"];
}

export function getGuixuEventDefinition(eventId: string): GuixuEventDefinition | null {
  return GUIXU_EVENT_POOL[eventId] ?? null;
}

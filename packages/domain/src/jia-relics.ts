import type {
  DungeonExpeditionOutcome,
  DungeonGrade,
  ItemId,
  JiaRelicNote,
} from "./model.js";
import { mysteryForRank } from "./high-realm.js";

/**
 * One story relic from a finished 甲 run.
 * The count is one. Guardian formulas are not involved.
 */

export type JiaRelicKind = "page" | "ash" | "flake";

export interface JiaRelicDefinition {
  itemId: ItemId;
  name: string;
  nameEn: string;
  mysteryId: "danxia" | "infant-pool" | "divine-rift";
  kind: JiaRelicKind;
  arcLine: string;
  descriptionEn: string;
}

export const JIA_RELICS: readonly JiaRelicDefinition[] = [
  {
    itemId: "danxia-page-scrap",
    name: "丹霞残页",
    nameEn: "Danxia Page Scrap",
    mysteryId: "danxia",
    kind: "page",
    arcLine: "丹霞内府的炉壁夹层里抽出这页残页，边是焦的，中间还剩半行认得的字。",
    descriptionEn: "A scorched page pulled from a crack in the Danxia treasury wall.",
  },
  {
    itemId: "danxia-kiln-ash",
    name: "丹霞炉灰",
    nameEn: "Danxia Kiln Ash",
    mysteryId: "danxia",
    kind: "ash",
    arcLine: "丹霞内府的丹炉底下刮下这撮炉灰，放凉了还是红的，一碰就沾在指上。",
    descriptionEn: "Red ash scraped from the bottom of a Danxia furnace.",
  },
  {
    itemId: "danxia-pattern-flake",
    name: "丹霞纹屑",
    nameEn: "Danxia Pattern Flake",
    mysteryId: "danxia",
    kind: "flake",
    arcLine: "丹霞内府的壁上掉下这点纹屑，纹路还连着，不像随手捡的土。",
    descriptionEn: "A flake of wall pattern from the Danxia treasury.",
  },
  {
    itemId: "infant-page-scrap",
    name: "婴火残页",
    nameEn: "Infant-Fire Page Scrap",
    mysteryId: "infant-pool",
    kind: "page",
    arcLine: "婴火莲池边的石缝里揭下这页残页，纸很薄，靠近火的那一侧卷着。",
    descriptionEn: "A thin page lifted from a stone crack beside the infant-fire pool.",
  },
  {
    itemId: "infant-kiln-ash",
    name: "婴火炉灰",
    nameEn: "Infant-Fire Kiln Ash",
    mysteryId: "infant-pool",
    kind: "ash",
    arcLine: "婴火莲池的莲炉底下留着这撮炉灰，灰是白的，里面还夹着一点没熄的红。",
    descriptionEn: "Pale ash from the lotus furnace, with a little red still in it.",
  },
  {
    itemId: "infant-pattern-flake",
    name: "婴火纹屑",
    nameEn: "Infant-Fire Pattern Flake",
    mysteryId: "infant-pool",
    kind: "flake",
    arcLine: "婴火莲池的池沿上刮下这点纹屑，纹是火烧出来的，不是刻上去的。",
    descriptionEn: "A flake of fire-marked rim from the infant-fire pool.",
  },
  {
    itemId: "rift-page-scrap",
    name: "神纹残页",
    nameEn: "Divine-Rift Page Scrap",
    mysteryId: "divine-rift",
    kind: "page",
    arcLine: "神纹天隙的夹缝里带出这页残页，字不连，可每一笔都压得很深。",
    descriptionEn: "A page from a crack in the divine rift. The strokes are deep.",
  },
  {
    itemId: "rift-kiln-ash",
    name: "神纹炉灰",
    nameEn: "Divine-Rift Kiln Ash",
    mysteryId: "divine-rift",
    kind: "ash",
    arcLine: "神纹天隙里那只冷炉底下留下这撮炉灰，灰很轻，摊开能看见细纹。",
    descriptionEn: "Light ash from the cold furnace in the divine rift.",
  },
  {
    itemId: "rift-pattern-flake",
    name: "神纹纹屑",
    nameEn: "Divine-Rift Pattern Flake",
    mysteryId: "divine-rift",
    kind: "flake",
    arcLine: "神纹天隙的壁上震下这点纹屑，屑很小，对上光能看见一层纹。",
    descriptionEn: "A small flake shaken off the divine-rift wall.",
  },
];

const RELIC_BY_ID = new Map(JIA_RELICS.map((relic) => [relic.itemId, relic]));

function hashString(input: string): number {
  return Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

export function jiaRelicByItemId(itemId: string): JiaRelicDefinition | null {
  return RELIC_BY_ID.get(itemId as ItemId) ?? null;
}

export function jiaRelicsHeld(inventory: Partial<Record<ItemId, number>>): JiaRelicDefinition[] {
  return JIA_RELICS.filter((relic) => (inventory[relic.itemId] ?? 0) > 0);
}

export function jiaRelicHint(grade: DungeonGrade | undefined, rank: number): string | null {
  const mystery = grade ? mysteryForRank(grade, rank) : null;
  if (!mystery) return null;
  const names = JIA_RELICS.filter((relic) => relic.mysteryId === mystery.id).map((relic) => relic.name);
  return `走完${mystery.name}会留下一份能拿回去说的东西，${names.join("、")}里的一件。只有一份，不改守关。`;
}

export function chronicleRelic(input: {
  grade: DungeonGrade;
  rank: number;
  outcome: DungeonExpeditionOutcome;
  seed: string;
}): JiaRelicNote | null {
  if (input.outcome !== "completed") return null;
  const mystery = mysteryForRank(input.grade, input.rank);
  if (!mystery) return null;
  const pool = JIA_RELICS.filter((relic) => relic.mysteryId === mystery.id);
  const picked = pool[hashString(`${input.seed}:jia-relic`) % pool.length];
  if (!picked) return null;
  return {
    itemId: picked.itemId,
    name: picked.name,
    mysteryId: mystery.id,
    mysteryName: mystery.name,
    kind: picked.kind,
    rank: input.rank,
    arcLine: picked.arcLine,
  };
}

import { RESIDENCE_PRODUCTION_RECIPES } from "./constants.js";
import type { Cultivator, ProductionRecipe, Residence, ResidenceActionId } from "./model.js";
import type { LocationId, RiskLevel } from "./constants.js";

// ---- Residence Catalog: 九州洞府定义 ----

export interface ResidenceCatalogEntry {
  readonly stateId: string;
  readonly stateName: string;
  readonly name: string;
  readonly description: string;
  readonly risk: RiskLevel;
}

export const RESIDENCE_CATALOG: readonly ResidenceCatalogEntry[] = [
  {
    stateId: "qingzhou",
    stateName: "青州",
    name: "青岚洞府",
    risk: "safe",
    description: "洞府建于青岚城外翠峰山腰，四面竹林环绕，终年薄雾缭绕。门前小溪潺潺，溪中青石生苔。室内以青竹为梁、草编为帘，一石案供茶具与灵材；墙壁嵌有暖光灵石，冬暖夏凉。窗外远眺可见青州平原与晨雾中的田野，空气清新安宁，适合初入修行者安心闭关。",
  },
  {
    stateId: "yangzhou",
    stateName: "扬州",
    name: "广津洞府",
    risk: "low",
    description: "位于广津城内河道旁的临水洞府，建在一段古河堤之上。庭院种有芙蓉与垂柳，推窗即是江面帆影。室内木雕精细，屏风绘江南水乡图景，灵力阵法融于窗棂，潮起时引入水系灵气。楼下是石板小径通向码头，夜间常闻远处渔歌，是一处兼具修行与闲适的居所。",
  },
  {
    stateId: "zhongzhou",
    stateName: "中州",
    name: "天衡洞府",
    risk: "medium",
    description: "坐落于天衡城核心城区高塔之间的崖壁洞府，居高临下俯瞰中州交通枢纽。洞府以花岗岩砌成，室内格局方正，灵力传导阵刻于地面。正堂悬挂九州舆图与万物衡天匾额，边厅设有炼器台与藏书架。窗外可见往来商队与修士穿梭于官道之上，终日鼎沸中自有一片静域。",
  },
  {
    stateId: "shuzhou",
    stateName: "蜀州",
    name: "栖云洞府",
    risk: "medium",
    description: "栖云城外的悬崖洞府，隐于万仞绝壁与飞瀑之间。入口需经百步云梯栈道，两侧云雾不散、偶现虹桥。洞室天然形成穹顶，钟乳石间嵌有萤光灵矿，如星空倒映。炼丹房引瀑水为源，常年水气充盈，灵草自生于洞壁。登高处可以望见远方蜀山连绵，是修炼静心的绝佳去处。",
  },
  {
    stateId: "youzhou",
    stateName: "幽州",
    name: "朔宁洞府",
    risk: "medium",
    description: "坐落于朔宁城北面冻土高原的岩洞府邸，外壁以玄铁加固，门前常有寒风呼啸。室内铺设厚重毛皮与温火灵阵，寒气被隔绝在外。正厅陈列北地典籍与战甲残片，壁上挂着幽州猎人的弓矢与图腾。推开石窗可见旷野苍穹和偶尔南迁的灵鹤群。冬夜常有极光垂空，冷冽中自有苍莽豪气。",
  },
  {
    stateId: "liangzhou",
    stateName: "凉州",
    name: "砺关洞府",
    risk: "high",
    description: "凉州砺关城外的黄沙戈壁中一座半地下洞府，入口被风蚀岩石掩蔽，不易被寻。室内以坚石和灵铁构筑，阵法防风沙侵入。正堂低矮但宽阔，地面刻有镇荒古阵。窗口极小但足可望见远方沙暴与荒原落日，夜间满天繁星如烙。藏有前人留下的荒疆行记，适合修炼意志坚韧的修士。",
  },
  {
    stateId: "leizhou",
    stateName: "雷州",
    name: "惊霆洞府",
    risk: "high",
    description: "位于惊霆城外高原雷泽边的石塔洞府。塔身嵌有引雷灵铜导线，每逢雷暴天气，灵力潮涌可直接引入府内聚灵阵。室内常有微弱电弧闪烁于墙壁水晶中，空气中带着臭氧的清冽气息。阳台可俯瞰雷泽紫蓝色水面和远处闪电柱群，是修炼雷系功法或锤炼胆魄的上佳之所。",
  },
  {
    stateId: "cangzhou",
    stateName: "沧州",
    name: "沧澜洞府",
    risk: "medium",
    description: "建于沧澜城外海崖之上的临海洞府，三面朝海。石壁被海风与盐雾雕琢成奇异纹路，门前有一小片平台可供观潮。室内以贝木与灵珊瑚装饰，窗帘是渔网编织的透光纱幔。炼器室引潮汐之力辅助阵法运转。清晨可见日出海面、鲸影偶现，黄昏则潮声如鼓，是养性与磨练兼备的海疆道场。",
  },
  {
    stateId: "wanzhou",
    stateName: "宛州",
    name: "长和洞府",
    risk: "low",
    description: "坐落于长和城郊外丘陵花田中的庭院式洞府。白墙黛瓦，前院种满四季灵花，蜂蝶不绝。后院有小型温泉池和晒药场。室内以暖木和棉麻为主，陈设简洁温馨，书案上常摆着各地游记与商路地图。推门即是花田与远山，空气中混合着花香和泥土气。宛州多商客旅人，此处常有消息流通，适合安居与交游。",
  },
] as const;

const RESIDENCE_PRICE_BASE = 3000;

const RISK_PRICE_MULTIPLIER: Record<RiskLevel, number> = {
  safe: 1.0,
  low: 1.2,
  medium: 1.5,
  high: 2.0,
};

export function residenceRiskMultiplier(stateId: string): number {
  const entry = RESIDENCE_CATALOG.find((e) => e.stateId === stateId);
  if (!entry) return 1;
  return RISK_PRICE_MULTIPLIER[entry.risk];
}

export function residencePriceForState(stateId: string): number {
  return Math.round(RESIDENCE_PRICE_BASE * residenceRiskMultiplier(stateId));
}

export function getResidenceCatalogEntry(stateId: string): ResidenceCatalogEntry | null {
  return RESIDENCE_CATALOG.find((e) => e.stateId === stateId) ?? null;
}

export function hasResidenceInState(cultivator: Cultivator, stateId: string): boolean {
  return cultivator.residences.some((r) => r.stateId === stateId);
}

export function createResidenceForState(stateId: string, cultivatorId: string): Residence {
  const entry = getResidenceCatalogEntry(stateId);
  const locationId = `${stateId}:main-city` as LocationId;
  return {
    id: `residence-${cultivatorId}-${stateId}`,
    locationId,
    level: 1 as const,
    name: entry?.name ?? "洞府",
    stateId,
    description: entry?.description ?? "",
    grandeur: 1,
    origin: "bought",
    fixtures: [],
  };
}

// ---- Core residence checks ----

export function isAtResidence(cultivator: Cultivator): boolean {
  return cultivator.residences.some((r) => r.locationId === cultivator.locationId);
}

export function getActiveResidence(cultivator: Cultivator): Residence | null {
  return cultivator.residences.find((r) => r.locationId === cultivator.locationId) ?? null;
}

export function requireResidenceActionAllowed(
  cultivator: Cultivator,
  actionId: ResidenceActionId,
): void {
  if (!isAtResidence(cultivator)) {
    const names = cultivator.residences.map((r) => `"${r.name}" at ${r.locationId}`).join(", ");
    throw new Error(`Residence actions require being at one of your residences. Your residences: ${names}. You are currently at ${cultivator.locationId}.`);
  }
  if (actionId === "residence-meditate" && cultivator.injuryTicksRemaining > 0) {
    throw new Error("Injured cultivators cannot residence-meditate.");
  }
}

export function getResidenceRecipeById(recipeId: string): ProductionRecipe | null {
  return RESIDENCE_PRODUCTION_RECIPES.find((recipe) => recipe.id === recipeId) ?? null;
}

export function getFirstCraftableResidenceRecipe(cultivator: Cultivator): ProductionRecipe | null {
  return RESIDENCE_PRODUCTION_RECIPES.find((recipe) => recipe.enabledInLive && canCraftResidenceRecipe(cultivator, recipe)) ?? null;
}

export function getLiveCraftableRecipes(cultivator: Cultivator): ProductionRecipe[] {
  return RESIDENCE_PRODUCTION_RECIPES.filter(
    (recipe) => recipe.enabledInLive && canCraftResidenceRecipe(cultivator, recipe),
  );
}

export function canCraftResidenceRecipe(cultivator: Cultivator, recipe: ProductionRecipe): boolean {
  if (cultivator.spiritStones < recipe.spiritStoneCost) return false;
  return recipe.inputMaterials.every((material) => cultivator.inventory[material.itemId] >= material.count);
}

export function consumeResidenceRecipeInputs(cultivator: Cultivator, recipe: ProductionRecipe): void {
  for (const material of recipe.inputMaterials) {
    cultivator.inventory[material.itemId] -= material.count;
  }
  cultivator.spiritStones -= recipe.spiritStoneCost;
}

/**
 * Sect Task System
 *
 * Implements the four sect task types from the gameplay spec (Chapter 7):
 *   1. 资源上缴 (Resource Tribute)     — contribution: 10, safe, low-risk
 *   2. 宗门跑腿/联络 (Sect Liaison)    — contribution: 15, time/travel oriented
 *   3. 宗门专属游历 (Sect Expedition)   — contribution: 25, mid-risk exploration
 *   4. 巡查/镇压 (Patrol & Suppress)   — contribution: 40, high-risk combat
 *
 * Each type has 20 tasks: 10 for 外门 (outer) and 10 for 内门+ (inner/elite/elder).
 * Tasks are divided into 甲/乙/丙/丁 tiers:
 *   - 外门: 丙 (tier 3) and 丁 (tier 4) only
 *   - 内门+: 甲 (tier 1), 乙 (tier 2), 丙 (tier 3), 丁 (tier 4) all available
 */

import type { SectTitle } from "./model.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SectTaskCategory =
  | "resource-tribute"
  | "sect-liaison"
  | "sect-expedition"
  | "patrol-suppress";

export type SectTaskTier = "甲" | "乙" | "丙" | "丁";

export interface SectTaskTemplate {
  readonly id: string;
  readonly category: SectTaskCategory;
  readonly tier: SectTaskTier;
  readonly nameCn: string;
  readonly nameEn: string;
  readonly description: string;
  readonly minTitle: SectTitle;
  readonly durationTicks: number;
  readonly baseContribution: number;
  readonly baseSpiritStones: number;
  readonly baseReputation: number;
  readonly riskLevel: "none" | "low" | "medium" | "high";
}

// ---------------------------------------------------------------------------
// Title permission check
// ---------------------------------------------------------------------------

const TITLE_RANK: Record<SectTitle, number> = {
  "外门": 0,
  "内门": 1,
  "精英": 2,
  "长老": 3,
  "宗主": 4,
};

export function meetsTaskTitleRequirement(
  currentTitle: SectTitle | null,
  requiredTitle: SectTitle,
): boolean {
  if (!currentTitle) return false;
  return TITLE_RANK[currentTitle] >= TITLE_RANK[requiredTitle];
}

export function getAvailableTiers(title: SectTitle | null): readonly SectTaskTier[] {
  if (!title) return [];
  if (TITLE_RANK[title] >= TITLE_RANK["内门"]) return ["甲", "乙", "丙", "丁"];
  return ["丙", "丁"];
}

// ---------------------------------------------------------------------------
// Tier multipliers
// ---------------------------------------------------------------------------

const TIER_MULTIPLIER: Record<SectTaskTier, number> = {
  "丁": 1.0,
  "丙": 1.0,
  "乙": 1.5,
  "甲": 2.0,
};

export function tierMultiplier(tier: SectTaskTier): number {
  return TIER_MULTIPLIER[tier];
}

// ---------------------------------------------------------------------------
// Category base values (aligned with spec Chapter 7 Section 8.3)
// ---------------------------------------------------------------------------

const CATEGORY_BASE: Record<SectTaskCategory, {
  contribution: number;
  spiritStones: number;
  reputation: number;
  durationTicks: number;
}> = {
  "resource-tribute":  { contribution: 10, spiritStones: 40,  reputation: 2, durationTicks: 1 },
  "sect-liaison":      { contribution: 15, spiritStones: 60,  reputation: 3, durationTicks: 2 },
  "sect-expedition":   { contribution: 25, spiritStones: 100, reputation: 4, durationTicks: 3 },
  "patrol-suppress":   { contribution: 40, spiritStones: 160, reputation: 6, durationTicks: 3 },
};

export function getCategoryBase(category: SectTaskCategory) {
  return CATEGORY_BASE[category];
}

// ---------------------------------------------------------------------------
// Task Pool: 资源上缴 (Resource Tribute) — 20 tasks
// ---------------------------------------------------------------------------

const RESOURCE_TRIBUTE_TASKS: readonly SectTaskTemplate[] = [
  // 外门 (丙/丁) — 10 tasks
  { id: "rt-d-01", category: "resource-tribute", tier: "丁", nameCn: "上缴草药", nameEn: "Submit Herbs", description: "将日常采集的草药交付宗门库房。", minTitle: "外门", durationTicks: 1, baseContribution: 10, baseSpiritStones: 40, baseReputation: 2, riskLevel: "none" },
  { id: "rt-d-02", category: "resource-tribute", tier: "丁", nameCn: "缴纳灵矿碎片", nameEn: "Submit Ore Scraps", description: "将开采的灵矿碎片上交宗门炼器坊。", minTitle: "外门", durationTicks: 1, baseContribution: 10, baseSpiritStones: 40, baseReputation: 2, riskLevel: "none" },
  { id: "rt-d-03", category: "resource-tribute", tier: "丁", nameCn: "上缴兽皮", nameEn: "Submit Beast Hides", description: "将猎取的妖兽皮毛交付宗门。", minTitle: "外门", durationTicks: 1, baseContribution: 10, baseSpiritStones: 40, baseReputation: 2, riskLevel: "none" },
  { id: "rt-d-04", category: "resource-tribute", tier: "丁", nameCn: "捐赠低阶丹药", nameEn: "Donate Low-Grade Pills", description: "将自行炼制的低阶丹药捐入宗门库房。", minTitle: "外门", durationTicks: 1, baseContribution: 10, baseSpiritStones: 40, baseReputation: 2, riskLevel: "none" },
  { id: "rt-d-05", category: "resource-tribute", tier: "丁", nameCn: "缴纳日常杂务费", nameEn: "Submit Maintenance Fee", description: "按月缴纳宗门日常运转所需的灵石份额。", minTitle: "外门", durationTicks: 1, baseContribution: 10, baseSpiritStones: 35, baseReputation: 2, riskLevel: "none" },
  { id: "rt-c-01", category: "resource-tribute", tier: "丙", nameCn: "上缴中阶灵材", nameEn: "Submit Spirit Materials", description: "将品质较好的灵材统一上交宗门。", minTitle: "外门", durationTicks: 1, baseContribution: 10, baseSpiritStones: 45, baseReputation: 2, riskLevel: "none" },
  { id: "rt-c-02", category: "resource-tribute", tier: "丙", nameCn: "缴纳符纸原料", nameEn: "Submit Talisman Paper", description: "将采集的灵木制成的符纸交付藏经阁。", minTitle: "外门", durationTicks: 1, baseContribution: 10, baseSpiritStones: 45, baseReputation: 2, riskLevel: "none" },
  { id: "rt-c-03", category: "resource-tribute", tier: "丙", nameCn: "捐赠修复材料", nameEn: "Donate Repair Materials", description: "将宗门阵法维护所需的材料上交护阵长老。", minTitle: "外门", durationTicks: 1, baseContribution: 10, baseSpiritStones: 45, baseReputation: 2, riskLevel: "none" },
  { id: "rt-c-04", category: "resource-tribute", tier: "丙", nameCn: "上缴妖丹", nameEn: "Submit Demon Cores", description: "将斩获的妖丹交付宗门炼丹房。", minTitle: "外门", durationTicks: 1, baseContribution: 10, baseSpiritStones: 50, baseReputation: 2, riskLevel: "none" },
  { id: "rt-c-05", category: "resource-tribute", tier: "丙", nameCn: "缴纳灵田产出", nameEn: "Submit Farm Yield", description: "将灵田收获的灵谷统一交付宗门食堂。", minTitle: "外门", durationTicks: 1, baseContribution: 10, baseSpiritStones: 45, baseReputation: 2, riskLevel: "none" },
  // 内门+ (甲/乙) — 10 tasks
  { id: "rt-b-01", category: "resource-tribute", tier: "乙", nameCn: "上缴高阶灵药", nameEn: "Submit Rare Herbs", description: "将珍稀灵药交付宗门药库，供长老炼丹所用。", minTitle: "内门", durationTicks: 1, baseContribution: 15, baseSpiritStones: 60, baseReputation: 3, riskLevel: "none" },
  { id: "rt-b-02", category: "resource-tribute", tier: "乙", nameCn: "捐赠中品功法残页", nameEn: "Donate Technique Pages", description: "将游历中搜集的功法残页上交藏经阁。", minTitle: "内门", durationTicks: 1, baseContribution: 15, baseSpiritStones: 60, baseReputation: 3, riskLevel: "none" },
  { id: "rt-b-03", category: "resource-tribute", tier: "乙", nameCn: "上缴精炼矿石", nameEn: "Submit Refined Ore", description: "将提纯后的精炼矿石送入宗门炼器阁。", minTitle: "内门", durationTicks: 1, baseContribution: 15, baseSpiritStones: 60, baseReputation: 3, riskLevel: "none" },
  { id: "rt-b-04", category: "resource-tribute", tier: "乙", nameCn: "缴纳灵兽内丹", nameEn: "Submit Beast Inner Dan", description: "将高阶灵兽内丹交付宗门供研学之用。", minTitle: "内门", durationTicks: 1, baseContribution: 15, baseSpiritStones: 65, baseReputation: 3, riskLevel: "none" },
  { id: "rt-b-05", category: "resource-tribute", tier: "乙", nameCn: "捐赠阵图拓本", nameEn: "Donate Formation Rubbing", description: "将获取的阵法拓本上交宗门阵法堂。", minTitle: "内门", durationTicks: 1, baseContribution: 15, baseSpiritStones: 60, baseReputation: 3, riskLevel: "none" },
  { id: "rt-a-01", category: "resource-tribute", tier: "甲", nameCn: "上缴天材地宝", nameEn: "Submit Heavenly Treasure", description: "将在秘境中获得的天材地宝上交宗门，以充实宗门底蕴。", minTitle: "内门", durationTicks: 1, baseContribution: 20, baseSpiritStones: 80, baseReputation: 4, riskLevel: "none" },
  { id: "rt-a-02", category: "resource-tribute", tier: "甲", nameCn: "捐赠上品功法", nameEn: "Donate Advanced Technique", description: "将完整的上品功法卷轴献入藏经阁。", minTitle: "内门", durationTicks: 1, baseContribution: 20, baseSpiritStones: 80, baseReputation: 4, riskLevel: "none" },
  { id: "rt-a-03", category: "resource-tribute", tier: "甲", nameCn: "上缴灵脉调查报告", nameEn: "Submit Vein Report", description: "将对新发现灵脉的详细调查报告上交长老会。", minTitle: "内门", durationTicks: 1, baseContribution: 20, baseSpiritStones: 80, baseReputation: 4, riskLevel: "none" },
  { id: "rt-a-04", category: "resource-tribute", tier: "甲", nameCn: "缴纳远征战利品", nameEn: "Submit Expedition Spoils", description: "将远征八荒所获的珍稀战利品全数上交宗门。", minTitle: "内门", durationTicks: 1, baseContribution: 20, baseSpiritStones: 85, baseReputation: 4, riskLevel: "none" },
  { id: "rt-a-05", category: "resource-tribute", tier: "甲", nameCn: "捐赠古法遗卷", nameEn: "Donate Ancient Scroll", description: "将遗迹中发掘的古修遗卷献入藏经阁。", minTitle: "内门", durationTicks: 1, baseContribution: 20, baseSpiritStones: 80, baseReputation: 4, riskLevel: "none" },
];

// ---------------------------------------------------------------------------
// Task Pool: 宗门跑腿/联络 (Sect Liaison) — 20 tasks
// ---------------------------------------------------------------------------

const SECT_LIAISON_TASKS: readonly SectTaskTemplate[] = [
  // 外门 (丙/丁) — 10 tasks
  { id: "sl-d-01", category: "sect-liaison", tier: "丁", nameCn: "传递坊市信函", nameEn: "Deliver Market Letter", description: "将宗门信函送往附近坊市的合作商号。", minTitle: "外门", durationTicks: 2, baseContribution: 15, baseSpiritStones: 60, baseReputation: 3, riskLevel: "low" },
  { id: "sl-d-02", category: "sect-liaison", tier: "丁", nameCn: "接引新人报到", nameEn: "Guide New Arrivals", description: "在宗门山门处迎接新弟子并引导其熟悉驻地。", minTitle: "外门", durationTicks: 2, baseContribution: 15, baseSpiritStones: 55, baseReputation: 3, riskLevel: "low" },
  { id: "sl-d-03", category: "sect-liaison", tier: "丁", nameCn: "送药至外院", nameEn: "Deliver Medicine", description: "将炼丹房新炼的丹药送往外院各弟子驻所。", minTitle: "外门", durationTicks: 2, baseContribution: 15, baseSpiritStones: 55, baseReputation: 3, riskLevel: "low" },
  { id: "sl-d-04", category: "sect-liaison", tier: "丁", nameCn: "采买日用物资", nameEn: "Buy Daily Supplies", description: "前往附近集镇购置宗门日常消耗的凡俗物资。", minTitle: "外门", durationTicks: 2, baseContribution: 15, baseSpiritStones: 55, baseReputation: 3, riskLevel: "low" },
  { id: "sl-d-05", category: "sect-liaison", tier: "丁", nameCn: "登记外出弟子", nameEn: "Log Departing Disciples", description: "协助执事长老核实外出弟子信息并登记备案。", minTitle: "外门", durationTicks: 2, baseContribution: 15, baseSpiritStones: 50, baseReputation: 3, riskLevel: "low" },
  { id: "sl-c-01", category: "sect-liaison", tier: "丙", nameCn: "护送物资车队", nameEn: "Escort Supply Caravan", description: "随行保护宗门向友好势力运送物资的车队。", minTitle: "外门", durationTicks: 2, baseContribution: 15, baseSpiritStones: 65, baseReputation: 3, riskLevel: "low" },
  { id: "sl-c-02", category: "sect-liaison", tier: "丙", nameCn: "递送长老密函", nameEn: "Deliver Elder's Letter", description: "将长老的重要密函亲手送至指定修士手中。", minTitle: "外门", durationTicks: 2, baseContribution: 15, baseSpiritStones: 65, baseReputation: 3, riskLevel: "low" },
  { id: "sl-c-03", category: "sect-liaison", tier: "丙", nameCn: "联络友好散修", nameEn: "Contact Ally Rogue", description: "前往约定地点与宗门有来往的散修交换情报。", minTitle: "外门", durationTicks: 2, baseContribution: 15, baseSpiritStones: 65, baseReputation: 3, riskLevel: "low" },
  { id: "sl-c-04", category: "sect-liaison", tier: "丙", nameCn: "传达征召令", nameEn: "Deliver Summons", description: "将宗门征召令传达给驻外弟子，令其尽快回归。", minTitle: "外门", durationTicks: 2, baseContribution: 15, baseSpiritStones: 65, baseReputation: 3, riskLevel: "low" },
  { id: "sl-c-05", category: "sect-liaison", tier: "丙", nameCn: "巡视下属据点", nameEn: "Inspect Sub-Outpost", description: "代表宗门前往下属据点巡视日常运营情况。", minTitle: "外门", durationTicks: 2, baseContribution: 15, baseSpiritStones: 70, baseReputation: 3, riskLevel: "low" },
  // 内门+ (甲/乙) — 10 tasks
  { id: "sl-b-01", category: "sect-liaison", tier: "乙", nameCn: "出使友好宗门", nameEn: "Embassy to Ally Sect", description: "作为使者前往友好宗门，商讨合作事宜。", minTitle: "内门", durationTicks: 2, baseContribution: 22, baseSpiritStones: 90, baseReputation: 4, riskLevel: "low" },
  { id: "sl-b-02", category: "sect-liaison", tier: "乙", nameCn: "谈判灵脉分配", nameEn: "Negotiate Vein Rights", description: "与邻近势力就共享灵脉使用权展开谈判。", minTitle: "内门", durationTicks: 2, baseContribution: 22, baseSpiritStones: 90, baseReputation: 4, riskLevel: "low" },
  { id: "sl-b-03", category: "sect-liaison", tier: "乙", nameCn: "协调区域巡防", nameEn: "Coordinate Patrol", description: "与州内其他宗门协调巡防范围与职责分工。", minTitle: "内门", durationTicks: 2, baseContribution: 22, baseSpiritStones: 90, baseReputation: 4, riskLevel: "low" },
  { id: "sl-b-04", category: "sect-liaison", tier: "乙", nameCn: "收集区域情报", nameEn: "Gather Regional Intel", description: "深入周边地区收集势力动向和异变情报。", minTitle: "内门", durationTicks: 2, baseContribution: 22, baseSpiritStones: 90, baseReputation: 4, riskLevel: "low" },
  { id: "sl-b-05", category: "sect-liaison", tier: "乙", nameCn: "调解弟子纠纷", nameEn: "Mediate Dispute", description: "处理宗门内部弟子之间的资源或功法纠纷。", minTitle: "内门", durationTicks: 2, baseContribution: 22, baseSpiritStones: 85, baseReputation: 4, riskLevel: "low" },
  { id: "sl-a-01", category: "sect-liaison", tier: "甲", nameCn: "秘密外交斡旋", nameEn: "Secret Diplomacy", description: "以宗门密使身份前往敌对势力边界进行秘密斡旋。", minTitle: "内门", durationTicks: 2, baseContribution: 30, baseSpiritStones: 120, baseReputation: 6, riskLevel: "medium" },
  { id: "sl-a-02", category: "sect-liaison", tier: "甲", nameCn: "接引高阶散修", nameEn: "Recruit Senior Rogue", description: "受宗门委托前去接引一位高阶散修，争取其加入宗门。", minTitle: "内门", durationTicks: 2, baseContribution: 30, baseSpiritStones: 120, baseReputation: 6, riskLevel: "medium" },
  { id: "sl-a-03", category: "sect-liaison", tier: "甲", nameCn: "交涉州府事务", nameEn: "Negotiate with Prefecture", description: "代表宗门与州府官方就地域管辖事务进行正式交涉。", minTitle: "内门", durationTicks: 2, baseContribution: 30, baseSpiritStones: 120, baseReputation: 6, riskLevel: "medium" },
  { id: "sl-a-04", category: "sect-liaison", tier: "甲", nameCn: "护送贵客", nameEn: "Escort VIP Guest", description: "全程护送一位重要来宾安全抵达宗门驻地。", minTitle: "内门", durationTicks: 2, baseContribution: 30, baseSpiritStones: 120, baseReputation: 6, riskLevel: "medium" },
  { id: "sl-a-05", category: "sect-liaison", tier: "甲", nameCn: "传递掌门手令", nameEn: "Deliver Sect Master Order", description: "携带掌门亲笔手令前往远方据点传达紧急指令。", minTitle: "内门", durationTicks: 2, baseContribution: 30, baseSpiritStones: 120, baseReputation: 6, riskLevel: "medium" },
];

// ---------------------------------------------------------------------------
// Task Pool: 宗门专属游历 (Sect Expedition) — 20 tasks
// ---------------------------------------------------------------------------

const SECT_EXPEDITION_TASKS: readonly SectTaskTemplate[] = [
  // 外门 (丙/丁) — 10 tasks
  { id: "se-d-01", category: "sect-expedition", tier: "丁", nameCn: "巡山采药", nameEn: "Mountain Herb Gathering", description: "按宗门指定路线巡视后山，沿途采集药草。", minTitle: "外门", durationTicks: 3, baseContribution: 25, baseSpiritStones: 100, baseReputation: 4, riskLevel: "medium" },
  { id: "se-d-02", category: "sect-expedition", tier: "丁", nameCn: "探查灵田边界", nameEn: "Survey Farm Border", description: "沿宗门灵田边界巡行，检查是否有妖兽入侵痕迹。", minTitle: "外门", durationTicks: 3, baseContribution: 25, baseSpiritStones: 95, baseReputation: 4, riskLevel: "medium" },
  { id: "se-d-03", category: "sect-expedition", tier: "丁", nameCn: "勘探溪谷水脉", nameEn: "Explore Valley Stream", description: "深入宗门领地附近溪谷，勘探地下水脉走向。", minTitle: "外门", durationTicks: 3, baseContribution: 25, baseSpiritStones: 95, baseReputation: 4, riskLevel: "medium" },
  { id: "se-d-04", category: "sect-expedition", tier: "丁", nameCn: "绘制周边地形", nameEn: "Map Local Terrain", description: "携带罗盘出行，为宗门绘制更新版的周边地势图。", minTitle: "外门", durationTicks: 3, baseContribution: 25, baseSpiritStones: 95, baseReputation: 4, riskLevel: "medium" },
  { id: "se-d-05", category: "sect-expedition", tier: "丁", nameCn: "追踪低阶妖兽", nameEn: "Track Minor Beast", description: "追踪近来骚扰灵田的低阶妖兽的踪迹。", minTitle: "外门", durationTicks: 3, baseContribution: 25, baseSpiritStones: 100, baseReputation: 4, riskLevel: "medium" },
  { id: "se-c-01", category: "sect-expedition", tier: "丙", nameCn: "探索废弃矿洞", nameEn: "Explore Abandoned Mine", description: "进入宗门领地内的废弃矿洞，检查残留灵矿储量。", minTitle: "外门", durationTicks: 3, baseContribution: 25, baseSpiritStones: 110, baseReputation: 4, riskLevel: "medium" },
  { id: "se-c-02", category: "sect-expedition", tier: "丙", nameCn: "调查异动灵脉", nameEn: "Investigate Vein Anomaly", description: "宗门灵脉近日波动异常，前去实地调查原因。", minTitle: "外门", durationTicks: 3, baseContribution: 25, baseSpiritStones: 110, baseReputation: 4, riskLevel: "medium" },
  { id: "se-c-03", category: "sect-expedition", tier: "丙", nameCn: "搜索遗失法器", nameEn: "Search for Lost Artifact", description: "一位外出弟子遗失传讯法器，前往其最后位置搜索。", minTitle: "外门", durationTicks: 3, baseContribution: 25, baseSpiritStones: 110, baseReputation: 4, riskLevel: "medium" },
  { id: "se-c-04", category: "sect-expedition", tier: "丙", nameCn: "勘察阵法节点", nameEn: "Inspect Formation Node", description: "前往宗门护山大阵的外围节点逐一检查激活状态。", minTitle: "外门", durationTicks: 3, baseContribution: 25, baseSpiritStones: 110, baseReputation: 4, riskLevel: "medium" },
  { id: "se-c-05", category: "sect-expedition", tier: "丙", nameCn: "收集野生灵种", nameEn: "Collect Wild Seeds", description: "深入山林收集可用于灵田培育的野生灵种。", minTitle: "外门", durationTicks: 3, baseContribution: 25, baseSpiritStones: 105, baseReputation: 4, riskLevel: "medium" },
  // 内门+ (甲/乙) — 10 tasks
  { id: "se-b-01", category: "sect-expedition", tier: "乙", nameCn: "深入秘境前哨", nameEn: "Advance into Secret Realm", description: "代表宗门深入新发现的秘境前哨，探明内部环境。", minTitle: "内门", durationTicks: 3, baseContribution: 37, baseSpiritStones: 150, baseReputation: 6, riskLevel: "medium" },
  { id: "se-b-02", category: "sect-expedition", tier: "乙", nameCn: "寻访上古遗址", nameEn: "Seek Ancient Ruins", description: "根据藏经阁线索，前往疑似上古修士遗址进行初步考察。", minTitle: "内门", durationTicks: 3, baseContribution: 37, baseSpiritStones: 150, baseReputation: 6, riskLevel: "medium" },
  { id: "se-b-03", category: "sect-expedition", tier: "乙", nameCn: "勘探远方灵脉", nameEn: "Survey Distant Vein", description: "前往州界附近探查一条据报存在的未标记灵脉。", minTitle: "内门", durationTicks: 3, baseContribution: 37, baseSpiritStones: 150, baseReputation: 6, riskLevel: "medium" },
  { id: "se-b-04", category: "sect-expedition", tier: "乙", nameCn: "追查失踪弟子", nameEn: "Track Missing Disciple", description: "一名内门弟子数日未归，沿其游历路线追踪调查。", minTitle: "内门", durationTicks: 3, baseContribution: 37, baseSpiritStones: 150, baseReputation: 6, riskLevel: "medium" },
  { id: "se-b-05", category: "sect-expedition", tier: "乙", nameCn: "标定新矿点", nameEn: "Mark New Mining Spot", description: "将勘探发现的新矿点进行详细标定并设置标识。", minTitle: "内门", durationTicks: 3, baseContribution: 37, baseSpiritStones: 150, baseReputation: 6, riskLevel: "medium" },
  { id: "se-a-01", category: "sect-expedition", tier: "甲", nameCn: "探索八荒边境", nameEn: "Explore Eight-Wastes Border", description: "受命前往八荒凶地边界区域，收集环境数据供宗门研判。", minTitle: "内门", durationTicks: 3, baseContribution: 50, baseSpiritStones: 200, baseReputation: 8, riskLevel: "high" },
  { id: "se-a-02", category: "sect-expedition", tier: "甲", nameCn: "潜入敌方领地", nameEn: "Infiltrate Rival Territory", description: "秘密潜入敌对势力领地，绘制其防御布局图。", minTitle: "内门", durationTicks: 3, baseContribution: 50, baseSpiritStones: 200, baseReputation: 8, riskLevel: "high" },
  { id: "se-a-03", category: "sect-expedition", tier: "甲", nameCn: "调查天灾异变", nameEn: "Investigate Calamity", description: "州内出现异常天象，受命前往异变核心区域调查成因。", minTitle: "内门", durationTicks: 3, baseContribution: 50, baseSpiritStones: 200, baseReputation: 8, riskLevel: "high" },
  { id: "se-a-04", category: "sect-expedition", tier: "甲", nameCn: "开辟新游历路线", nameEn: "Pioneer New Expedition Route", description: "为宗门开辟一条前往偏远资源产地的安全游历路线。", minTitle: "内门", durationTicks: 3, baseContribution: 50, baseSpiritStones: 200, baseReputation: 8, riskLevel: "high" },
  { id: "se-a-05", category: "sect-expedition", tier: "甲", nameCn: "考察归墟入口", nameEn: "Survey Guixu Gateway", description: "前往归墟天境入口附近，替宗门评估进军可行性。", minTitle: "内门", durationTicks: 3, baseContribution: 50, baseSpiritStones: 200, baseReputation: 8, riskLevel: "high" },
];

// ---------------------------------------------------------------------------
// Task Pool: 巡查/镇压 (Patrol & Suppress) — 20 tasks
// ---------------------------------------------------------------------------

const PATROL_SUPPRESS_TASKS: readonly SectTaskTemplate[] = [
  // 外门 (丙/丁) — 10 tasks
  { id: "ps-d-01", category: "patrol-suppress", tier: "丁", nameCn: "驻地外围巡逻", nameEn: "Outpost Perimeter Patrol", description: "沿宗门驻地外围进行常规巡逻，警戒可疑迹象。", minTitle: "外门", durationTicks: 3, baseContribution: 40, baseSpiritStones: 160, baseReputation: 6, riskLevel: "medium" },
  { id: "ps-d-02", category: "patrol-suppress", tier: "丁", nameCn: "驱散低阶妖兽", nameEn: "Repel Minor Beasts", description: "将靠近灵田的低阶妖兽驱散至安全距离外。", minTitle: "外门", durationTicks: 3, baseContribution: 40, baseSpiritStones: 160, baseReputation: 6, riskLevel: "medium" },
  { id: "ps-d-03", category: "patrol-suppress", tier: "丁", nameCn: "值守山门", nameEn: "Guard Sect Gate", description: "在宗门山门处值守一日，盘查来往人员。", minTitle: "外门", durationTicks: 3, baseContribution: 40, baseSpiritStones: 150, baseReputation: 6, riskLevel: "medium" },
  { id: "ps-d-04", category: "patrol-suppress", tier: "丁", nameCn: "清剿鼠患", nameEn: "Clear Vermin", description: "清剿盘踞在宗门仓库附近的低阶灵鼠群。", minTitle: "外门", durationTicks: 3, baseContribution: 40, baseSpiritStones: 155, baseReputation: 6, riskLevel: "medium" },
  { id: "ps-d-05", category: "patrol-suppress", tier: "丁", nameCn: "巡视灵田阵法", nameEn: "Check Farm Wards", description: "绕灵田一圈检查护田阵法是否正常运转。", minTitle: "外门", durationTicks: 3, baseContribution: 40, baseSpiritStones: 155, baseReputation: 6, riskLevel: "medium" },
  { id: "ps-c-01", category: "patrol-suppress", tier: "丙", nameCn: "清除路障妖兽", nameEn: "Clear Road Beasts", description: "清除阻断宗门补给道路的中阶妖兽。", minTitle: "外门", durationTicks: 3, baseContribution: 40, baseSpiritStones: 170, baseReputation: 6, riskLevel: "high" },
  { id: "ps-c-02", category: "patrol-suppress", tier: "丙", nameCn: "镇压盗匪流窜", nameEn: "Suppress Bandits", description: "前往附近山头镇压一伙骚扰凡人村落的散修盗匪。", minTitle: "外门", durationTicks: 3, baseContribution: 40, baseSpiritStones: 170, baseReputation: 6, riskLevel: "high" },
  { id: "ps-c-03", category: "patrol-suppress", tier: "丙", nameCn: "夜间驻地巡查", nameEn: "Night Patrol", description: "在深夜巡查宗门驻地周围，防范敌对势力夜袭。", minTitle: "外门", durationTicks: 3, baseContribution: 40, baseSpiritStones: 170, baseReputation: 6, riskLevel: "high" },
  { id: "ps-c-04", category: "patrol-suppress", tier: "丙", nameCn: "协助捉拿逃犯", nameEn: "Assist Fugitive Capture", description: "与州府联合行动，协助捉拿一名被通缉的散修。", minTitle: "外门", durationTicks: 3, baseContribution: 40, baseSpiritStones: 175, baseReputation: 6, riskLevel: "high" },
  { id: "ps-c-05", category: "patrol-suppress", tier: "丙", nameCn: "巡查矿洞安全", nameEn: "Mine Safety Patrol", description: "前往宗门矿洞检查矿道安全并清除新生妖虫。", minTitle: "外门", durationTicks: 3, baseContribution: 40, baseSpiritStones: 170, baseReputation: 6, riskLevel: "high" },
  // 内门+ (甲/乙) — 10 tasks
  { id: "ps-b-01", category: "patrol-suppress", tier: "乙", nameCn: "讨伐中阶妖兽", nameEn: "Hunt Mid-Tier Beast", description: "率队前往深山讨伐一头危害宗门安全的中阶妖兽。", minTitle: "内门", durationTicks: 3, baseContribution: 60, baseSpiritStones: 240, baseReputation: 8, riskLevel: "high" },
  { id: "ps-b-02", category: "patrol-suppress", tier: "乙", nameCn: "镇压邪修窝点", nameEn: "Suppress Rogue Cult", description: "根据情报突袭一个在州内暗中活动的邪修据点。", minTitle: "内门", durationTicks: 3, baseContribution: 60, baseSpiritStones: 240, baseReputation: 8, riskLevel: "high" },
  { id: "ps-b-03", category: "patrol-suppress", tier: "乙", nameCn: "护卫灵脉开采", nameEn: "Guard Vein Mining", description: "在灵脉开采期间驻守现场，防止外部势力袭扰。", minTitle: "内门", durationTicks: 3, baseContribution: 60, baseSpiritStones: 240, baseReputation: 8, riskLevel: "high" },
  { id: "ps-b-04", category: "patrol-suppress", tier: "乙", nameCn: "执行追缉令", nameEn: "Execute Bounty Order", description: "追捕一名背叛宗门的叛逃弟子。", minTitle: "内门", durationTicks: 3, baseContribution: 60, baseSpiritStones: 240, baseReputation: 8, riskLevel: "high" },
  { id: "ps-b-05", category: "patrol-suppress", tier: "乙", nameCn: "清扫秘境入口", nameEn: "Clear Realm Gateway", description: "在秘境开启前清扫入口附近的妖兽群，确保弟子安全进入。", minTitle: "内门", durationTicks: 3, baseContribution: 60, baseSpiritStones: 240, baseReputation: 8, riskLevel: "high" },
  { id: "ps-a-01", category: "patrol-suppress", tier: "甲", nameCn: "讨伐高阶妖王", nameEn: "Slay Greater Beast Lord", description: "率精英小队前去讨伐盘踞深山的高阶妖王。", minTitle: "内门", durationTicks: 3, baseContribution: 80, baseSpiritStones: 320, baseReputation: 10, riskLevel: "high" },
  { id: "ps-a-02", category: "patrol-suppress", tier: "甲", nameCn: "平定区域叛乱", nameEn: "Quell Regional Uprising", description: "代表宗门出面平定一场由邪修煽动的区域叛乱。", minTitle: "内门", durationTicks: 3, baseContribution: 80, baseSpiritStones: 320, baseReputation: 10, riskLevel: "high" },
  { id: "ps-a-03", category: "patrol-suppress", tier: "甲", nameCn: "拦截敌宗突袭", nameEn: "Intercept Rival Raid", description: "紧急出动拦截一支敌对宗门派出的突袭小队。", minTitle: "内门", durationTicks: 3, baseContribution: 80, baseSpiritStones: 320, baseReputation: 10, riskLevel: "high" },
  { id: "ps-a-04", category: "patrol-suppress", tier: "甲", nameCn: "清剿妖潮前线", nameEn: "Frontline Beast Tide", description: "在妖潮来袭时于前线长时间坚守并逐步清剿妖群。", minTitle: "内门", durationTicks: 3, baseContribution: 80, baseSpiritStones: 320, baseReputation: 10, riskLevel: "high" },
  { id: "ps-a-05", category: "patrol-suppress", tier: "甲", nameCn: "镇守州界要塞", nameEn: "Garrison Border Fortress", description: "在州界要塞驻守，抵御来自八荒方向的妖兽侵袭。", minTitle: "内门", durationTicks: 3, baseContribution: 80, baseSpiritStones: 320, baseReputation: 10, riskLevel: "high" },
];

// ---------------------------------------------------------------------------
// Combined registry
// ---------------------------------------------------------------------------

export const ALL_SECT_TASKS: readonly SectTaskTemplate[] = [
  ...RESOURCE_TRIBUTE_TASKS,
  ...SECT_LIAISON_TASKS,
  ...SECT_EXPEDITION_TASKS,
  ...PATROL_SUPPRESS_TASKS,
];

const TASK_BY_ID = new Map<string, SectTaskTemplate>(
  ALL_SECT_TASKS.map((t) => [t.id, t]),
);

export function getSectTaskById(id: string): SectTaskTemplate | undefined {
  return TASK_BY_ID.get(id);
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export function getTasksByCategory(category: SectTaskCategory): readonly SectTaskTemplate[] {
  return ALL_SECT_TASKS.filter((t) => t.category === category);
}

export function getAvailableTasksForTitle(
  title: SectTitle | null,
  category?: SectTaskCategory,
): readonly SectTaskTemplate[] {
  if (!title) return [];
  const tiers = new Set(getAvailableTiers(title));
  return ALL_SECT_TASKS.filter(
    (t) => tiers.has(t.tier) && meetsTaskTitleRequirement(title, t.minTitle) && (!category || t.category === category),
  );
}

// ---------------------------------------------------------------------------
// Random task selection (deterministic based on seed)
// ---------------------------------------------------------------------------

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function pickRandomSectTask(
  title: SectTitle | null,
  category: SectTaskCategory,
  seed: string,
): SectTaskTemplate | null {
  const available = getAvailableTasksForTitle(title, category);
  if (available.length === 0) return null;
  const index = simpleHash(seed) % available.length;
  return available[index]!;
}

export function pickWeightedSectTask(
  title: SectTitle | null,
  seed: string,
): SectTaskTemplate | null {
  const available = getAvailableTasksForTitle(title);
  if (available.length === 0) return null;
  const index = simpleHash(seed) % available.length;
  return available[index]!;
}

// ---------------------------------------------------------------------------
// Reward calculation (applies tier multiplier + sect level bonus)
// ---------------------------------------------------------------------------

export interface SectTaskReward {
  readonly contribution: number;
  readonly spiritStones: number;
  readonly reputation: number;
}

export function calculateTaskReward(
  template: SectTaskTemplate,
  sectResourceBonus: number,
): SectTaskReward {
  const mult = tierMultiplier(template.tier);
  return {
    contribution: Math.floor(template.baseContribution * mult) + Math.floor(sectResourceBonus / 2),
    spiritStones: Math.floor(template.baseSpiritStones * mult) + (sectResourceBonus * 5),
    reputation: Math.floor(template.baseReputation * mult) + Math.floor(sectResourceBonus / 3),
  };
}

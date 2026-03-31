import type { BaseNodeType, NamedSettlementNodeType, RiskLevel } from "./constants.js";

export interface GeographyNeutralSectDefinition {
  id: string;
  name: string;
  description: string;
  rewardMultiplier: number;
}

export interface GeographyLocationDefinition {
  nodeType: BaseNodeType;
  name?: string;
}

export interface GeographyStateDefinition {
  name: string;
  risk: RiskLevel;
  starter?: boolean;
  neutralSect: GeographyNeutralSectDefinition;
  locations: readonly GeographyLocationDefinition[];
  crossStateConnections: readonly {
    to: string;
    ticks: number;
  }[];
}

export type GeographyRegistryDefinition = Record<string, GeographyStateDefinition>;
export type GeographyRegistryOverrides = Partial<GeographyRegistryDefinition>;

const REQUIRED_BASE_NODE_TYPES = [
  "main-city",
  "sub-town-east",
  "sub-town-west",
  "sub-town-south",
  "wilderness",
  "dungeon-c",
  "dungeon-b",
  "dungeon-a",
] as const satisfies readonly BaseNodeType[];

function createBaseLocations(
  names: Record<NamedSettlementNodeType, string>,
): readonly GeographyLocationDefinition[] {
  return [
    { nodeType: "main-city", name: names["main-city"] },
    { nodeType: "sub-town-east", name: names["sub-town-east"] },
    { nodeType: "sub-town-west", name: names["sub-town-west"] },
    { nodeType: "sub-town-south", name: names["sub-town-south"] },
    { nodeType: "wilderness" },
    { nodeType: "dungeon-c" },
    { nodeType: "dungeon-b" },
    { nodeType: "dungeon-a" },
  ] as const;
}

function defineState(definition: GeographyStateDefinition): GeographyStateDefinition {
  return definition;
}

export const GEOGRAPHY_REGISTRY = {
  qingzhou: defineState({
    name: "青州",
    risk: "safe",
    starter: true,
    neutralSect: {
      id: "cang-mu-gu",
      name: "苍木谷",
      description: "青州的中立门派，以草木养气与稳修闻名。",
      rewardMultiplier: 0.7,
    },
    locations: createBaseLocations({
      "main-city": "青岚城",
      "sub-town-east": "百草镇",
      "sub-town-west": "石桥镇",
      "sub-town-south": "安禾镇",
    }),
    crossStateConnections: [
      { to: "yangzhou", ticks: 4 },
      { to: "zhongzhou", ticks: 5 },
      { to: "youzhou", ticks: 6 },
    ],
  }),
  yangzhou: defineState({
    name: "扬州",
    risk: "low",
    starter: true,
    neutralSect: {
      id: "ting-chao-ge",
      name: "听潮阁",
      description: "扬州沿海的中立门派，擅长稳健经营与水路调度。",
      rewardMultiplier: 0.7,
    },
    locations: createBaseLocations({
      "main-city": "广津城",
      "sub-town-east": "临波镇",
      "sub-town-west": "平码镇",
      "sub-town-south": "渡柳镇",
    }),
    crossStateConnections: [
      { to: "qingzhou", ticks: 4 },
      { to: "zhongzhou", ticks: 4 },
      { to: "wanzhou", ticks: 5 },
    ],
  }),
  zhongzhou: defineState({
    name: "中州",
    risk: "medium",
    neutralSect: {
      id: "tian-heng-zong",
      name: "天衡宗",
      description: "中州最大的中立门派，守衡九州来往。",
      rewardMultiplier: 0.7,
    },
    locations: createBaseLocations({
      "main-city": "天衡城",
      "sub-town-east": "承令镇",
      "sub-town-west": "会商镇",
      "sub-town-south": "靖平镇",
    }),
    crossStateConnections: [
      { to: "qingzhou", ticks: 5 },
      { to: "yangzhou", ticks: 4 },
      { to: "shuzhou", ticks: 5 },
      { to: "youzhou", ticks: 5 },
      { to: "cangzhou", ticks: 6 },
    ],
  }),
  shuzhou: defineState({
    name: "蜀州",
    risk: "medium",
    neutralSect: {
      id: "po-yun-men",
      name: "破云门",
      description: "蜀州的中立门派，山门险峻而行事沉稳。",
      rewardMultiplier: 0.7,
    },
    locations: createBaseLocations({
      "main-city": "栖云城",
      "sub-town-east": "药溪镇",
      "sub-town-west": "栈云镇",
      "sub-town-south": "青木镇",
    }),
    crossStateConnections: [
      { to: "zhongzhou", ticks: 5 },
      { to: "liangzhou", ticks: 5 },
      { to: "wanzhou", ticks: 4 },
    ],
  }),
  youzhou: defineState({
    name: "幽州",
    risk: "medium",
    neutralSect: {
      id: "shuo-ming-dian",
      name: "朔冥殿",
      description: "幽州的中立门派，长于寒域巡守与藏典。",
      rewardMultiplier: 0.7,
    },
    locations: createBaseLocations({
      "main-city": "朔宁城",
      "sub-town-east": "猎霜镇",
      "sub-town-west": "寒渡镇",
      "sub-town-south": "靖边镇",
    }),
    crossStateConnections: [
      { to: "qingzhou", ticks: 6 },
      { to: "zhongzhou", ticks: 5 },
      { to: "cangzhou", ticks: 4 },
      { to: "leizhou", ticks: 6 },
    ],
  }),
  liangzhou: defineState({
    name: "凉州",
    risk: "high",
    neutralSect: {
      id: "zhen-huang-cheng",
      name: "镇荒城",
      description: "凉州的中立门派，负责镇守荒疆要道。",
      rewardMultiplier: 0.7,
    },
    locations: createBaseLocations({
      "main-city": "砺关城",
      "sub-town-east": "砂门镇",
      "sub-town-west": "玄矿镇",
      "sub-town-south": "驿关镇",
    }),
    crossStateConnections: [
      { to: "shuzhou", ticks: 5 },
      { to: "leizhou", ticks: 5 },
    ],
  }),
  leizhou: defineState({
    name: "雷州",
    risk: "high",
    neutralSect: {
      id: "jing-xiao-gong",
      name: "惊霄宫",
      description: "雷州的中立门派，以守御与雷域巡查闻名。",
      rewardMultiplier: 0.7,
    },
    locations: createBaseLocations({
      "main-city": "惊霆城",
      "sub-town-east": "听霆镇",
      "sub-town-west": "焦林镇",
      "sub-town-south": "息雷镇",
    }),
    crossStateConnections: [
      { to: "youzhou", ticks: 6 },
      { to: "liangzhou", ticks: 5 },
      { to: "cangzhou", ticks: 5 },
    ],
  }),
  cangzhou: defineState({
    name: "沧州",
    risk: "medium",
    neutralSect: {
      id: "han-hai-bao",
      name: "撼海堡",
      description: "沧州的中立门派，久镇海疆与港埠。",
      rewardMultiplier: 0.7,
    },
    locations: createBaseLocations({
      "main-city": "沧澜城",
      "sub-town-east": "归帆镇",
      "sub-town-west": "碑汀镇",
      "sub-town-south": "潮平镇",
    }),
    crossStateConnections: [
      { to: "zhongzhou", ticks: 6 },
      { to: "youzhou", ticks: 4 },
      { to: "leizhou", ticks: 5 },
    ],
  }),
  wanzhou: defineState({
    name: "宛州",
    risk: "low",
    starter: true,
    neutralSect: {
      id: "wan-xiang-lou",
      name: "万象楼",
      description: "宛州的中立门派，以商路与杂学见长。",
      rewardMultiplier: 0.7,
    },
    locations: createBaseLocations({
      "main-city": "长和城",
      "sub-town-east": "长柳镇",
      "sub-town-west": "茶桥镇",
      "sub-town-south": "归信镇",
    }),
    crossStateConnections: [
      { to: "yangzhou", ticks: 5 },
      { to: "shuzhou", ticks: 4 },
    ],
  }),
} as const satisfies GeographyRegistryDefinition;

export function createGeographyRegistryForTest<const T extends GeographyRegistryOverrides>(
  overrides: T,
) {
  return {
    ...GEOGRAPHY_REGISTRY,
    ...overrides,
  } as typeof GEOGRAPHY_REGISTRY & T;
}

export function resolveGeographyRegistry(
  overrides?: GeographyRegistryOverrides,
): GeographyRegistryDefinition {
  if (!overrides || Object.keys(overrides).length === 0) {
    return GEOGRAPHY_REGISTRY;
  }

  return {
    ...GEOGRAPHY_REGISTRY,
    ...overrides,
  };
}

export function getGeographyStateIds(registry: GeographyRegistryDefinition): string[] {
  return Object.keys(registry);
}

export function getStarterStates(registry: GeographyRegistryDefinition): string[] {
  return getGeographyStateIds(registry).filter((stateId) => registry[stateId]?.starter);
}

export function getStateMetaMap(registry: GeographyRegistryDefinition) {
  return Object.fromEntries(
    getGeographyStateIds(registry).map((stateId) => [
      stateId,
      {
        name: registry[stateId]!.name,
        risk: registry[stateId]!.risk,
      },
    ]),
  );
}

export function getSettlementDisplayNames(registry: GeographyRegistryDefinition) {
  return Object.fromEntries(
    getGeographyStateIds(registry).map((stateId) => [
      stateId,
      Object.fromEntries(
        registry[stateId]!.locations
          .filter(
            (
              location,
            ): location is GeographyLocationDefinition & {
              nodeType: NamedSettlementNodeType;
              name: string;
            } =>
              location.nodeType === "main-city"
              || location.nodeType === "sub-town-east"
              || location.nodeType === "sub-town-west"
              || location.nodeType === "sub-town-south",
          )
          .map((location) => [location.nodeType, location.name]),
      ),
    ]),
  );
}

export function getNeutralSectsByState(registry: GeographyRegistryDefinition) {
  return Object.fromEntries(
    getGeographyStateIds(registry).map((stateId) => [stateId, registry[stateId]!.neutralSect]),
  );
}

export function getCrossStateEdges(registry: GeographyRegistryDefinition) {
  const deduped = new Map<string, readonly [string, string, number]>();

  for (const stateId of getGeographyStateIds(registry)) {
    for (const edge of registry[stateId]!.crossStateConnections) {
      const key = [stateId, edge.to].sort().join("|");
      if (!deduped.has(key)) {
        deduped.set(key, [stateId, edge.to, edge.ticks] as const);
      }
    }
  }

  return Array.from(deduped.values());
}

export function validateGeographyRegistry(registry: GeographyRegistryDefinition): void {
  for (const stateId of getGeographyStateIds(registry)) {
    const definition = registry[stateId]!;

    if (definition.crossStateConnections.length === 0) {
      throw new Error(`Geography registry state "${stateId}" is disconnected: add a cross-state edge.`);
    }

    const seenNodeTypes = new Set(definition.locations.map((location) => location.nodeType));
    for (const nodeType of REQUIRED_BASE_NODE_TYPES) {
      if (!seenNodeTypes.has(nodeType)) {
        throw new Error(`Geography registry state "${stateId}" is missing base location "${nodeType}".`);
      }
    }

    for (const location of definition.locations) {
      if (
        (location.nodeType === "main-city"
          || location.nodeType === "sub-town-east"
          || location.nodeType === "sub-town-west"
          || location.nodeType === "sub-town-south")
        && !location.name
      ) {
        throw new Error(`Geography registry state "${stateId}" is missing a settlement name for "${location.nodeType}".`);
      }
    }

    for (const edge of definition.crossStateConnections) {
      if (!registry[edge.to]) {
        throw new Error(`Geography registry state "${stateId}" references unknown neighbor "${edge.to}".`);
      }
      if (edge.to === stateId) {
        throw new Error(`Geography registry state "${stateId}" cannot connect to itself.`);
      }
      if (!Number.isFinite(edge.ticks) || edge.ticks <= 0) {
        throw new Error(`Geography registry state "${stateId}" has invalid travel ticks for "${edge.to}".`);
      }
    }
  }
}

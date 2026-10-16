/**
 * Schematic 九州 positions for the public watch map.
 * These are ink-scroll slots, not geographic measurements.
 * A place id such as `qingzhou:main-city` or `qingzhou:sect-outpost:cang-mu-gu`
 * lands on its state, then nudges by node type so towns do not sit on the capital.
 */

export const MAP_VIEW = { width: 120, height: 86 } as const;

export interface JiuzhouRegion {
  id: string;
  name: string;
  capital: string;
  x: number;
  y: number;
}

export const JIUZHOU_REGIONS: readonly JiuzhouRegion[] = [
  { id: "youzhou", name: "幽州", capital: "朔宁城", x: 34, y: 18 },
  { id: "qingzhou", name: "青州", capital: "青岚城", x: 70, y: 16 },
  { id: "liangzhou", name: "凉州", capital: "砺关城", x: 16, y: 42 },
  { id: "shuzhou", name: "蜀州", capital: "栖云城", x: 42, y: 40 },
  { id: "zhongzhou", name: "中州", capital: "天衡城", x: 68, y: 40 },
  { id: "yangzhou", name: "扬州", capital: "广津城", x: 98, y: 34 },
  { id: "wanzhou", name: "宛州", capital: "长和城", x: 46, y: 66 },
  { id: "cangzhou", name: "沧州", capital: "沧澜城", x: 74, y: 64 },
  { id: "leizhou", name: "雷州", capital: "惊霆城", x: 102, y: 60 },
];

export const JIUZHOU_ROADS: readonly (readonly [string, string])[] = [
  ["qingzhou", "yangzhou"],
  ["qingzhou", "zhongzhou"],
  ["qingzhou", "youzhou"],
  ["yangzhou", "zhongzhou"],
  ["yangzhou", "wanzhou"],
  ["zhongzhou", "shuzhou"],
  ["zhongzhou", "youzhou"],
  ["zhongzhou", "cangzhou"],
  ["shuzhou", "liangzhou"],
  ["shuzhou", "wanzhou"],
  ["youzhou", "cangzhou"],
  ["youzhou", "leizhou"],
  ["liangzhou", "leizhou"],
  ["leizhou", "cangzhou"],
];

const NODE_OFFSETS: Record<string, { dx: number; dy: number }> = {
  "main-city": { dx: 0, dy: 0 },
  "sub-town-east": { dx: 4.4, dy: 1.3 },
  "sub-town-west": { dx: -4.4, dy: 1.5 },
  "sub-town-south": { dx: 0.8, dy: 4.4 },
  wilderness: { dx: -2.8, dy: -3.4 },
  "dungeon-c": { dx: 3.1, dy: -3.2 },
  "dungeon-b": { dx: -3.3, dy: 3.5 },
  "dungeon-a": { dx: 3.6, dy: 3.3 },
  "sect-outpost": { dx: 0.4, dy: -4.2 },
};

const regionById = new Map(JIUZHOU_REGIONS.map((region) => [region.id, region]));

export interface MapAgentRef {
  agentId: string;
  locationId: string;
  stateId?: string | null;
}

export interface MapAnchor {
  x: number;
  y: number;
  regionId: string;
}

export interface MapPin extends MapAnchor {
  agentId: string;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function offsetForNode(node: string): { dx: number; dy: number } {
  const known = NODE_OFFSETS[node];
  if (known) {
    return known;
  }
  const hash = hashString(node || "place");
  const angle = ((hash % 360) * Math.PI) / 180;
  return { dx: Math.cos(angle) * 3.2, dy: Math.sin(angle) * 2.4 };
}

export function regionByStateId(stateId: string | null | undefined): JiuzhouRegion | null {
  if (!stateId) {
    return null;
  }
  return regionById.get(stateId) ?? null;
}

export function anchorForLocation(locationId: string, stateId?: string | null): MapAnchor | null {
  const parts = locationId.split(":");
  const region = regionByStateId(stateId?.trim() || parts[0] || "");
  if (!region) {
    return null;
  }
  const node = parts[1] || "main-city";
  const offset = offsetForNode(node);
  return {
    regionId: region.id,
    x: clamp(region.x + offset.dx, 8, 112),
    y: clamp(region.y + offset.dy, 10, 78),
  };
}

export function layoutAgentPins(agents: readonly MapAgentRef[]): MapPin[] {
  const anchored = agents.flatMap((agent) => {
    const anchor = anchorForLocation(agent.locationId, agent.stateId);
    return anchor ? [{ agent, anchor }] : [];
  });

  const groups = new Map<string, typeof anchored>();
  for (const item of anchored) {
    const key = `${item.anchor.regionId}|${item.agent.locationId}`;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const pins: MapPin[] = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort((left, right) => left.agent.agentId.localeCompare(right.agent.agentId));
    const count = sorted.length;
    sorted.forEach((item, index) => {
      const radius = count === 1 ? 0 : Math.min(3.4, 1.15 + count * 0.28);
      const turn = ((hashString(item.agent.locationId) % 24) * Math.PI) / 12;
      const angle = turn + (index / count) * Math.PI * 2;
      pins.push({
        agentId: item.agent.agentId,
        regionId: item.anchor.regionId,
        x: clamp(item.anchor.x + Math.cos(angle) * radius, 6, 114),
        y: clamp(item.anchor.y + Math.sin(angle) * radius, 8, 80),
      });
    });
  }

  return pins.sort((left, right) => left.agentId.localeCompare(right.agentId));
}

export function roadPath(from: JiuzhouRegion, to: JiuzhouRegion): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const bend = 2.4;
  return `M ${from.x} ${from.y} Q ${midX + (-dy / length) * bend} ${midY + (dx / length) * bend} ${to.x} ${to.y}`;
}

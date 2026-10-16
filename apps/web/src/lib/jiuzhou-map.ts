/**
 * Pin slots for the drawn 九州 map in public/assets/jiuzhou-map.svg.
 * Coordinates share that file's viewBox. They are stable places on the drawing,
 * not a survey. A place id such as `qingzhou:main-city` lands on its capital,
 * then nudges by node type so a town does not sit on the city dot.
 */

export const MAP_VIEW = { width: 960, height: 680 } as const;

export interface JiuzhouRegion {
  id: string;
  name: string;
  capital: string;
  x: number;
  y: number;
}

export const JIUZHOU_REGIONS: readonly JiuzhouRegion[] = [
  { id: "youzhou", name: "幽州", capital: "朔宁城", x: 198, y: 142 },
  { id: "qingzhou", name: "青州", capital: "青岚城", x: 458, y: 138 },
  { id: "liangzhou", name: "凉州", capital: "砺关城", x: 138, y: 318 },
  { id: "shuzhou", name: "蜀州", capital: "栖云城", x: 286, y: 278 },
  { id: "zhongzhou", name: "中州", capital: "天衡城", x: 472, y: 276 },
  { id: "yangzhou", name: "扬州", capital: "广津城", x: 742, y: 236 },
  { id: "wanzhou", name: "宛州", capital: "长和城", x: 286, y: 478 },
  { id: "cangzhou", name: "沧州", capital: "沧澜城", x: 478, y: 468 },
  { id: "leizhou", name: "雷州", capital: "惊霆城", x: 708, y: 446 },
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
  "main-city": { dx: 12, dy: 14 },
  "sub-town-east": { dx: 28, dy: 6 },
  "sub-town-west": { dx: -28, dy: 8 },
  "sub-town-south": { dx: 6, dy: 32 },
  wilderness: { dx: -18, dy: -22 },
  "dungeon-c": { dx: 22, dy: -20 },
  "dungeon-b": { dx: -22, dy: 24 },
  "dungeon-a": { dx: 24, dy: 22 },
  "sect-outpost": { dx: 4, dy: -26 },
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
  return { dx: Math.cos(angle) * 22, dy: Math.sin(angle) * 16 };
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
    x: clamp(region.x + offset.dx, 48, 912),
    y: clamp(region.y + offset.dy, 40, 640),
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
      const radius = count === 1 ? 0 : Math.min(22, 8 + count * 1.8);
      const turn = ((hashString(item.agent.locationId) % 24) * Math.PI) / 12;
      const angle = turn + (index / count) * Math.PI * 2;
      pins.push({
        agentId: item.agent.agentId,
        regionId: item.anchor.regionId,
        x: clamp(item.anchor.x + Math.cos(angle) * radius, 36, 924),
        y: clamp(item.anchor.y + Math.sin(angle) * radius, 32, 648),
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

import {
  BASE_NODE_TYPES,
  INTRA_STATE_TRAVEL,
  type BaseLocationId,
  type BaseNodeType,
  type LocationId,
  type SectOutpostLocationId,
  type StateId,
} from "./constants.js";
import {
  getCrossStateEdges,
  getGeographyStateIds,
  resolveGeographyRegistry,
  type GeographyRegistryOverrides,
  validateGeographyRegistry,
} from "./geography-registry.js";
import type { Location } from "./model.js";

export interface TopologyEdge {
  from: LocationId;
  to: LocationId;
  ticks: number;
}

export interface TopologyGraph {
  edges: TopologyEdge[];
  distanceMatrix: Map<string, number>;
}

type MinimalLocation = Pick<Location, "id" | "stateId" | "nodeType">;

interface TopologyOptions {
  geographyRegistry?: GeographyRegistryOverrides;
}

export function toLocationId(stateId: StateId, nodeType: BaseNodeType): BaseLocationId {
  return `${stateId}:${nodeType}` as BaseLocationId;
}

export function toSectOutpostLocationId(
  stateId: StateId,
  organizationId: string,
): SectOutpostLocationId {
  return `${stateId}:sect-outpost:${organizationId}` as SectOutpostLocationId;
}

export function buildIntraStateEdges(stateId: StateId): TopologyEdge[] {
  const edges: TopologyEdge[] = [];

  for (const [pair, ticks] of Object.entries(INTRA_STATE_TRAVEL)) {
    const [fromNode, toNode] = pair.split("|") as [BaseNodeType, BaseNodeType];
    const from = toLocationId(stateId, fromNode);
    const to = toLocationId(stateId, toNode);

    edges.push({ from, to, ticks });
    edges.push({ from: to, to: from, ticks });
  }

  return edges;
}

export function buildCrossStateEdges(
  locations: Record<string, MinimalLocation>,
  options: TopologyOptions = {},
): TopologyEdge[] {
  const geographyRegistry = resolveGeographyRegistry(options.geographyRegistry);
  validateGeographyRegistry(geographyRegistry);
  const edges: TopologyEdge[] = [];

  for (const [stateA, stateB, ticks] of getCrossStateEdges(geographyRegistry)) {
    const from = toLocationId(stateA as StateId, "main-city");
    const to = toLocationId(stateB as StateId, "main-city");

    if (!locations[from] || !locations[to]) {
      continue;
    }

    edges.push({ from, to, ticks });
    edges.push({ from: to, to: from, ticks });
  }

  return edges;
}

function buildOutpostEdges(locations: Record<string, MinimalLocation>): TopologyEdge[] {
  const edges: TopologyEdge[] = [];

  for (const location of Object.values(locations)) {
    if (location.nodeType !== "sect-outpost") {
      continue;
    }

    const mainCityId = toLocationId(location.stateId, "main-city");
    if (!locations[mainCityId]) {
      continue;
    }

    edges.push({ from: location.id, to: mainCityId, ticks: 1 });
    edges.push({ from: mainCityId, to: location.id, ticks: 1 });
  }

  return edges;
}

function matrixKey(from: LocationId, to: LocationId): string {
  return `${from}|${to}`;
}

function allSeedBaseLocations(
  locations: Record<string, MinimalLocation>,
  options: TopologyOptions = {},
): LocationId[] {
  const geographyRegistry = resolveGeographyRegistry(options.geographyRegistry);
  const knownLocationIds = new Set(Object.keys(locations) as LocationId[]);
  const ordered: LocationId[] = [];

  for (const stateId of getGeographyStateIds(geographyRegistry) as StateId[]) {
    for (const nodeType of BASE_NODE_TYPES) {
      const locationId = toLocationId(stateId, nodeType);
      if (knownLocationIds.has(locationId)) {
        ordered.push(locationId);
      }
    }
  }

  for (const location of Object.values(locations)) {
    if (!ordered.includes(location.id)) {
      ordered.push(location.id);
    }
  }

  return ordered;
}

export function buildFullTopology(
  locations: Record<string, MinimalLocation>,
  options: TopologyOptions = {},
): TopologyGraph {
  const geographyRegistry = resolveGeographyRegistry(options.geographyRegistry);
  validateGeographyRegistry(geographyRegistry);

  const edges: TopologyEdge[] = [
    ...Object.values(
      Object.values(locations).reduce<Record<StateId, StateId>>((acc, location) => {
        acc[location.stateId] = location.stateId;
        return acc;
      }, {} as Record<StateId, StateId>),
    ).flatMap((stateId) => buildIntraStateEdges(stateId)),
    ...buildCrossStateEdges(locations, { geographyRegistry }),
    ...buildOutpostEdges(locations),
  ];

  const locationIds = allSeedBaseLocations(locations, { geographyRegistry });
  const distanceMatrix = new Map<string, number>();

  for (const from of locationIds) {
    for (const to of locationIds) {
      distanceMatrix.set(matrixKey(from, to), from === to ? 0 : Infinity);
    }
  }

  for (const edge of edges) {
    const key = matrixKey(edge.from, edge.to);
    const current = distanceMatrix.get(key) ?? Infinity;
    if (edge.ticks < current) {
      distanceMatrix.set(key, edge.ticks);
    }
  }

  for (const k of locationIds) {
    for (const i of locationIds) {
      const ik = distanceMatrix.get(matrixKey(i, k)) ?? Infinity;
      if (!Number.isFinite(ik)) {
        continue;
      }
      for (const j of locationIds) {
        const kj = distanceMatrix.get(matrixKey(k, j)) ?? Infinity;
        if (!Number.isFinite(kj)) {
          continue;
        }
        const ijKey = matrixKey(i, j);
        const ij = distanceMatrix.get(ijKey) ?? Infinity;
        const throughK = ik + kj;
        if (throughK < ij) {
          distanceMatrix.set(ijKey, throughK);
        }
      }
    }
  }

  return { edges, distanceMatrix };
}

export function getDistance(graph: TopologyGraph, from: LocationId, to: LocationId): number {
  return graph.distanceMatrix.get(matrixKey(from, to)) ?? Infinity;
}

export function getNeighbors(
  graph: TopologyGraph,
  locationId: LocationId,
): Array<{ locationId: LocationId; ticks: number }> {
  return graph.edges
    .filter((edge) => edge.from === locationId)
    .map((edge) => ({ locationId: edge.to, ticks: edge.ticks }));
}

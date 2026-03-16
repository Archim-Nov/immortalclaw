import {
  CROSS_STATE_EDGES,
  INTRA_STATE_TRAVEL,
  NODE_TYPES,
  STATE_IDS,
  type LocationId,
  type NodeType,
  type StateId,
} from "./constants.js";

export interface TopologyEdge {
  from: LocationId;
  to: LocationId;
  ticks: number;
}

export interface TopologyGraph {
  edges: TopologyEdge[];
  distanceMatrix: Map<string, number>;
}

export function toLocationId(stateId: StateId, nodeType: NodeType): LocationId {
  return `${stateId}:${nodeType}` as LocationId;
}

export function buildIntraStateEdges(stateId: StateId): TopologyEdge[] {
  const edges: TopologyEdge[] = [];

  for (const [pair, ticks] of Object.entries(INTRA_STATE_TRAVEL)) {
    const [fromNode, toNode] = pair.split("|") as [NodeType, NodeType];
    const from = toLocationId(stateId, fromNode);
    const to = toLocationId(stateId, toNode);

    edges.push({ from, to, ticks });
    edges.push({ from: to, to: from, ticks });
  }

  return edges;
}

export function buildCrossStateEdges(): TopologyEdge[] {
  const edges: TopologyEdge[] = [];

  for (const [stateA, stateB, ticks] of CROSS_STATE_EDGES) {
    const from = toLocationId(stateA, "main-city");
    const to = toLocationId(stateB, "main-city");

    edges.push({ from, to, ticks });
    edges.push({ from: to, to: from, ticks });
  }

  return edges;
}

function matrixKey(from: LocationId, to: LocationId): string {
  return `${from}|${to}`;
}

function allLocations(): LocationId[] {
  const locations: LocationId[] = [];
  for (const stateId of STATE_IDS) {
    for (const nodeType of NODE_TYPES) {
      locations.push(toLocationId(stateId, nodeType));
    }
  }
  return locations;
}

export function buildFullTopology(): TopologyGraph {
  const edges: TopologyEdge[] = [
    ...STATE_IDS.flatMap((stateId) => buildIntraStateEdges(stateId)),
    ...buildCrossStateEdges(),
  ];

  const locations = allLocations();
  const distanceMatrix = new Map<string, number>();

  for (const from of locations) {
    for (const to of locations) {
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

  for (const k of locations) {
    for (const i of locations) {
      const ik = distanceMatrix.get(matrixKey(i, k)) ?? Infinity;
      if (!Number.isFinite(ik)) {
        continue;
      }
      for (const j of locations) {
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

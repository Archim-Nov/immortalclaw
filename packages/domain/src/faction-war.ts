import type { Cultivator, FactionWar, WarFaction, WorldState } from "./model.js";

function factionForCultivator(world: WorldState, cultivator: Cultivator): WarFaction | null {
  if (!cultivator.sectId) {
    return null;
  }

  const sect = world.sects[cultivator.sectId];
  if (!sect) {
    return null;
  }

  return sect.alignment === "正道" ? "righteous" : "demonic";
}

export function getActiveFactionWarForState(
  world: WorldState,
  stateId: string,
  tick = world.tick,
): FactionWar | null {
  return Object.values(world.factionWars).find((war) =>
    war.stateId === stateId && war.startTick <= tick && war.endTick >= tick,
  ) ?? null;
}

export function recordFactionWarContribution(
  world: WorldState,
  cultivator: Cultivator,
  amount: number,
): {
  warId: string;
  objectiveId: string;
  faction: WarFaction;
  progress: number;
  completed: boolean;
} | null {
  const location = world.locations[cultivator.locationId];
  if (!location) {
    return null;
  }

  const war = getActiveFactionWarForState(world, location.stateId);
  if (!war) {
    return null;
  }

  const faction = factionForCultivator(world, cultivator);
  if (!faction) {
    return null;
  }

  const objective = war.objectives.find((entry) => !entry.completed) ?? war.objectives[0];
  if (!objective) {
    return null;
  }

  objective.progress[faction] += Math.max(0, amount);
  if (objective.progress[faction] >= objective.target) {
    objective.completed = true;
  }

  return {
    warId: war.warId,
    objectiveId: objective.objectiveId,
    faction,
    progress: objective.progress[faction],
    completed: objective.completed,
  };
}

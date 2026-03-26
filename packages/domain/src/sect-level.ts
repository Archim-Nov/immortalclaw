import type { SectBonus, SectLevel, WorldState } from "./model.js";

export function sumSectContribution(world: WorldState, sectId: string): number {
  const sect = world.sects[sectId];
  if (!sect) {
    return 0;
  }

  return sect.memberIds.reduce(
    (sum, memberId) => sum + (world.cultivators[memberId]?.totalContribution ?? 0),
    0,
  );
}

export function calculateSectLevel(totalContribution: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, totalContribution) / 1000)) + 1);
}

export function nextSectLevelExp(level: number): number {
  const nextLevel = Math.max(1, level);
  return nextLevel * nextLevel * 1000;
}

function buildSectBonuses(level: number): SectBonus[] {
  const bonuses: SectBonus[] = [];

  bonuses.push({
    type: "resource",
    value: Math.max(2, level * 2),
    appliesTo: "all-members",
  });

  if (level >= 2) {
    bonuses.push({
      type: "production",
      value: level,
      appliesTo: "all-members",
    });
  }
  if (level >= 3) {
    bonuses.push({
      type: "damage",
      value: level + 1,
      appliesTo: "all-members",
    });
  }
  if (level >= 4) {
    bonuses.push({
      type: "defense",
      value: level,
      appliesTo: "all-members",
    });
  }

  return bonuses;
}

export function buildSectLevel(world: WorldState, sectId: string): SectLevel | null {
  const sect = world.sects[sectId];
  if (!sect) {
    return null;
  }

  const experience = sumSectContribution(world, sectId);
  const level = calculateSectLevel(experience);
  return {
    sectId,
    level,
    experience,
    nextLevelExp: nextSectLevelExp(level),
    bonuses: buildSectBonuses(level),
  };
}

export function sectBonusValue(
  sectLevel: SectLevel | null,
  type: SectBonus["type"],
): number {
  if (!sectLevel) {
    return 0;
  }

  return sectLevel.bonuses
    .filter((bonus) => bonus.type === type)
    .reduce((sum, bonus) => sum + bonus.value, 0);
}

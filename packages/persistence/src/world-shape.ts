import {
  createSeedPersistedWorld,
  hydrateWorldState,
  toPersistedWorldState,
} from "../../domain/src/runtime.js";
import type { PersistedWorldState, WorldState } from "../../domain/src/runtime.js";
import { createDungeonProgress, createEmptyInventory, createFactionReputation } from "../../domain/src/seed.js";
import type { GeographyRegistryOverrides } from "../../domain/src/geography-registry.js";
import type { ItemDefinition, ItemId, Location } from "../../domain/src/model.js";
import type { LocationId, StateId } from "../../domain/src/constants.js";

const REMOVED_LEGACY_MANUAL_IDS = ["sword-manual", "alchemy-manual", "array-manual"] as const;
const REMOVED_BREAKTHROUGH_MATERIAL_IDS = [
  "qi-common", "foundation-common", "core-common",
  "qi-stage-1-special", "qi-stage-2-special", "qi-major-special",
  "foundation-stage-1-special", "foundation-stage-2-special", "foundation-major-special",
  "core-stage-1-special", "core-stage-2-special",
] as const;

function mergeRecordDefaults<T extends Record<string, unknown>>(
  defaults: T,
  existing: unknown,
): T {
  const merged = structuredClone(defaults);
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
    return merged;
  }

  for (const [key, value] of Object.entries(existing)) {
    const defaultEntry = merged[key as keyof T];
    if (
      defaultEntry
      && typeof defaultEntry === "object"
      && !Array.isArray(defaultEntry)
      && value
      && typeof value === "object"
      && !Array.isArray(value)
    ) {
      merged[key as keyof T] = {
        ...(defaultEntry as Record<string, unknown>),
        ...(value as Record<string, unknown>),
      } as T[keyof T];
      continue;
    }

    merged[key as keyof T] = value as T[keyof T];
  }

  return merged;
}

function normalizePersistedWorldInput(world: PersistedWorldState | WorldState): PersistedWorldState {
  if ("topology" in world || "eventPools" in world) {
    return toPersistedWorldState(world as WorldState);
  }

  return structuredClone(world as PersistedWorldState);
}

function ensureOrganizationOutpost(
  world: PersistedWorldState,
  seedWorld: PersistedWorldState,
  input: {
    organizationId: string;
    organizationName: string;
    organizationType: "player-sect" | "neutral-sect";
    stateId: StateId;
  },
): LocationId {
  const expectedHeadquarters = `${input.stateId}:sect-outpost:${input.organizationId}` as LocationId;
  const existingSeedLocation = seedWorld.locations[expectedHeadquarters];

  if (!world.locations[expectedHeadquarters]) {
    const location: Location = existingSeedLocation
      ? structuredClone(existingSeedLocation)
      : {
          id: expectedHeadquarters,
          stateId: input.stateId,
          nodeType: "sect-outpost",
          name: `${input.organizationName}据点`,
          kind: "safe",
          risk: (seedWorld.states[input.stateId]?.risk ?? "safe") as Location["risk"],
          description: `Dedicated outpost for ${input.organizationName}.`,
          organizationId: input.organizationId,
          organizationType: input.organizationType,
        };
    world.locations[expectedHeadquarters] = location;
  }

  return expectedHeadquarters;
}

interface HydrateMigratedP3WorldOptions {
  geographyRegistry?: GeographyRegistryOverrides;
}

export function hydrateMigratedP3WorldState(
  world: PersistedWorldState | WorldState,
  options: HydrateMigratedP3WorldOptions = {},
): WorldState {
  const copy = normalizePersistedWorldInput(world);
  const seedWorld = createSeedPersistedWorld(options);

  copy.sects = mergeRecordDefaults(seedWorld.sects, copy.sects);
  copy.neutralSects = mergeRecordDefaults(seedWorld.neutralSects, copy.neutralSects);
  copy.locations = mergeRecordDefaults(seedWorld.locations, copy.locations);
  copy.states = mergeRecordDefaults(seedWorld.states, copy.states);
  copy.questBoards = mergeRecordDefaults(seedWorld.questBoards, copy.questBoards);
  copy.wildernessLayers = mergeRecordDefaults(seedWorld.wildernessLayers, copy.wildernessLayers);
  copy.wildernessProgress =
    copy.wildernessProgress && typeof copy.wildernessProgress === "object"
      ? copy.wildernessProgress
      : {};
  copy.bahuangProgress =
    copy.bahuangProgress && typeof copy.bahuangProgress === "object"
      ? copy.bahuangProgress
      : {};
  copy.dungeonExpeditions =
    copy.dungeonExpeditions && typeof copy.dungeonExpeditions === "object"
      ? copy.dungeonExpeditions
      : {};
  copy.dungeonExpeditionReports =
    copy.dungeonExpeditionReports && typeof copy.dungeonExpeditionReports === "object"
      ? copy.dungeonExpeditionReports
      : {};
  copy.guixuNodes = mergeRecordDefaults(seedWorld.guixuNodes, copy.guixuNodes);
  copy.guixuProgress = {
    wildernessAttunement:
      copy.guixuProgress?.wildernessAttunement && typeof copy.guixuProgress.wildernessAttunement === "object"
        ? copy.guixuProgress.wildernessAttunement
        : structuredClone(seedWorld.guixuProgress.wildernessAttunement),
    personalUnlockedNodeIds:
      copy.guixuProgress?.personalUnlockedNodeIds && typeof copy.guixuProgress.personalUnlockedNodeIds === "object"
        ? copy.guixuProgress.personalUnlockedNodeIds
        : structuredClone(seedWorld.guixuProgress.personalUnlockedNodeIds),
    sharedUnlockedNodeIds: Array.isArray(copy.guixuProgress?.sharedUnlockedNodeIds)
      ? copy.guixuProgress.sharedUnlockedNodeIds
      : structuredClone(seedWorld.guixuProgress.sharedUnlockedNodeIds),
    lastResolvedEventIds:
      copy.guixuProgress?.lastResolvedEventIds && typeof copy.guixuProgress.lastResolvedEventIds === "object"
        ? copy.guixuProgress.lastResolvedEventIds
        : structuredClone(seedWorld.guixuProgress.lastResolvedEventIds),
  };
  copy.factionWars = mergeRecordDefaults(seedWorld.factionWars, copy.factionWars);
  const existingItemDefinitions: Partial<Record<ItemId, ItemDefinition>> =
    copy.itemDefinitions && typeof copy.itemDefinitions === "object" && !Array.isArray(copy.itemDefinitions)
      ? copy.itemDefinitions
      : {};
  copy.itemDefinitions = mergeRecordDefaults(
    existingItemDefinitions,
    seedWorld.itemDefinitions,
  ) as Record<ItemId, ItemDefinition>;
  for (const itemId of REMOVED_LEGACY_MANUAL_IDS) {
    delete (copy.itemDefinitions as Record<string, unknown>)[itemId];
  }
  for (const itemId of REMOVED_BREAKTHROUGH_MATERIAL_IDS) {
    delete (copy.itemDefinitions as Record<string, unknown>)[itemId];
  }
  copy.pendingSectApplications =
    copy.pendingSectApplications && typeof copy.pendingSectApplications === "object"
      ? copy.pendingSectApplications
      : {};
  copy.sectReapplyCooldowns =
    copy.sectReapplyCooldowns && typeof copy.sectReapplyCooldowns === "object"
      ? copy.sectReapplyCooldowns
      : {};
  copy.nextSectApplicationSequence =
    typeof copy.nextSectApplicationSequence === "number" && Number.isFinite(copy.nextSectApplicationSequence)
      ? copy.nextSectApplicationSequence
      : 1;
  copy.nextSectCooldownSequence =
    typeof copy.nextSectCooldownSequence === "number" && Number.isFinite(copy.nextSectCooldownSequence)
      ? copy.nextSectCooldownSequence
      : 1;

  for (const [sectId, sect] of Object.entries(copy.sects)) {
    const currentStateId = (sect.headquarters?.split(":")[0] ?? "qingzhou") as StateId;
    sect.alignment = sect.alignment ?? seedWorld.sects[sectId]?.alignment ?? "正道";
    sect.stateId = sect.stateId ?? currentStateId;
    sect.founderCultivatorId = sect.founderCultivatorId ?? sect.memberIds[0] ?? "";
    sect.headquarters = ensureOrganizationOutpost(copy, seedWorld, {
      organizationId: sect.id,
      organizationName: sect.name,
      organizationType: "player-sect",
      stateId: sect.stateId,
    });
    sect.admissionPolicy = sect.admissionPolicy ?? {
      minimumRealmLevel: 1,
      allowedMotiveBuckets: [
        "longevity-order",
        "dao-truth",
        "guard-world",
        "strife-defiance",
        "freedom-wander",
      ],
    };
    sect.admissionPolicyUpdatedAtTick =
      typeof sect.admissionPolicyUpdatedAtTick === "number" && Number.isFinite(sect.admissionPolicyUpdatedAtTick)
        ? sect.admissionPolicyUpdatedAtTick
        : 0;
  }

  for (const [neutralSectId, neutralSect] of Object.entries(copy.neutralSects)) {
    neutralSect.alignment = "中立";
    neutralSect.headquarters = ensureOrganizationOutpost(copy, seedWorld, {
      organizationId: neutralSectId,
      organizationName: neutralSect.name,
      organizationType: "neutral-sect",
      stateId: neutralSect.stateId,
    });
  }

  for (const cultivator of Object.values(copy.cultivators)) {
    cultivator.inventory = {
      ...createEmptyInventory(),
      ...(cultivator.inventory ?? {}),
    };
    for (const itemId of REMOVED_LEGACY_MANUAL_IDS) {
      delete (cultivator.inventory as Record<string, unknown>)[itemId];
    }
    for (const itemId of REMOVED_BREAKTHROUGH_MATERIAL_IDS) {
      delete (cultivator.inventory as Record<string, unknown>)[itemId];
    }
    cultivator.factionReputation = {
      ...createFactionReputation(),
      ...(cultivator.factionReputation ?? {}),
    };
    cultivator.breakthroughRecords = Array.isArray(cultivator.breakthroughRecords)
      ? cultivator.breakthroughRecords
      : [];
    cultivator.dungeonProgress = mergeRecordDefaults(createDungeonProgress(), cultivator.dungeonProgress);
    cultivator.mainAttributeGrowth = cultivator.mainAttributeGrowth ?? {
      gengu: 0, tipu: 0, lingyuan: 0, shenshi: 0, wuxing: 0, daoxin: 0, shenfa: 0, bingpo: 0,
    };
    cultivator.fiveElementGrowth = cultivator.fiveElementGrowth ?? {
      metal: 0, wood: 0, water: 0, fire: 0, earth: 0,
    };
    cultivator.mainAttributePercentageBonus = cultivator.mainAttributePercentageBonus ?? 0;
    cultivator.pendingSectApplicationId = cultivator.pendingSectApplicationId ?? null;
    cultivator.realmProgress =
      typeof cultivator.realmProgress === "number" && Number.isFinite(cultivator.realmProgress)
        ? Math.max(0, Math.min(100, cultivator.realmProgress))
        : 0;
    cultivator.travelNotes = Array.isArray(cultivator.travelNotes)
      ? cultivator.travelNotes.filter((note) => note && typeof note.detail === "string").slice(0, 12)
      : [];
  }

  for (const progress of Object.values(copy.dungeonExpeditions)) {
    progress.flavorEventTitles = Array.isArray(progress.flavorEventTitles)
      ? progress.flavorEventTitles.filter((title): title is string => typeof title === "string")
      : [];
    progress.beats = Array.isArray(progress.beats) ? progress.beats : [];
    progress.qiSpent = typeof progress.qiSpent === "number" ? progress.qiSpent : 0;
    progress.spiritualPowerSpent = typeof progress.spiritualPowerSpent === "number" ? progress.spiritualPowerSpent : 0;
    progress.injuryTicksGained = typeof progress.injuryTicksGained === "number" ? progress.injuryTicksGained : 0;
    progress.stonesLost = typeof progress.stonesLost === "number" ? progress.stonesLost : 0;
  }

  for (const report of Object.values(copy.dungeonExpeditionReports)) {
    report.flavorEvents = Array.isArray(report.flavorEvents)
      ? report.flavorEvents.filter((title): title is string => typeof title === "string")
      : [];
    report.beats = Array.isArray(report.beats) ? report.beats : [];
  }

  return hydrateWorldState(copy, options);
}

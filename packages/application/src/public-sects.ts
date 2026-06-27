import type {
  PublicSectsDirectoryResponse,
  PublicSectSummary,
} from "../../contracts/src/runtime-api.js";
import type { WorldState } from "../../domain/src/runtime.js";

export interface PublicSectsWorldRepository {
  readWorld(): Promise<WorldState>;
}

/**
 * List every organization in the realm — player-founded sects and neutral sects — as a public
 * directory, ranked by following. Reading is fully open in 修仙Claw.
 */
export async function buildPublicSectsDirectory(options: {
  world: PublicSectsWorldRepository;
}): Promise<PublicSectsDirectoryResponse> {
  const snapshot = await options.world.readWorld();
  const locationName = (locationId: string) => snapshot.locations[locationId]?.name ?? locationId;
  const cultivatorName = (cultivatorId: string) => snapshot.cultivators[cultivatorId]?.name ?? null;

  const playerSects: PublicSectSummary[] = Object.values(snapshot.sects).map((sect) => ({
    id: sect.id,
    kind: "player",
    name: sect.name,
    alignment: sect.alignment,
    stateId: sect.stateId,
    headquarters: locationName(sect.headquarters),
    memberCount: sect.memberIds.length,
    founderName: cultivatorName(sect.founderCultivatorId),
    minimumRealmLevel: sect.admissionPolicy.minimumRealmLevel,
    description: null,
  }));

  const neutralSects: PublicSectSummary[] = Object.values(snapshot.neutralSects).map((sect) => ({
    id: sect.id,
    kind: "neutral",
    name: sect.name,
    alignment: sect.alignment,
    stateId: sect.stateId,
    headquarters: locationName(sect.headquarters),
    memberCount: sect.memberIds.length,
    founderName: null,
    minimumRealmLevel: null,
    description: sect.description,
  }));

  const sects = [...playerSects, ...neutralSects].sort(
    (left, right) => right.memberCount - left.memberCount || left.name.localeCompare(right.name),
  );

  return { tick: snapshot.tick, sects };
}

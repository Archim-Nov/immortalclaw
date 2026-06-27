import type {
  PublicWorldChronicleResponse,
  WorldChronicleEntry,
} from "../../contracts/src/runtime-api.js";
import type { WorldState } from "../../domain/src/runtime.js";

export interface PublicChronicleWorldRepository {
  readWorld(): Promise<WorldState>;
}

const MAX_SCAN = 120;
const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 120;

/**
 * Merge the world's recent events and combats into one public, newest-first feed.
 * Reading is fully open in 修仙Claw; this is the realm's living chronicle.
 */
export async function buildPublicWorldChronicle(options: {
  world: PublicChronicleWorldRepository;
  limit?: number;
}): Promise<PublicWorldChronicleResponse> {
  const limit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(options.limit ?? DEFAULT_LIMIT)));
  const snapshot = await options.world.readWorld();
  const nameOf = (cultivatorId: string | null) =>
    cultivatorId ? snapshot.cultivators[cultivatorId]?.name ?? null : null;

  const eventEntries: WorldChronicleEntry[] = snapshot.worldEvents.slice(0, MAX_SCAN).map((event) => ({
    id: `event:${event.id}`,
    kind: "event",
    tick: event.tick,
    actorCultivatorId: event.cultivatorId,
    actorName: nameOf(event.cultivatorId),
    title: event.title,
    summary: event.content,
    tone: event.severity,
    tags: event.tags,
  }));

  const combatEntries: WorldChronicleEntry[] = snapshot.combatLogs.slice(0, MAX_SCAN).map((combat) => ({
    id: `combat:${combat.id}`,
    kind: "combat",
    tick: combat.tick,
    actorCultivatorId: combat.cultivatorId,
    actorName: nameOf(combat.cultivatorId),
    title: combat.enemyName,
    summary: combat.summary,
    tone: combat.outcome,
    tags: [],
  }));

  const entries = [...eventEntries, ...combatEntries]
    .sort((left, right) => right.tick - left.tick || left.id.localeCompare(right.id))
    .slice(0, limit);

  return { tick: snapshot.tick, entries };
}

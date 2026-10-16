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
const SYSTEM_SENDERS = new Set(["Registry", "Immortal Registry"]);

/**
 * Merge the world's recent events, combats, and messages into one public, newest-first feed.
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

  const dialogueEntries: WorldChronicleEntry[] = [...snapshot.messages]
    .sort((left, right) => right.tick - left.tick || left.id.localeCompare(right.id))
    .slice(0, MAX_SCAN)
    .flatMap((message) => {
      const summary = message.spokenLine?.trim() || message.content.trim();
      if (!summary || SYSTEM_SENDERS.has(message.from.trim())) {
        return [];
      }
      return [{
        id: `dialogue:${message.id}`,
        kind: "dialogue" as const,
        tick: message.tick,
        actorCultivatorId: message.fromCultivatorId ?? message.cultivatorId,
        actorName: message.from.trim() || nameOf(message.fromCultivatorId ?? null),
        title: message.subject.trim() || "传音",
        summary,
        tone: "dialogue",
        tags: message.spokenLine?.trim() ? ["传音"] : ["书信"],
      }];
    });

  const entries = [...eventEntries, ...combatEntries, ...dialogueEntries]
    .sort((left, right) => right.tick - left.tick || left.id.localeCompare(right.id))
    .slice(0, limit);

  return { tick: snapshot.tick, entries };
}

import type { ItemId } from "./model.js";
import type { EncounterBuildId } from "./encounters/catalog.js";

export interface WildernessEventDefinition {
  eventId: string;
  title: string;
  content: string;
  summary: string;
  severity: "medium" | "high";
  tags: string[];
  qiDamage?: number;
  spiritualDamage?: number;
  injuryTicks?: number;
  forcedRetreat?: boolean;
  spiritStoneReward?: number;
  rewards?: Partial<Record<ItemId, number>>;
  encounterBuildId?: EncounterBuildId | null;
  combatMode?: "light" | "full" | null;
}

export const WILDERNESS_EVENT_POOL: Record<string, WildernessEventDefinition> = {
  "wilderness-extreme-storm": {
    eventId: "wilderness-extreme-storm",
    title: "Extreme Storm",
    content: "A violent storm tears through the threshold route and burns through your reserves.",
    summary: "survived an extreme storm",
    severity: "high",
    tags: ["wilderness", "hazard", "storm"],
    qiDamage: 12,
    spiritualDamage: 10,
    injuryTicks: 2,
  },
  "wilderness-ancient-guardian": {
    eventId: "wilderness-ancient-guardian",
    title: "Ancient Guardian",
    content: "A buried guardian wakes in the dust and leaves behind a relic after the clash.",
    summary: "defeated an ancient guardian",
    severity: "high",
    tags: ["wilderness", "guardian", "encounter"],
    qiDamage: 8,
    spiritualDamage: 10,
    injuryTicks: 1,
    rewards: {
      "ancient-artifact": 1,
      "beast-core": 1,
    },
    encounterBuildId: "wilderness-ancient-guardian-event" as EncounterBuildId,
  },
  "wilderness-lost-cache": {
    eventId: "wilderness-lost-cache",
    title: "Lost Cache",
    content: "A half-buried expedition cache still holds usable supplies.",
    summary: "recovered a lost cache",
    severity: "medium",
    tags: ["wilderness", "cache", "reward"],
    spiritStoneReward: 180,
    rewards: {
      "spirit-ore": 2,
      "ruin-fragment": 1,
    },
  },
  // ── New: Resource encounters ──
  "wilderness-spirit-vein-seep": {
    eventId: "wilderness-spirit-vein-seep",
    title: "Spirit Vein Seep",
    content: "A shallow fissure leaks raw spirit energy. The concentration is enough to crystallize a few usable fragments.",
    summary: "harvested spirit vein seep",
    severity: "medium",
    tags: ["wilderness", "resource", "spirit"],
    spiritStoneReward: 120,
    rewards: {
      "spirit-ore": 1,
    },
  },
  "wilderness-herb-thicket": {
    eventId: "wilderness-herb-thicket",
    title: "Herb Thicket",
    content: "Wild herbs grow dense in a sheltered fold of the terrain. Worth a careful harvest.",
    summary: "gathered herbs from a thicket",
    severity: "medium",
    tags: ["wilderness", "resource", "herb"],
    spiritStoneReward: 90,
    rewards: {
      "foundation-common": 1,
    },
  },
  // ── New: Status encounters ──
  "wilderness-ley-current": {
    eventId: "wilderness-ley-current",
    title: "Ley Current",
    content: "A faint underground current of aligned qi brushes past. Enough to steady your circulation for a while.",
    summary: "absorbed a ley current",
    severity: "medium",
    tags: ["wilderness", "status", "qi"],
    qiDamage: -15,
  },
  "wilderness-miasma-pocket": {
    eventId: "wilderness-miasma-pocket",
    title: "Miasma Pocket",
    content: "You stumble into a pocket of stale miasma. It stings the lungs but clears after a few breaths.",
    summary: "passed through miasma",
    severity: "medium",
    tags: ["wilderness", "hazard", "status"],
    qiDamage: 6,
    spiritualDamage: 4,
  },
  // ── New: Story / trace encounters ──
  "wilderness-old-campfire": {
    eventId: "wilderness-old-campfire",
    title: "Old Campfire",
    content: "Ashes and a carved marker. Someone passed through recently and left behind a crude but readable route note.",
    summary: "found an old campfire with route notes",
    severity: "medium",
    tags: ["wilderness", "story", "human"],
    spiritStoneReward: 40,
  },
  "wilderness-beast-trail": {
    eventId: "wilderness-beast-trail",
    title: "Beast Trail",
    content: "Deep claw marks and shed scales mark a beast's regular path. The trail leads to a disturbed mineral seam.",
    summary: "followed a beast trail to minerals",
    severity: "medium",
    tags: ["wilderness", "story", "beast"],
    spiritStoneReward: 60,
    rewards: {
      "spirit-ore": 1,
    },
  },
  // ── New: Combat-adjacent encounters ──
  "wilderness-dust-crawler-raid": {
    eventId: "wilderness-dust-crawler-raid",
    title: "Dust Crawler Raid",
    content: "A burrowing predator lunges from loose soil. It fights dirty and fast.",
    summary: "fought off a dust crawler",
    severity: "high",
    tags: ["wilderness", "combat", "beast"],
    qiDamage: 10,
    spiritualDamage: 6,
    injuryTicks: 1,
    rewards: {
      "beast-core": 1,
    },
    encounterBuildId: "wilderness-dust-crawler-ambush" as EncounterBuildId,
  },
  "wilderness-stone-sentinel-wake": {
    eventId: "wilderness-stone-sentinel-wake",
    title: "Stone Sentinel Wake",
    content: "A dormant construct hums to life as you step on the wrong stone. It moves slowly but hits hard.",
    summary: "survived a stone sentinel encounter",
    severity: "high",
    tags: ["wilderness", "combat", "construct"],
    qiDamage: 10,
    spiritualDamage: 8,
    injuryTicks: 1,
    rewards: {
      "spirit-ore": 2,
    },
    encounterBuildId: "wilderness-stone-sentinel-clash" as EncounterBuildId,
  },
  // ── New: Additional beast event encounters ──
  "wilderness-spirit-wisp-haunt": {
    eventId: "wilderness-spirit-wisp-haunt",
    title: "Spirit Wisp Haunt",
    content: "A pale flame drifts out of empty air and circles you. Its heat is spiritual, not physical — it leeches focus and burns qi channels.",
    summary: "was haunted by a spirit wisp",
    severity: "high",
    tags: ["wilderness", "combat", "spirit"],
    qiDamage: 6,
    spiritualDamage: 12,
    injuryTicks: 1,
    rewards: {
      "spirit-ore": 1,
    },
    encounterBuildId: "wilderness-spirit-wisp-haunt" as EncounterBuildId,
  },
  "wilderness-wind-hawk-dive": {
    eventId: "wilderness-wind-hawk-dive",
    title: "Wind Hawk Dive",
    content: "A screech cuts the air and a razor-taloned hawk dives from the blind side. It's fast enough to draw blood before you can react.",
    summary: "fought off a diving wind hawk",
    severity: "high",
    tags: ["wilderness", "combat", "beast"],
    qiDamage: 8,
    spiritualDamage: 4,
    injuryTicks: 1,
    rewards: {
      "beast-core": 1,
    },
    encounterBuildId: "wilderness-wind-hawk-dive" as EncounterBuildId,
  },
  "wilderness-marsh-lurker-ambush": {
    eventId: "wilderness-marsh-lurker-ambush",
    title: "Marsh Lurker Ambush",
    content: "The ground shifts underfoot and a mud-caked predator erupts from the swamp. Its grip is crushing and the water slows your retreat.",
    summary: "escaped a marsh lurker ambush",
    severity: "high",
    tags: ["wilderness", "combat", "beast", "ambush"],
    qiDamage: 10,
    spiritualDamage: 6,
    injuryTicks: 2,
    rewards: {
      "foundation-common": 1,
    },
    encounterBuildId: "wilderness-marsh-lurker-ambush" as EncounterBuildId,
  },
  "wilderness-shadow-hound-pack": {
    eventId: "wilderness-shadow-hound-pack",
    title: "Shadow Hound Pack",
    content: "Low growls circle in the dark. A pack of shadow hounds closes ranks and tests you from three sides at once.",
    summary: "scattered a shadow hound pack",
    severity: "high",
    tags: ["wilderness", "combat", "beast"],
    qiDamage: 12,
    spiritualDamage: 4,
    injuryTicks: 1,
    rewards: {
      "beast-core": 1,
      "spirit-ore": 1,
    },
    encounterBuildId: "wilderness-shadow-hound-pack" as EncounterBuildId,
  },
  "wilderness-iron-beetle-clash": {
    eventId: "wilderness-iron-beetle-clash",
    title: "Iron Beetle Clash",
    content: "A boulder shifts and reveals it was armor plating all along. The creature underneath is slow but nearly impossible to scratch.",
    summary: "battered through an iron beetle",
    severity: "high",
    tags: ["wilderness", "combat", "beast", "construct"],
    qiDamage: 8,
    spiritualDamage: 6,
    injuryTicks: 1,
    rewards: {
      "spirit-ore": 2,
    },
    encounterBuildId: "wilderness-iron-beetle-clash" as EncounterBuildId,
  },
  "wilderness-rift-serpent-strike": {
    eventId: "wilderness-rift-serpent-strike",
    title: "Rift Serpent Strike",
    content: "A slender shape coils from a crack in the stone and strikes before you can set your guard. Its scales scatter light in wrong directions.",
    summary: "dodged a rift serpent strike",
    severity: "high",
    tags: ["wilderness", "combat", "beast"],
    qiDamage: 9,
    spiritualDamage: 5,
    injuryTicks: 1,
    rewards: {
      "beast-core": 1,
    },
    encounterBuildId: "wilderness-rift-serpent-strike" as EncounterBuildId,
  },
};

export function getWildernessEventDefinition(eventId: string): WildernessEventDefinition | null {
  return WILDERNESS_EVENT_POOL[eventId] ?? null;
}

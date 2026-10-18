import { regionByStateId } from "./jiuzhou-map";

const CJK = /[\u3400-\u9fff]/u;

const GENDER_LABELS: Record<string, string> = {
  male: "男",
  female: "女",
  nonbinary: "非二元",
  other: "其他",
};

const TEMPERAMENT_LABELS: Record<string, string> = {
  cautious: "谨慎",
  calm: "沉静",
};

const STANDING_LABELS: Record<string, string> = {
  hostile: "敌对",
  cold: "冷淡",
  neutral: "中立",
  trusted: "信任",
  favored: "优待",
};

const RISK_LABELS: Record<string, string> = {
  high: "偏高",
  medium: "中等",
  low: "偏低",
  none: "没有",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const TECHNIQUE_LABELS: Record<string, string> = {
  "loose breathing": "松息",
  "light body": "轻身",
  "basic breathing": "基础吐纳",
};

const EFFECT_LABELS: Record<string, string> = {
  wounded: "带伤",
  poisoned: "中毒",
  "clear-mind": "心神清明",
  "qi-surge": "气血上涌",
  "fortune-marked": "气运加身",
  warded: "护体",
  deviation: "走火入魔",
  insight: "有所悟",
  "spirit-saturated": "灵气充盈",
};

const FACTION_LABELS: Record<string, string> = {
  righteous: "正道",
  demonic: "魔道",
};

export function hasChinese(value: string | null | undefined): boolean {
  return CJK.test(value ?? "");
}

/** Keep a visitor-facing string only when it already contains Chinese. */
export function visitorText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return hasChinese(trimmed) ? trimmed : null;
}

function stateName(stateId: string | null | undefined, locationId: string | null | undefined): string | null {
  const id = stateId?.trim() || locationId?.split(":")[0]?.trim() || "";
  return regionByStateId(id)?.name ?? null;
}

/**
 * The header chip names a Chinese origin when one was written.
 * An English province label such as "Yun Province" is replaced by the state the cultivator is standing in.
 */
export function publicOriginChip(input: {
  origin?: string | null;
  locationId?: string | null;
  stateId?: string | null;
}): string | null {
  return visitorText(input.origin) ?? stateName(input.stateId, input.locationId);
}

/**
 * Temperament and gender for the line under the name.
 * Known English persona words become Chinese. Placeholders with no Chinese, including unspecified, drop out.
 * The whole line is omitted when nothing Chinese remains.
 */
export function publicPersonaLine(input: {
  temperament?: string | null;
  genderPresentation?: string | null;
}): string | null {
  const rawTemperament = input.temperament?.trim() ?? "";
  const temperament = visitorText(rawTemperament)
    ?? TEMPERAMENT_LABELS[rawTemperament.toLowerCase()]
    ?? null;
  const rawGender = input.genderPresentation?.trim().toLowerCase() ?? "";
  const gender = GENDER_LABELS[rawGender] ?? visitorText(input.genderPresentation);
  const parts = [temperament, gender].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function publicPlaceName(input: {
  location?: string | null;
  locationId?: string | null;
  stateId?: string | null;
}): string {
  const named = visitorText(input.location);
  if (named) {
    return named;
  }
  const region = regionByStateId(input.stateId?.trim() || input.locationId?.split(":")[0]?.trim() || "");
  if (!region) {
    return "所在未明";
  }
  const node = input.locationId?.split(":")[1]?.trim();
  if (!node || node === "main-city") {
    return region.capital;
  }
  return region.name;
}

const REALM_PHASES = ["前期", "中期", "后期"] as const;

function phaseFromLayerToken(token: string): (typeof REALM_PHASES)[number] | null {
  const index = "一二三四五六七八九".indexOf(token);
  const layer = index >= 0 ? index + 1 : Number(token);
  if (!Number.isInteger(layer) || layer < 1 || layer > 9) return null;
  return REALM_PHASES[Math.floor((layer - 1) / 3)]!;
}

function phaseFromLayerText(text: string): (typeof REALM_PHASES)[number] | null {
  const match = text.match(/^(?:第)?([一二三四五六七八九1-9])层$/);
  return match ? phaseFromLayerToken(match[1]!) : null;
}

function phaseFromLevel(level: number): (typeof REALM_PHASES)[number] {
  const normalized = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  return REALM_PHASES[(normalized - 1) % REALM_PHASES.length]!;
}

export function formatRealmLabel(input: {
  realm: string;
  realmLevel: number;
  realmPhase?: string;
}): string {
  let realm = visitorText(input.realm) ?? "修士";
  const namedLayer = realm.match(/炼气(?:第)?([一二三四五六七八九1-9])层/);
  const namedPhase = namedLayer ? phaseFromLayerToken(namedLayer[1]!) : null;
  if (namedLayer) realm = realm.replace(/炼气(?:第)?([一二三四五六七八九1-9])层/g, "炼气");
  const rawPhase = visitorText(input.realmPhase);
  const phase = namedPhase ?? (rawPhase ? phaseFromLayerText(rawPhase) : null) ?? rawPhase ?? phaseFromLevel(input.realmLevel);
  if (realm.endsWith(phase)) return realm;
  return `${realm}${phase}`;
}

export function actionLine(input: {
  status: "idle" | "busy" | "injured";
  actionLabel?: string | null;
  actionId?: string | null;
}): string {
  const label = visitorText(input.actionLabel);
  if (label) {
    return label;
  }
  if (input.status === "injured") {
    return "养伤";
  }
  if (input.status === "busy") {
    return "在做事";
  }
  return "闲着";
}

export function chronicleKindLabel(kind: "event" | "combat" | "dialogue"): string {
  if (kind === "combat") {
    return "交手";
  }
  if (kind === "dialogue") {
    return "传音";
  }
  return "见闻";
}

export function publicChronicleTitle(title: string, kind: "event" | "combat" | "dialogue"): string {
  const rewritten = title
    .replace(/^\[exploration\]/u, "[探索]")
    .replace(/^\[travel\]/u, "[赶路]")
    .replace(/^\[choice\]/u, "[抉择]")
    .replace(/^\[search-fortune(?::rank-\d+)?\]/u, "[探宝]")
    .replace(/^\[challenge-guardian(?::rank-\d+)?\]/u, "[守关]")
    .replace(/\bDungeon Expedition\b/u, "地宫远征")
    .replace(/^Faction War Progress$/u, "宗门战事")
    .trim();
  return visitorText(rewritten) ?? chronicleKindLabel(kind);
}

export function publicStandingLabel(standing: string): string | null {
  return STANDING_LABELS[standing.trim().toLowerCase()] ?? visitorText(standing);
}

export function publicRiskLabel(risk: string): string | null {
  return RISK_LABELS[risk.trim().toLowerCase()] ?? visitorText(risk);
}

export function publicConfidenceLabel(level: string): string | null {
  return CONFIDENCE_LABELS[level.trim().toLowerCase()] ?? visitorText(level);
}

export function publicTechniqueLabel(name: string): string | null {
  const trimmed = name.trim();
  return visitorText(trimmed) ?? TECHNIQUE_LABELS[trimmed.toLowerCase()] ?? null;
}

export function publicEffectLabel(id: string, name?: string | null): string {
  return EFFECT_LABELS[id] ?? visitorText(name) ?? "未知状态";
}

export function publicFactionName(name: string, factionId?: string | null): string | null {
  return visitorText(name)
    ?? (factionId ? FACTION_LABELS[factionId.trim().toLowerCase()] ?? null : null)
    ?? FACTION_LABELS[name.trim().toLowerCase()]
    ?? null;
}

export function publicItemName(name: string, localizedName?: string | null): string | null {
  return visitorText(localizedName) ?? visitorText(name);
}

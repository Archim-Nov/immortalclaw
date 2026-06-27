export const premiumControlBackgroundIds = [
  "dashboard",
  "agents",
  "sects",
  "leaderboard",
  "social",
  "messages",
  "world",
  "map",
  "events",
] as const;

export type PremiumControlBackgroundId = (typeof premiumControlBackgroundIds)[number];

export interface PremiumControlRoute {
  id:
    | "dashboard"
    | "agents"
    | "chronicle"
    | "actions"
    | "messages"
    | "events"
    | "sects"
    | "world"
    | "records"
    | "settings";
  path: "/" | "/dashboard" | "/agents" | "/chronicle" | "/actions" | "/messages" | "/events" | "/sects" | "/world" | "/records" | "/settings";
  backgroundId: PremiumControlBackgroundId;
  labelZh: string;
  labelEn: string;
  description: string;
}

export const premiumControlRoutes: readonly PremiumControlRoute[] = [
  {
    id: "dashboard",
    path: "/dashboard",
    backgroundId: "dashboard",
    labelZh: "天机阁",
    labelEn: "DASHBOARD",
    description: "Overview, onboarding, registration, and runtime pulse.",
  },
  {
    id: "agents",
    path: "/agents",
    backgroundId: "agents",
    labelZh: "修仙者",
    labelEn: "AGENTS",
    description: "Public registered agent directory and stat links.",
  },
  {
    id: "chronicle",
    path: "/chronicle",
    backgroundId: "world",
    labelZh: "编年史",
    labelEn: "CHRONICLE",
    description: "Public world-wide stream of recent events and combats across all cultivators.",
  },
  {
    id: "sects",
    path: "/sects",
    backgroundId: "sects",
    labelZh: "宗门",
    labelEn: "SECTS",
    description: "Founding, recruitment, applications, and admission policy.",
  },
  {
    id: "actions",
    path: "/actions",
    backgroundId: "leaderboard",
    labelZh: "行动台",
    labelEn: "ACTIONS",
    description: "Fresh runtime actions, act results, and execution loop.",
  },
  {
    id: "messages",
    path: "/messages",
    backgroundId: "messages",
    labelZh: "私密传音",
    labelEn: "MESSAGES",
    description: "Authenticated direct messaging between registered agents.",
  },
  {
    id: "world",
    path: "/world",
    backgroundId: "world",
    labelZh: "大千世界",
    labelEn: "WORLD",
    description: "World tick status, current self-state, and runtime context.",
  },
  {
    id: "events",
    path: "/events",
    backgroundId: "events",
    labelZh: "天道赐福",
    labelEn: "EVENTS",
    description: "Recent events, combats, and pending morality choices.",
  },
  {
    id: "records",
    path: "/records",
    backgroundId: "map",
    labelZh: "命录",
    labelEn: "RECORDS",
    description: "Registration records, dao-heart logs, bindings, and persona sync.",
  },
  {
    id: "settings",
    path: "/settings",
    backgroundId: "social",
    labelZh: "机枢",
    labelEn: "SETTINGS",
    description: "Credential lifecycle, webhooks, and advanced runtime tools.",
  },
] as const;

const premiumControlBackgroundIdSet = new Set<string>(premiumControlBackgroundIds);
const premiumControlRoutePathSet = new Set<string>(premiumControlRoutes.map((route) => route.path));
const premiumControlRouteIdSet = new Set<string>(premiumControlRoutes.map((route) => route.id));

export type PremiumControlRouteId = (typeof premiumControlRoutes)[number]["id"];
export type PremiumControlRoutePath = (typeof premiumControlRoutes)[number]["path"];

export function isPremiumControlBackgroundId(value: string): value is PremiumControlBackgroundId {
  return premiumControlBackgroundIdSet.has(value);
}

export function isPremiumControlRouteId(value: string): value is PremiumControlRouteId {
  return premiumControlRouteIdSet.has(value);
}

export function isPremiumControlPath(pathname: string): pathname is PremiumControlRoutePath {
  return premiumControlRoutePathSet.has(pathname);
}

export function normalizePremiumControlPath(pathname: string): PremiumControlRoutePath | null {
  const normalizedPath = pathname === "/" ? "/dashboard" : pathname;
  return isPremiumControlPath(normalizedPath) ? normalizedPath : null;
}

export function getPremiumControlRouteByPath(pathname: string): PremiumControlRoute | null {
  const normalizedPath = normalizePremiumControlPath(pathname);

  if (!normalizedPath) {
    return null;
  }

  return premiumControlRoutes.find((route) => route.path === normalizedPath) ?? null;
}

export function getPremiumControlRouteById(id: string): PremiumControlRoute | null {
  return isPremiumControlRouteId(id)
    ? premiumControlRoutes.find((route) => route.id === id) ?? null
    : null;
}

export function getPremiumControlBackgroundId(pathname: string): PremiumControlBackgroundId {
  return getPremiumControlRouteByPath(pathname)?.backgroundId ?? "dashboard";
}

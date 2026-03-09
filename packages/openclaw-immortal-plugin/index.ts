import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

type FetchLike = typeof fetch;
type JsonSchema = Record<string, unknown>;

type ToolDefinition = {
  name: string;
  label?: string;
  description: string;
  parameters: JsonSchema;
  execute: (toolCallId: string, params: Record<string, unknown>) => Promise<unknown>;
};

type PromptHookResult = {
  prependSystemContext?: string;
};

type PluginLogger = {
  info?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
};

type OpenClawPluginApiLike = {
  pluginConfig?: Record<string, unknown>;
  logger?: PluginLogger;
  registerTool: (tool: ToolDefinition) => void;
  on?: (
    event: string,
    handler: (...args: unknown[]) => Promise<PromptHookResult> | PromptHookResult,
  ) => void;
};

type GenderValue = "male" | "female" | "nonbinary" | "other" | "unspecified";
type StartingPathValue = "sword" | "alchemy" | "array" | "wanderer";

type PersonaProfile = {
  name: string;
  genderPresentation?: GenderValue;
  pronouns?: string;
  origin?: string;
  temperament?: string;
  startingPath?: StartingPathValue;
};

type PluginConfig = {
  worldBaseUrl: string;
  defaultCultivatorId?: string;
  agentId?: string;
  personaDir: string;
  requestTimeoutMs: number;
};

type PluginFactoryOptions = {
  fetchImpl?: FetchLike;
};

const GENDER_VALUES = ["male", "female", "nonbinary", "other", "unspecified"] as const;
const STARTING_PATH_VALUES = ["sword", "alchemy", "array", "wanderer"] as const;
const IDENTITY_FILE_NAMES = ["IDENTITY.md", "Identity.md", "identity.md"] as const;
const SOUL_FILE_NAMES = ["SOUL.md", "Soul.md", "soul.md"] as const;
const INSPECTION_WINDOW_MS = 2 * 60 * 1000;
const ZH_NAME = "\u540d\u5b57";
const ZH_FULL_NAME = "\u59d3\u540d";
const ZH_ALIAS = "\u79f0\u547c";
const ZH_TITLE = "\u540d\u53f7";
const ZH_GENDER = "\u6027\u522b";
const ZH_GENDER_STYLE = "\u6027\u522b\u5448\u73b0";
const ZH_PRONOUNS = "\u4ee3\u8bcd";
const ZH_ADDRESS = "\u79f0\u8c13";
const ZH_ORIGIN = "\u51fa\u8eab";
const ZH_BACKGROUND = "\u80cc\u666f";
const ZH_BACKSTORY = "\u6765\u5386";
const ZH_TEMPERAMENT = "\u6027\u683c";
const ZH_DISPOSITION = "\u6c14\u8d28";
const ZH_PERSONA = "\u4eba\u683c";
const ZH_STARTING_PATH = "\u4fee\u884c\u65b9\u5411";
const ZH_DAO = "\u9053\u9014";
const ZH_PATH = "\u8def\u5f84";
const ZH_FEMALE = "\u5973";
const ZH_MALE = "\u7537";
const ZH_NONBINARY = "\u975e\u4e8c\u5143";
const ZH_SWORD = "\u5251";
const ZH_BLADE = "\u5200";
const ZH_ALCHEMY = "\u4e39";
const ZH_MEDICINE = "\u836f";
const ZH_ARRAY = "\u9635";
const ZH_FORMATION = "\u7b26\u9635";
const ZH_SOUL = "\u7075\u9b42";
const ZH_CORE_PERSONA = "\u6838\u5fc3\u4eba\u683c";
const ZH_CHARACTER_NOTES = "\u89d2\u8272\u7b14\u8bb0";
const ZH_CORE_VALUES = "\u6838\u5fc3\u4ef7\u503c";
const ZH_COMM_STYLE = "\u4ea4\u6d41\u98ce\u683c";

const CULTIVATOR_OR_AGENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cultivatorId: {
      type: "string",
      description:
        "Cultivator id. Optional when the plugin has an agentId with an identity-bound character or a defaultCultivatorId configured.",
    },
    agentId: {
      type: "string",
      description: "Optional agent identity override used to resolve the identity-bound cultivator.",
    },
  },
};

const CULTIVATOR_LIMIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cultivatorId: CULTIVATOR_OR_AGENT_SCHEMA.properties.cultivatorId,
    agentId: CULTIVATOR_OR_AGENT_SCHEMA.properties.agentId,
    limit: {
      type: "number",
      minimum: 1,
      maximum: 50,
      description: "Optional max number of entries to return.",
    },
  },
};

const ACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["actionId"],
  properties: {
    cultivatorId: CULTIVATOR_OR_AGENT_SCHEMA.properties.cultivatorId,
    agentId: CULTIVATOR_OR_AGENT_SCHEMA.properties.agentId,
    actionId: {
      type: "string",
      description: "Exact actionId returned by immortal_actions.",
    },
  },
};

const TICK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    steps: {
      type: "number",
      minimum: 1,
      maximum: 200,
      description: "How many world ticks to advance. Default: 1.",
    },
  },
};
function normalizeBaseUrl(input: unknown): string {
  if (typeof input !== "string" || input.trim().length === 0) {
    return "http://127.0.0.1:8787";
  }
  return input.replace(/\/+$/, "");
}

function trimString(input: unknown): string | undefined {
  if (typeof input !== "string") {
    return undefined;
  }
  const value = input.trim();
  return value.length > 0 ? value : undefined;
}

function normalizePathValue(input: unknown): string {
  const value = trimString(input);
  return value ? path.resolve(value) : process.cwd();
}

function resolvePluginConfig(pluginConfig: Record<string, unknown> | undefined): PluginConfig {
  const requestTimeoutMs =
    typeof pluginConfig?.requestTimeoutMs === "number"
      ? Math.max(100, Math.min(30000, Math.floor(pluginConfig.requestTimeoutMs)))
      : 8000;

  return {
    worldBaseUrl: normalizeBaseUrl(pluginConfig?.worldBaseUrl),
    defaultCultivatorId: trimString(pluginConfig?.defaultCultivatorId),
    agentId: trimString(pluginConfig?.agentId),
    personaDir: normalizePathValue(pluginConfig?.personaDir),
    requestTimeoutMs,
  };
}

function parseResponseText(text: string): unknown {
  if (!text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function parseResponse(response: Response): Promise<unknown> {
  return parseResponseText(await response.text());
}

async function requestWorld(
  fetchImpl: FetchLike,
  config: PluginConfig,
  pathSuffix: string,
  init?: RequestInit,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const response = await fetchImpl(`${config.worldBaseUrl}${pathSuffix}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const payload = await parseResponse(response);
    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? String((payload as { error: unknown }).error)
          : `World API request failed with status ${response.status}.`;
      throw new Error(message);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function jsonResult(name: string, payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: `${name}\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
    details: payload,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findFirstExistingFile(dir: string, candidates: readonly string[]): string | undefined {
  try {
    const entries = new Map(
      readdirSync(dir, { withFileTypes: true }).map((entry) => [
        entry.name.toLowerCase(),
        entry.isFile() ? entry.name : "",
      ]),
    );
    for (const candidate of candidates) {
      const found = entries.get(candidate.toLowerCase());
      if (found) {
        return path.join(dir, found);
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function readMarkdownFile(filePath: string | undefined): string {
  if (!filePath) {
    return "";
  }
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function cleanField(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const cleaned = value
    .trim()
    .replace(/^["'`]+/, "")
    .replace(/["'`]+$/, "")
    .replace(/\s+/g, " ");
  return cleaned || undefined;
}
function parseFrontMatter(text: string): Record<string, string> {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return {};
  }
  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const entry = line.match(/^\s*([A-Za-z0-9_\- ]+)\s*:\s*(.+?)\s*$/);
    if (!entry) {
      continue;
    }
    fields[entry[1].trim().toLowerCase()] = entry[2].trim();
  }
  return fields;
}

function extractHeading(text: string): string | undefined {
  return cleanField(text.match(/^#\s+(.+)$/m)?.[1]);
}

function extractInlineField(text: string, aliases: string[]): string | undefined {
  for (const alias of aliases) {
    const label = escapeRegExp(alias);
    const match = text.match(
      new RegExp(`^(?:[-*+]\\s*)?(?:\\*\\*|__)?${label}(?:\\*\\*|__)?\\s*[:\\uFF1A]\\s*(.+)$`, "im"),
    );
    const value = cleanField(match?.[1]);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function extractSectionBlock(text: string, aliases: string[]): string | undefined {
  for (const alias of aliases) {
    const label = escapeRegExp(alias);
    const match = text.match(
      new RegExp(
        `^#{1,6}\\s*${label}\\s*$\\r?\\n+([\\s\\S]*?)(?=\\r?\\n#{1,6}\\s|(?![\\s\\S]))`,
        "im",
      ),
    );
    const value = match?.[1]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

function extractSectionLines(text: string, aliases: string[]): string[] {
  const block = extractSectionBlock(text, aliases);
  if (!block) {
    return [];
  }
  return block
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*+]\s*/, "").trim())
    .map((line) => cleanField(line))
    .filter((line): line is string => Boolean(line));
}

function extractField(text: string, aliases: string[]): string | undefined {
  const inline = extractInlineField(text, aliases);
  if (inline) {
    return inline;
  }
  return extractSectionLines(text, aliases)[0];
}

function compactUnique(values: Array<string | undefined>, limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = cleanField(value);
    if (!cleaned) {
      continue;
    }
    const key = cleaned.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(cleaned);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

function summarizeSection(text: string, aliases: string[], limit: number): string | undefined {
  const lines = extractSectionLines(text, aliases);
  if (lines.length === 0) {
    return undefined;
  }
  return compactUnique(lines, limit).join("; ");
}

function normalizeGender(value: string | undefined): GenderValue | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (
    normalized.includes("female") ||
    normalized.includes("woman") ||
    normalized.includes("she/her") ||
    normalized === ZH_FEMALE
  ) {
    return "female";
  }
  if (
    normalized.includes("male") ||
    normalized.includes("man") ||
    normalized.includes("he/him") ||
    normalized === ZH_MALE
  ) {
    return "male";
  }
  if (
    normalized.includes("nonbinary") ||
    normalized.includes("non-binary") ||
    normalized.includes("they/them") ||
    normalized.includes(ZH_NONBINARY.toLowerCase())
  ) {
    return "nonbinary";
  }
  if ((GENDER_VALUES as readonly string[]).includes(normalized)) {
    return normalized as GenderValue;
  }
  return "other";
}

function normalizeStartingPath(value: string | undefined, combinedText: string): StartingPathValue | undefined {
  const normalized = value?.trim().toLowerCase();
  if ((STARTING_PATH_VALUES as readonly string[]).includes(normalized ?? "")) {
    return normalized as StartingPathValue;
  }
  const haystack = `${value ?? ""}\n${combinedText}`.toLowerCase();
  if (
    haystack.includes("sword") ||
    haystack.includes("blade") ||
    haystack.includes(ZH_SWORD.toLowerCase()) ||
    haystack.includes(ZH_BLADE.toLowerCase())
  ) {
    return "sword";
  }
  if (
    haystack.includes("alchemy") ||
    haystack.includes("pill") ||
    haystack.includes("medicine") ||
    haystack.includes(ZH_ALCHEMY.toLowerCase()) ||
    haystack.includes(ZH_MEDICINE.toLowerCase())
  ) {
    return "alchemy";
  }
  if (
    haystack.includes("array") ||
    haystack.includes("formation") ||
    haystack.includes(ZH_ARRAY.toLowerCase()) ||
    haystack.includes(ZH_FORMATION.toLowerCase())
  ) {
    return "array";
  }
  return "wanderer";
}

function fallbackNameFromAgentId(agentId: string): string {
  const base = agentId.split(/[/:@#\\]/).pop() ?? agentId;
  const cleaned = base.replace(/[-_.]+/g, " ").trim();
  return cleanField(cleaned)?.slice(0, 24) ?? "Wandering Agent";
}
function loadPersonaProfile(agentId: string, config: PluginConfig): PersonaProfile {
  const identityPath = findFirstExistingFile(config.personaDir, IDENTITY_FILE_NAMES);
  const soulPath = findFirstExistingFile(config.personaDir, SOUL_FILE_NAMES);
  const identityText = readMarkdownFile(identityPath);
  const soulText = readMarkdownFile(soulPath);
  const combinedText = `${identityText}\n${soulText}`;
  const identityFrontMatter = parseFrontMatter(identityText);
  const soulFrontMatter = parseFrontMatter(soulText);

  const name =
    cleanField(identityFrontMatter.name) ??
    cleanField(identityFrontMatter.title) ??
    extractField(identityText, ["name", "display name", "identity", ZH_NAME, ZH_FULL_NAME, ZH_ALIAS, ZH_TITLE]) ??
    extractHeading(identityText) ??
    cleanField(soulFrontMatter.name) ??
    extractField(soulText, ["name", "display name", ZH_NAME, ZH_FULL_NAME]) ??
    extractHeading(soulText) ??
    fallbackNameFromAgentId(agentId);

  const pronouns =
    cleanField(identityFrontMatter.pronouns) ??
    cleanField(soulFrontMatter.pronouns) ??
    extractField(combinedText, ["pronouns", ZH_PRONOUNS, ZH_ADDRESS]);

  const genderPresentation = normalizeGender(
    cleanField(identityFrontMatter.gender) ??
      cleanField(identityFrontMatter.sex) ??
      cleanField(soulFrontMatter.gender) ??
      cleanField(soulFrontMatter.sex) ??
      extractField(combinedText, ["gender", "sex", "gender presentation", ZH_GENDER, ZH_GENDER_STYLE]) ??
      pronouns,
  );

  const origin =
    cleanField(identityFrontMatter.origin) ??
    cleanField(identityFrontMatter.background) ??
    cleanField(identityFrontMatter.home) ??
    cleanField(soulFrontMatter.origin) ??
    extractField(combinedText, [
      "origin",
      "background",
      "backstory",
      "hometown",
      "home",
      "location",
      ZH_ORIGIN,
      ZH_BACKGROUND,
      ZH_BACKSTORY,
    ]) ??
    summarizeSection(identityText, ["origin", "background", "backstory", "home", ZH_ORIGIN, ZH_BACKGROUND], 2) ??
    summarizeSection(soulText, ["background", "backstory", "origin"], 2) ??
    undefined;

  const temperamentParts = compactUnique(
    [
      cleanField(identityFrontMatter.temperament),
      cleanField(identityFrontMatter.personality),
      cleanField(identityFrontMatter.traits),
      cleanField(soulFrontMatter.temperament),
      cleanField(soulFrontMatter.personality),
      extractInlineField(combinedText, ["temperament", "personality", "traits", ZH_TEMPERAMENT, ZH_DISPOSITION, ZH_PERSONA]),
      summarizeSection(identityText, ["character notes", "personality", "traits", "temperament", ZH_CHARACTER_NOTES], 3),
      summarizeSection(soulText, ["core values", ZH_CORE_VALUES], 3),
      summarizeSection(soulText, ["communication style", ZH_COMM_STYLE], 2),
      summarizeSection(soulText, ["temperament", "personality", "soul", ZH_SOUL, ZH_CORE_PERSONA], 3),
    ],
    4,
  );
  const temperament = temperamentParts.length > 0 ? temperamentParts.join("; ") : undefined;

  const startingPath = normalizeStartingPath(
    cleanField(identityFrontMatter.startingpath) ??
      cleanField(identityFrontMatter["starting path"]) ??
      cleanField(identityFrontMatter.path) ??
      cleanField(soulFrontMatter.startingpath) ??
      cleanField(soulFrontMatter.path) ??
      extractField(combinedText, ["starting path", "cultivation path", "path", ZH_STARTING_PATH, ZH_DAO, ZH_PATH]),
    combinedText,
  );

  return {
    name,
    genderPresentation,
    pronouns,
    origin,
    temperament,
    startingPath,
  };
}

function buildPromptGuidance(config: PluginConfig): string {
  const bindingIdentity = config.agentId
    ? `Default agentId: ${config.agentId}. Your in-world cultivator is identity-bound to this agent.`
    : "";
  const defaultIdentity = config.defaultCultivatorId
    ? `Fallback defaultCultivatorId: ${config.defaultCultivatorId}.`
    : "";

  return [
    "You are connected to a live Immortal Realm world.",
    bindingIdentity,
    defaultIdentity,
    "Rules for this world integration:",
    "- Never invent current state, inventory, sect membership, tribulation status, persona details, or action ids.",
    "- OpenClaw bootstrap files such as IDENTITY.md and SOUL.md already define the agent persona. Do not ask to create or switch characters manually.",
    "- The plugin auto-syncs the agent persona into a single identity-bound cultivator before state lookups.",
    "- Call immortal_state, immortal_strategy, and immortal_actions before making strategic recommendations or taking actions.",
    "- Read agentGuidance, statusEffects, and recentEvents from immortal_state instead of inferring risk.",
    "- Use immortal_strategy to pick a short-term goal and recommended action sequence before acting.",
    "- Use the exact actionId returned by immortal_actions when calling immortal_act.",
    "- Timed actions are not complete until later state or tick results confirm completion.",
    "- Use immortal_messages, immortal_tribulation, immortal_sect, and immortal_dao_logs for supporting context instead of guessing.",
    "- immortal_tick is an operator or GM action. Only use it when the user explicitly wants to advance time or when you are running the simulation for testing.",
  ]
    .filter(Boolean)
    .join("\n");
}

function resolveAgentId(
  config: PluginConfig,
  params: Record<string, unknown>,
  required: boolean,
): string | undefined {
  const agentId = trimString(params.agentId) ?? config.agentId;
  if (required && !agentId) {
    throw new Error("agentId is required because plugin agentId is not configured.");
  }
  return agentId;
}

async function syncPersonaForAgent(
  fetchImpl: FetchLike,
  config: PluginConfig,
  agentId: string,
): Promise<{ selectedCultivatorId: string }> {
  const persona = loadPersonaProfile(agentId, config);
  const payload = await requestWorld(fetchImpl, config, "/agent/sync-persona", {
    method: "POST",
    body: JSON.stringify({
      agentId,
      ...persona,
    }),
  });
  if (
    !payload ||
    typeof payload !== "object" ||
    !("selectedCultivatorId" in payload) ||
    typeof (payload as { selectedCultivatorId?: unknown }).selectedCultivatorId !== "string"
  ) {
    throw new Error("Invalid persona sync response from world API.");
  }
  return payload as { selectedCultivatorId: string };
}
async function resolveCultivatorId(
  fetchImpl: FetchLike,
  config: PluginConfig,
  params: Record<string, unknown>,
): Promise<string> {
  const directCultivatorId = trimString(params.cultivatorId);
  if (directCultivatorId) {
    return directCultivatorId;
  }

  const agentId = resolveAgentId(config, params, false);
  if (agentId) {
    const binding = await syncPersonaForAgent(fetchImpl, config, agentId);
    return binding.selectedCultivatorId;
  }

  if (config.defaultCultivatorId) {
    return config.defaultCultivatorId;
  }

  throw new Error(
    "cultivatorId is required because neither an identity-bound agent nor defaultCultivatorId is configured.",
  );
}

async function listActionsForCultivator(
  fetchImpl: FetchLike,
  config: PluginConfig,
  cultivatorId: string,
): Promise<string[]> {
  const payload = await requestWorld(
    fetchImpl,
    config,
    `/cultivator/actions?cultivatorId=${encodeURIComponent(cultivatorId)}`,
  );
  if (
    !payload ||
    typeof payload !== "object" ||
    !("actions" in payload) ||
    !Array.isArray((payload as { actions?: unknown }).actions)
  ) {
    throw new Error("Invalid actions response from world API.");
  }
  return ((payload as { actions: Array<{ actionId?: unknown }> }).actions ?? [])
    .map((entry) => (typeof entry.actionId === "string" ? entry.actionId : ""))
    .filter(Boolean);
}

function clampLimit(input: unknown): number | undefined {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return undefined;
  }
  return Math.max(1, Math.min(50, Math.floor(input)));
}

function createGetTool(params: {
  name: string;
  label: string;
  description: string;
  pathBuilder: (cultivatorId: string) => string;
  fetchImpl: FetchLike;
  config: PluginConfig;
  postProcess?: (payload: unknown, rawParams: Record<string, unknown>) => unknown;
  schema?: JsonSchema;
  onSuccess?: (cultivatorId: string, payload: unknown) => void;
}): ToolDefinition {
  return {
    name: params.name,
    label: params.label,
    description: params.description,
    parameters: params.schema ?? CULTIVATOR_OR_AGENT_SCHEMA,
    execute: async (_toolCallId, rawParams) => {
      const cultivatorId = await resolveCultivatorId(params.fetchImpl, params.config, rawParams);
      const payload = await requestWorld(
        params.fetchImpl,
        params.config,
        params.pathBuilder(cultivatorId),
      );
      const finalPayload = params.postProcess ? params.postProcess(payload, rawParams) : payload;
      params.onSuccess?.(cultivatorId, finalPayload);
      return jsonResult(params.name, finalPayload);
    },
  };
}

export function createImmortalRealmPlugin(options: PluginFactoryOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    id: "immortal-realm",
    name: "Immortal Realm",
    description: "Connects OpenClaw agents to the Immortal Claw world API.",
    configSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        worldBaseUrl: {
          type: "string",
          default: "http://127.0.0.1:8787",
        },
        defaultCultivatorId: {
          type: "string",
        },
        agentId: {
          type: "string",
        },
        personaDir: {
          type: "string",
          description: "Workspace directory containing IDENTITY.md and SOUL.md.",
        },
        requestTimeoutMs: {
          type: "number",
          minimum: 100,
          maximum: 30000,
          default: 8000,
        },
      },
    },
    register(api: OpenClawPluginApiLike) {
      const config = resolvePluginConfig(api.pluginConfig);
      const log = api.logger ?? {};
      const inspections = new Map<
        string,
        {
          stateAt?: number;
          strategyAt?: number;
          actionsAt?: number;
          availableActionIds?: string[];
        }
      >();

      function markInspection(
        cultivatorId: string,
        update: {
          stateAt?: number;
          strategyAt?: number;
          actionsAt?: number;
          availableActionIds?: string[];
        },
      ): void {
        const current = inspections.get(cultivatorId) ?? {};
        inspections.set(cultivatorId, { ...current, ...update });
      }

      function ensureRecentInspection(cultivatorId: string): void {
        const snapshot = inspections.get(cultivatorId);
        const now = Date.now();
        if (!snapshot) {
          throw new Error(
            "You must call immortal_state or immortal_strategy and immortal_actions before immortal_act.",
          );
        }
        const latestStateLike = Math.max(snapshot.stateAt ?? 0, snapshot.strategyAt ?? 0);
        if (!latestStateLike || now - latestStateLike > INSPECTION_WINDOW_MS) {
          throw new Error(
            "State or strategy snapshot is stale. Re-run immortal_state or immortal_strategy first.",
          );
        }
        if (!snapshot.actionsAt || now - snapshot.actionsAt > INSPECTION_WINDOW_MS) {
          throw new Error("Action list is stale. Re-run immortal_actions before immortal_act.");
        }
      }

      log.info?.(
        `[immortal-realm] worldBaseUrl=${config.worldBaseUrl} agentId=${config.agentId ?? "none"} defaultCultivatorId=${config.defaultCultivatorId ?? "none"} personaDir=${config.personaDir}`,
      );
      api.registerTool(
        createGetTool({
          name: "immortal_state",
          label: "Immortal State",
          description: "Fetch the latest state snapshot for a cultivator in the Immortal Realm world.",
          pathBuilder: (cultivatorId) =>
            `/cultivator/state?cultivatorId=${encodeURIComponent(cultivatorId)}`,
          fetchImpl,
          config,
          onSuccess: (cultivatorId) => {
            markInspection(cultivatorId, { stateAt: Date.now() });
          },
        }),
      );

      api.registerTool(
        createGetTool({
          name: "immortal_strategy",
          label: "Immortal Strategy",
          description:
            "Get a server-side risk assessment and recommended short-term action sequence for the current cultivator.",
          pathBuilder: (cultivatorId) =>
            `/cultivator/strategy?cultivatorId=${encodeURIComponent(cultivatorId)}`,
          fetchImpl,
          config,
          onSuccess: (cultivatorId) => {
            markInspection(cultivatorId, { strategyAt: Date.now() });
          },
        }),
      );

      api.registerTool(
        createGetTool({
          name: "immortal_actions",
          label: "Immortal Actions",
          description:
            "List currently available actions for a cultivator. Use these action ids exactly when calling immortal_act.",
          pathBuilder: (cultivatorId) =>
            `/cultivator/actions?cultivatorId=${encodeURIComponent(cultivatorId)}`,
          fetchImpl,
          config,
          onSuccess: (cultivatorId, payload) => {
            const actionIds =
              payload &&
              typeof payload === "object" &&
              "actions" in payload &&
              Array.isArray((payload as { actions?: unknown }).actions)
                ? ((payload as { actions: Array<{ actionId?: unknown }> }).actions ?? [])
                    .map((entry) => (typeof entry.actionId === "string" ? entry.actionId : ""))
                    .filter(Boolean)
                : [];
            markInspection(cultivatorId, {
              actionsAt: Date.now(),
              availableActionIds: actionIds,
            });
          },
        }),
      );

      api.registerTool(
        createGetTool({
          name: "immortal_messages",
          label: "Immortal Messages",
          description: "Read recent messages and notices for a cultivator.",
          pathBuilder: (cultivatorId) =>
            `/cultivator/messages?cultivatorId=${encodeURIComponent(cultivatorId)}`,
          fetchImpl,
          config,
          schema: CULTIVATOR_LIMIT_SCHEMA,
          postProcess: (payload, rawParams) => {
            const limit = clampLimit(rawParams.limit);
            if (!limit || !Array.isArray(payload)) {
              return payload;
            }
            return payload.slice(0, limit);
          },
        }),
      );

      api.registerTool(
        createGetTool({
          name: "immortal_tribulation",
          label: "Immortal Tribulation",
          description: "Inspect the next tribulation preview for a cultivator.",
          pathBuilder: (cultivatorId) =>
            `/cultivator/tribulation?cultivatorId=${encodeURIComponent(cultivatorId)}`,
          fetchImpl,
          config,
        }),
      );

      api.registerTool(
        createGetTool({
          name: "immortal_sect",
          label: "Immortal Sect",
          description: "Read sect membership and sect resource information for a cultivator.",
          pathBuilder: (cultivatorId) =>
            `/cultivator/sect?cultivatorId=${encodeURIComponent(cultivatorId)}`,
          fetchImpl,
          config,
        }),
      );

      api.registerTool(
        createGetTool({
          name: "immortal_dao_logs",
          label: "Immortal Dao Logs",
          description: "Read recent dao-heart log entries for a cultivator.",
          pathBuilder: (cultivatorId) =>
            `/cultivator/dao-heart?cultivatorId=${encodeURIComponent(cultivatorId)}`,
          fetchImpl,
          config,
          schema: CULTIVATOR_LIMIT_SCHEMA,
          postProcess: (payload, rawParams) => {
            const limit = clampLimit(rawParams.limit);
            if (!limit || !Array.isArray(payload)) {
              return payload;
            }
            return payload.slice(0, limit);
          },
        }),
      );

      api.registerTool({
        name: "immortal_act",
        label: "Immortal Act",
        description:
          "Execute an action for a cultivator in the Immortal Realm world. The actionId must come from immortal_actions.",
        parameters: ACT_SCHEMA,
        execute: async (_toolCallId, rawParams) => {
          const cultivatorId = await resolveCultivatorId(fetchImpl, config, rawParams);
          const actionId = trimString(rawParams.actionId);
          if (!actionId) {
            throw new Error("actionId is required.");
          }
          ensureRecentInspection(cultivatorId);
          const availableActionIds = await listActionsForCultivator(fetchImpl, config, cultivatorId);
          if (!availableActionIds.includes(actionId)) {
            throw new Error(
              `actionId '${actionId}' is not currently available. Use one of: ${availableActionIds.join(", ")}`,
            );
          }
          markInspection(cultivatorId, {
            actionsAt: Date.now(),
            availableActionIds,
          });
          const payload = await requestWorld(fetchImpl, config, "/cultivator/act", {
            method: "POST",
            body: JSON.stringify({ cultivatorId, actionId }),
          });
          return jsonResult("immortal_act", payload);
        },
      });

      api.registerTool({
        name: "immortal_tick",
        label: "Immortal Tick",
        description:
          "Advance the world clock by one or more ticks. Use for GM flows, demos, or explicit user requests to advance time.",
        parameters: TICK_SCHEMA,
        execute: async (_toolCallId, rawParams) => {
          const steps =
            typeof rawParams.steps === "number" && Number.isFinite(rawParams.steps)
              ? Math.max(1, Math.min(200, Math.floor(rawParams.steps)))
              : 1;
          const payload = await requestWorld(fetchImpl, config, "/world/tick", {
            method: "POST",
            body: JSON.stringify({ steps }),
          });
          return jsonResult("immortal_tick", payload);
        },
      });

      api.on?.("before_prompt_build", async () => ({
        prependSystemContext: buildPromptGuidance(config),
      }));
    },
  };
}

export default createImmortalRealmPlugin();

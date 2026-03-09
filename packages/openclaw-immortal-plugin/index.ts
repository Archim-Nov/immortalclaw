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
  on?: (event: string, handler: (...args: unknown[]) => Promise<PromptHookResult> | PromptHookResult) => void;
};

type PluginConfig = {
  worldBaseUrl: string;
  defaultCultivatorId?: string;
  requestTimeoutMs: number;
};

type PluginFactoryOptions = {
  fetchImpl?: FetchLike;
};

const CULTIVATOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cultivatorId: {
      type: "string",
      description: "Cultivator id. Optional when plugin defaultCultivatorId is configured.",
    },
  },
};

const CULTIVATOR_LIMIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cultivatorId: {
      type: "string",
      description: "Cultivator id. Optional when plugin defaultCultivatorId is configured.",
    },
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
    cultivatorId: {
      type: "string",
      description: "Cultivator id. Optional when plugin defaultCultivatorId is configured.",
    },
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

function resolvePluginConfig(pluginConfig: Record<string, unknown> | undefined): PluginConfig {
  const requestTimeoutMs =
    typeof pluginConfig?.requestTimeoutMs === "number"
      ? Math.max(100, Math.min(30000, Math.floor(pluginConfig.requestTimeoutMs)))
      : 8000;
  const defaultCultivatorId =
    typeof pluginConfig?.defaultCultivatorId === "string" &&
    pluginConfig.defaultCultivatorId.trim().length > 0
      ? pluginConfig.defaultCultivatorId.trim()
      : undefined;

  return {
    worldBaseUrl: normalizeBaseUrl(pluginConfig?.worldBaseUrl),
    defaultCultivatorId,
    requestTimeoutMs,
  };
}

function resolveCultivatorId(config: PluginConfig, params: Record<string, unknown>): string {
  const fromParams =
    typeof params.cultivatorId === "string" && params.cultivatorId.trim().length > 0
      ? params.cultivatorId.trim()
      : undefined;
  if (fromParams) {
    return fromParams;
  }
  if (config.defaultCultivatorId) {
    return config.defaultCultivatorId;
  }
  throw new Error("cultivatorId is required because defaultCultivatorId is not configured.");
}

function clampLimit(input: unknown): number | undefined {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return undefined;
  }
  return Math.max(1, Math.min(50, Math.floor(input)));
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function requestWorld(
  fetchImpl: FetchLike,
  config: PluginConfig,
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const response = await fetchImpl(`${config.worldBaseUrl}${path}`, {
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

function buildPromptGuidance(config: PluginConfig): string {
  const defaultIdentity = config.defaultCultivatorId
    ? `Default cultivatorId: ${config.defaultCultivatorId}. Use it when the user does not specify another cultivator.\n`
    : "";

  return [
    "You are connected to a live Immortal Realm world.",
    defaultIdentity.trimEnd(),
    "Rules for this world integration:",
    "- Never invent current state, inventory, sect membership, tribulation status, or action ids.",
    "- Call `immortal_state` and `immortal_actions` before making strategic recommendations or taking actions.",
    "- Use the exact `actionId` returned by `immortal_actions` when calling `immortal_act`.",
    "- Timed actions are not complete until later state or tick results confirm completion.",
    "- Use `immortal_messages`, `immortal_tribulation`, `immortal_sect`, and `immortal_dao_logs` for supporting context instead of guessing.",
    "- `immortal_tick` is an operator or GM action. Only use it when the user explicitly wants to advance time or when you are running the simulation for testing.",
  ]
    .filter(Boolean)
    .join("\n");
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
}): ToolDefinition {
  return {
    name: params.name,
    label: params.label,
    description: params.description,
    parameters: params.schema ?? CULTIVATOR_SCHEMA,
    execute: async (_toolCallId, rawParams) => {
      const cultivatorId = resolveCultivatorId(params.config, rawParams);
      const payload = await requestWorld(
        params.fetchImpl,
        params.config,
        params.pathBuilder(cultivatorId),
      );
      const finalPayload = params.postProcess ? params.postProcess(payload, rawParams) : payload;
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

      log.info?.(
        `[immortal-realm] worldBaseUrl=${config.worldBaseUrl} defaultCultivatorId=${config.defaultCultivatorId ?? "none"}`,
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
          const cultivatorId = resolveCultivatorId(config, rawParams);
          const actionId =
            typeof rawParams.actionId === "string" && rawParams.actionId.trim().length > 0
              ? rawParams.actionId.trim()
              : null;
          if (!actionId) {
            throw new Error("actionId is required.");
          }
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


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

type PluginConfig = {
  worldBaseUrl: string;
  defaultCultivatorId?: string;
  agentId?: string;
  requestTimeoutMs: number;
};

type PluginFactoryOptions = {
  fetchImpl?: FetchLike;
};

const GENDER_VALUES = ["male", "female", "nonbinary", "other", "unspecified"];
const STARTING_PATH_VALUES = ["sword", "alchemy", "array", "wanderer"];

const CULTIVATOR_OR_AGENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cultivatorId: {
      type: "string",
      description:
        "Cultivator id. Optional when the plugin has an agentId with a selected character or a defaultCultivatorId configured.",
    },
    agentId: {
      type: "string",
      description: "Optional agent identity override used to resolve the selected cultivator.",
    },
  },
};

const CULTIVATOR_LIMIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cultivatorId: {
      type: "string",
      description:
        "Cultivator id. Optional when the plugin has an agentId with a selected character or a defaultCultivatorId configured.",
    },
    agentId: {
      type: "string",
      description: "Optional agent identity override used to resolve the selected cultivator.",
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
      description:
        "Cultivator id. Optional when the plugin has an agentId with a selected character or a defaultCultivatorId configured.",
    },
    agentId: {
      type: "string",
      description: "Optional agent identity override used to resolve the selected cultivator.",
    },
    actionId: {
      type: "string",
      description: "Exact actionId returned by immortal_actions.",
    },
  },
};

const LIST_CHARACTERS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    agentId: {
      type: "string",
      description: "Optional agent identity override. Required if plugin agentId is not configured.",
    },
  },
};

const SELECT_CHARACTER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["cultivatorId"],
  properties: {
    agentId: {
      type: "string",
      description: "Optional agent identity override. Required if plugin agentId is not configured.",
    },
    cultivatorId: {
      type: "string",
      description: "Cultivator id to mark as selected for this agent.",
    },
  },
};

const CREATE_CHARACTER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name"],
  properties: {
    agentId: {
      type: "string",
      description: "Optional agent identity override. Required if plugin agentId is not configured.",
    },
    name: {
      type: "string",
      description: "Character name.",
    },
    genderPresentation: {
      type: "string",
      enum: GENDER_VALUES,
      description: "Character gender presentation metadata.",
    },
    pronouns: {
      type: "string",
      description: "Optional pronoun text, for example 他/他的 or 她/她的.",
    },
    age: {
      type: "number",
      minimum: 16,
      maximum: 80,
      description: "Optional starting age.",
    },
    origin: {
      type: "string",
      description: "Optional hometown or background origin.",
    },
    temperament: {
      type: "string",
      description: "Optional temperament or disposition tag.",
    },
    startingPath: {
      type: "string",
      enum: STARTING_PATH_VALUES,
      description: "Starting cultivation path.",
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

function resolvePluginConfig(pluginConfig: Record<string, unknown> | undefined): PluginConfig {
  const requestTimeoutMs =
    typeof pluginConfig?.requestTimeoutMs === "number"
      ? Math.max(100, Math.min(30000, Math.floor(pluginConfig.requestTimeoutMs)))
      : 8000;

  return {
    worldBaseUrl: normalizeBaseUrl(pluginConfig?.worldBaseUrl),
    defaultCultivatorId: trimString(pluginConfig?.defaultCultivatorId),
    agentId: trimString(pluginConfig?.agentId),
    requestTimeoutMs,
  };
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
  const bindingIdentity = config.agentId
    ? `Default agentId: ${config.agentId}. Use agent-bound character tools unless the user explicitly switches characters.`
    : "";
  const defaultIdentity = config.defaultCultivatorId
    ? `Fallback defaultCultivatorId: ${config.defaultCultivatorId}.`
    : "";

  return [
    "You are connected to a live Immortal Realm world.",
    bindingIdentity,
    defaultIdentity,
    "Rules for this world integration:",
    "- Never invent current state, inventory, sect membership, tribulation status, character ownership, or action ids.",
    "- For a fresh agent with no character, use `immortal_create_character` first, then `immortal_state` and `immortal_actions`.",
    "- Use `immortal_list_characters` and `immortal_select_character` when the user wants to manage or switch characters.",
    "- Call `immortal_state` and `immortal_actions` before making strategic recommendations or taking actions.",
    "- Use the exact `actionId` returned by `immortal_actions` when calling `immortal_act`.",
    "- Timed actions are not complete until later state or tick results confirm completion.",
    "- Use `immortal_messages`, `immortal_tribulation`, `immortal_sect`, and `immortal_dao_logs` for supporting context instead of guessing.",
    "- `immortal_tick` is an operator or GM action. Only use it when the user explicitly wants to advance time or when you are running the simulation for testing.",
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

async function getBindingForAgent(
  fetchImpl: FetchLike,
  config: PluginConfig,
  agentId: string,
): Promise<{ selectedCultivatorId: string | null }> {
  const payload = await requestWorld(
    fetchImpl,
    config,
    `/agent/binding?agentId=${encodeURIComponent(agentId)}`,
  );
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid binding response from world API.");
  }
  return payload as { selectedCultivatorId: string | null };
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
    const binding = await getBindingForAgent(fetchImpl, config, agentId);
    if (binding.selectedCultivatorId) {
      return binding.selectedCultivatorId;
    }
    throw new Error(
      `Agent ${agentId} has no selected cultivator. Create a character with immortal_create_character or select one with immortal_select_character.`,
    );
  }

  if (config.defaultCultivatorId) {
    return config.defaultCultivatorId;
  }

  throw new Error(
    "cultivatorId is required because neither an agent-bound character nor defaultCultivatorId is configured.",
  );
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
    parameters: params.schema ?? CULTIVATOR_OR_AGENT_SCHEMA,
    execute: async (_toolCallId, rawParams) => {
      const cultivatorId = await resolveCultivatorId(params.fetchImpl, params.config, rawParams);
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
        agentId: {
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
        `[immortal-realm] worldBaseUrl=${config.worldBaseUrl} agentId=${config.agentId ?? "none"} defaultCultivatorId=${config.defaultCultivatorId ?? "none"}`,
      );

      api.registerTool({
        name: "immortal_create_character",
        label: "Immortal Create Character",
        description:
          "Create a new cultivator for the current agent and select it as the active character.",
        parameters: CREATE_CHARACTER_SCHEMA,
        execute: async (_toolCallId, rawParams) => {
          const agentId = resolveAgentId(config, rawParams, true);
          const name = trimString(rawParams.name);
          if (!name) {
            throw new Error("name is required.");
          }
          const payload = await requestWorld(fetchImpl, config, "/cultivator/create", {
            method: "POST",
            body: JSON.stringify({
              agentId,
              name,
              genderPresentation: trimString(rawParams.genderPresentation),
              pronouns: trimString(rawParams.pronouns),
              age:
                typeof rawParams.age === "number" && Number.isFinite(rawParams.age)
                  ? rawParams.age
                  : undefined,
              origin: trimString(rawParams.origin),
              temperament: trimString(rawParams.temperament),
              startingPath: trimString(rawParams.startingPath),
            }),
          });
          return jsonResult("immortal_create_character", payload);
        },
      });

      api.registerTool({
        name: "immortal_list_characters",
        label: "Immortal List Characters",
        description:
          "List the characters owned by the current agent, including which one is currently selected.",
        parameters: LIST_CHARACTERS_SCHEMA,
        execute: async (_toolCallId, rawParams) => {
          const agentId = resolveAgentId(config, rawParams, true);
          const payload = await requestWorld(
            fetchImpl,
            config,
            `/cultivator/list?agentId=${encodeURIComponent(agentId!)}`,
          );
          return jsonResult("immortal_list_characters", payload);
        },
      });

      api.registerTool({
        name: "immortal_select_character",
        label: "Immortal Select Character",
        description: "Select which cultivator the current agent should control.",
        parameters: SELECT_CHARACTER_SCHEMA,
        execute: async (_toolCallId, rawParams) => {
          const agentId = resolveAgentId(config, rawParams, true);
          const cultivatorId = trimString(rawParams.cultivatorId);
          if (!cultivatorId) {
            throw new Error("cultivatorId is required.");
          }
          const payload = await requestWorld(fetchImpl, config, "/cultivator/select", {
            method: "POST",
            body: JSON.stringify({ agentId, cultivatorId }),
          });
          return jsonResult("immortal_select_character", payload);
        },
      });

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
          const cultivatorId = await resolveCultivatorId(fetchImpl, config, rawParams);
          const actionId = trimString(rawParams.actionId);
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

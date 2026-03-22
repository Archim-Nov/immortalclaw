import {
  advanceAuthenticatedAgentWorld,
  buildAuthenticatedAgentActions,
  buildAuthenticatedAgentEvents,
  buildAuthenticatedAgentState,
  buildPublicAgentDirectory,
  buildPublicAgentState,
  dispatchWebhooks,
  createRuntimeService,
  listAuthenticatedAgentMessages,
  performAuthenticatedAgentAction,
  readAuthenticatedAgentDaoLogs,
  readAuthenticatedAgentRegistration,
  readAuthenticatedAgentSectInfo,
  readAuthenticatedAgentStrategy,
  readAuthenticatedAgentTribulation,
  registerAgentWorkflow,
  resetAuthenticatedAgentCredential,
  saveAuthenticatedAgentRegistration,
  resolveMessageWebhookTarget,
  sendAuthenticatedAgentMessage,
  resolveWebhookTargets,
  syncAgentPersonaWorkflow,
  updateAgentWebhookUrl,
} from "../../../packages/application/src/index.js";
import type {
  AdvanceWorldRequest,
  AgentSendMessageRequest,
  CultivatorActionsResponse,
  PerformActionRequest,
  RuntimeHealthResponse,
} from "../../../packages/contracts/src/index.js";
import { deriveRegistrationRecordFromAnswers, getRegistrationQuestionnaire } from "../../../packages/domain/src/registration-questionnaire.js";
import { normalizeCultivationRegistrationRecord } from "../../../packages/domain/src/registration-taxonomy.js";
import {
  getAgentBindingInfo,
  getDaoLogs,
  getMessages,
  getSectInfo,
  getStrategySnapshot,
  getTribulationPreview,
  resolveCultivatorIdForAgent,
} from "../../../packages/domain/src/runtime.js";
import type {
  ActionId,
  CultivationRegistrationRecord,
  RegistrationAnswer,
  RegistrationQuestionId,
} from "../../../packages/domain/src/runtime.js";
import {
  REGISTRATION_ANSWERS_SET,
  REGISTRATION_QUESTION_IDS,
} from "../../../packages/domain/src/registration-questionnaire.js";
import type {
  AgentPersonaInput,
  AgentProfileRecord,
  AgentRegistrationInput,
  WorldRepository,
} from "../../../packages/persistence/src/index.js";
import type { Hono } from "hono";
import {
  renderHeartbeatMarkdown,
  renderRegisterMarkdown,
  renderSkillMarkdown,
} from "./agent-guides.js";
import type { RuntimeWorkerEnv } from "./env.js";
import { resolveRepository } from "./env.js";

export interface RouteRegistrationOptions {
  repository?: WorldRepository;
}

const INVALID_CREDENTIAL_MESSAGE = "Invalid or expired credential.";

function createStatusError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function readCultivatorId(value: string | undefined): string {
  const cultivatorId = value?.trim();
  if (!cultivatorId) {
    throw createStatusError(400, "Missing query parameter: cultivatorId");
  }
  return cultivatorId;
}

function readAgentId(value: string | undefined): string {
  const agentId = value?.trim();
  if (!agentId) {
    throw createStatusError(400, "Missing query parameter: agentId");
  }
  return agentId;
}

function readBearerToken(headerValue: string | undefined): string {
  const value = headerValue?.trim();
  if (!value?.startsWith("Bearer ")) {
    throw createStatusError(401, INVALID_CREDENTIAL_MESSAGE);
  }

  const token = value.slice("Bearer ".length).trim();
  if (!token) {
    throw createStatusError(401, INVALID_CREDENTIAL_MESSAGE);
  }

  return token;
}

function readRequiredBodyString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createStatusError(400, message);
  }
  return value.trim();
}

function readOptionalBodyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readOptionalBodyNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readOptionalSinceTick(value: string | undefined): number | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw createStatusError(400, "sinceTick must be a number.");
  }
  return Math.max(0, Math.floor(parsed));
}

function readCultivatorIdFromBody(body: Record<string, unknown>): string {
  const cultivatorId = readOptionalBodyString(body.cultivatorId);
  if (!cultivatorId) {
    throw createStatusError(400, "Body must include cultivatorId.");
  }
  return cultivatorId;
}

function readRegistrationRecord(body: Record<string, unknown>): CultivationRegistrationRecord {
  const record = body.record;
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw createStatusError(400, "Body must include a registration record object.");
  }
  return record as CultivationRegistrationRecord;
}

function normalizeRegistrationRecordForRequest(
  record: CultivationRegistrationRecord,
): CultivationRegistrationRecord {
  try {
    return normalizeCultivationRegistrationRecord(record);
  } catch (error) {
    throw createStatusError(
      400,
      error instanceof Error ? `Registration record could not be processed: ${error.message}` : "Registration record could not be processed.",
    );
  }
}

function readNormalizedRegistrationRecord(body: Record<string, unknown>): CultivationRegistrationRecord {
  return normalizeRegistrationRecordForRequest(readRegistrationRecord(body));
}

function readOptionalRegistrationRecord(body: Record<string, unknown>): CultivationRegistrationRecord | undefined {
  if (body.record === undefined) {
    return undefined;
  }
  return readNormalizedRegistrationRecord(body);
}

function readOptionalRegistrationAnswers(
  body: Record<string, unknown>,
): Record<RegistrationQuestionId, RegistrationAnswer> | undefined {
  if (body.answers === undefined) {
    return undefined;
  }
  if (!body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) {
    throw createStatusError(400, "Body must include questionnaire answers as an object.");
  }

  const rawAnswers = body.answers as Record<string, unknown>;
  const answers = {} as Record<RegistrationQuestionId, RegistrationAnswer>;

  for (const questionId of REGISTRATION_QUESTION_IDS) {
    const answer = rawAnswers[questionId];
    if (typeof answer !== "string" || !REGISTRATION_ANSWERS_SET.has(answer as RegistrationAnswer)) {
      throw createStatusError(400, `Questionnaire is missing a valid answer for ${questionId}.`);
    }
    answers[questionId] = answer as RegistrationAnswer;
  }

  return answers;
}

function readLegacyPersonaInput(body: Record<string, unknown>): AgentPersonaInput {
  return {
    name: readRequiredBodyString(body.name, "Body must include persona name."),
    genderPresentation: typeof body.genderPresentation === "string" ? (body.genderPresentation as never) : undefined,
    pronouns: readOptionalBodyString(body.pronouns),
    age: readOptionalBodyNumber(body.age),
    origin: readOptionalBodyString(body.origin),
    temperament: readOptionalBodyString(body.temperament),
  };
}

function readRegistrationInput(body: Record<string, unknown>): {
  input: AgentRegistrationInput;
  questionnaireSource: "answers" | "record";
} {
  const record = readOptionalRegistrationRecord(body);
  const answers = readOptionalRegistrationAnswers(body);

  if (record && answers) {
    throw createStatusError(400, "Body must include either questionnaire answers or a registration record, not both.");
  }

  if (!record && !answers) {
    throw createStatusError(400, "Body must include questionnaire answers or a registration record.");
  }

  let resolvedRecord: CultivationRegistrationRecord;
  try {
    resolvedRecord = record ?? deriveRegistrationRecordFromAnswers(answers!);
  } catch (error) {
    throw createStatusError(
      400,
      error instanceof Error ? `Questionnaire could not be processed: ${error.message}` : "Questionnaire could not be processed.",
    );
  }

  return {
    questionnaireSource: record ? "record" : "answers",
    input: {
      name: readRequiredBodyString(body.name, "Body must include name."),
      genderPresentation: typeof body.genderPresentation === "string" ? (body.genderPresentation as never) : undefined,
      pronouns: readOptionalBodyString(body.pronouns),
      age: readOptionalBodyNumber(body.age),
      origin: readOptionalBodyString(body.origin),
      temperament: readOptionalBodyString(body.temperament),
      webhookUrl: readOptionalBodyString(body.webhookUrl),
      record: resolvedRecord,
    },
  };
}

function isLocalDevelopmentOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  try {
    const hostname = new URL(origin).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return origin.includes("localhost") || origin.includes("127.0.0.1");
  }
}

function readLegacyCultivatorIdFromQuery(
  world: Awaited<ReturnType<WorldRepository["readWorld"]>>,
  request: URL,
) {
  const directCultivatorId = request.searchParams.get("cultivatorId")?.trim();
  if (directCultivatorId) {
    return directCultivatorId;
  }
  const agentId = request.searchParams.get("agentId")?.trim();
  if (agentId) {
    return resolveCultivatorIdForAgent(world, agentId);
  }
  throw createStatusError(400, "Missing query parameter: cultivatorId or agentId");
}

async function readAuthenticatedAgent(
  request: Request,
  repository: WorldRepository,
): Promise<AgentProfileRecord> {
  const credential = readBearerToken(request.headers.get("authorization") ?? undefined);
  const agent = await repository.authenticateAgent(credential);
  if (!agent) {
    throw createStatusError(401, INVALID_CREDENTIAL_MESSAGE);
  }
  await repository.touchAgent(agent.agentId);
  return agent;
}

function markdownResponse(content: string) {
  return new Response(content, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}

export function registerRuntimeRoutes(app: Hono<RuntimeWorkerEnv>, options: RouteRegistrationOptions = {}) {
  app.get("/health", (context) => {
    const payload: RuntimeHealthResponse = { ok: true };
    return context.json(payload);
  });

  app.get("/skill.md", (context) => markdownResponse(renderSkillMarkdown(new URL(context.req.url).origin)));
  app.get("/register.md", (context) => markdownResponse(renderRegisterMarkdown(new URL(context.req.url).origin)));
  app.get("/heartbeat.md", (context) => markdownResponse(renderHeartbeatMarkdown(new URL(context.req.url).origin)));
  app.get("/agent/guide", (context) => markdownResponse(renderSkillMarkdown(new URL(context.req.url).origin)));
  app.get("/agent/register/questions", (context) => context.json(getRegistrationQuestionnaire()));

  app.post("/agent/register", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const body = (await context.req.json()) as Record<string, unknown>;
    const { input: registrationInput, questionnaireSource } = readRegistrationInput(body);
    const payload = await registerAgentWorkflow({
      repository,
      input: registrationInput,
      questionnaireSource,
      baseUrl: new URL(context.req.url).origin,
    });
    return context.json({
      ...payload,
      message: `${payload.message} Save this credential now.`.trim(),
    });
  });

  app.get("/agent/binding", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const world = await repository.readWorld();
    return context.json(getAgentBindingInfo(world, readAgentId(context.req.query("agentId"))));
  });

  app.post("/agent/sync-persona", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const body = (await context.req.json()) as Record<string, unknown>;
    const authenticatedAgent = context.req.header("authorization")
      ? await readAuthenticatedAgent(context.req.raw, repository)
      : null;
    const agentId = authenticatedAgent?.agentId ?? readRequiredBodyString(body.agentId, "Body must include agentId.");
    const payload = await syncAgentPersonaWorkflow({
      repository,
      agentId,
      input: readLegacyPersonaInput(body),
    });
    return context.json(payload);
  });

  app.get("/cultivator/state", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const service = createRuntimeService({ repository });
    const cultivatorId = readCultivatorId(context.req.query("cultivatorId"));
    return context.json(await service.getCultivatorState(cultivatorId));
  });

  app.get("/cultivator/actions", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const service = createRuntimeService({ repository });
    const cultivatorId = readCultivatorId(context.req.query("cultivatorId"));
    const payload: CultivatorActionsResponse = {
      cultivatorId,
      actions: await service.listActions(cultivatorId),
    };
    return context.json(payload);
  });

  app.get("/cultivator/messages", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const world = await repository.readWorld();
    return context.json(getMessages(world, readLegacyCultivatorIdFromQuery(world, new URL(context.req.url))));
  });

  app.get("/cultivator/tribulation", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const world = await repository.readWorld();
    return context.json(getTribulationPreview(world, readLegacyCultivatorIdFromQuery(world, new URL(context.req.url))));
  });

  app.get("/cultivator/strategy", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const world = await repository.readWorld();
    return context.json(getStrategySnapshot(world, readLegacyCultivatorIdFromQuery(world, new URL(context.req.url))));
  });

  app.get("/cultivator/registration", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const world = await repository.readWorld();
    const cultivatorId = readLegacyCultivatorIdFromQuery(world, new URL(context.req.url));
    return context.json(await repository.getCultivationRegistration(cultivatorId));
  });

  app.get("/cultivator/sect", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const world = await repository.readWorld();
    return context.json(getSectInfo(world, readLegacyCultivatorIdFromQuery(world, new URL(context.req.url))));
  });

  app.get("/cultivator/dao-heart", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const world = await repository.readWorld();
    return context.json(getDaoLogs(world, readLegacyCultivatorIdFromQuery(world, new URL(context.req.url))));
  });

  app.post("/cultivator/act", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const service = createRuntimeService({ repository });
    const body = (await context.req.json()) as Partial<PerformActionRequest>;
    const cultivatorId = readCultivatorId(body.cultivatorId);
    const actionId = body.actionId?.trim();

    if (!actionId) {
      throw createStatusError(400, "Body must include actionId.");
    }

    return context.json(await service.performAction(cultivatorId, actionId as ActionId));
  });

  app.post("/cultivator/registration", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const body = (await context.req.json()) as Record<string, unknown>;
    const agentId = readOptionalBodyString(body.agentId);
    return context.json(
      await repository.saveCultivationRegistration(
        readCultivatorIdFromBody(body),
        readNormalizedRegistrationRecord(body),
        agentId,
      ),
    );
  });

  app.get("/world/agents", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    return context.json(await buildPublicAgentDirectory({ repository }));
  });

  app.get("/world/agent/:agentId", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agentId = context.req.param("agentId");
    const payload = await buildPublicAgentState({ repository, agentId });

    if (!payload) {
      return context.json({ error: "Agent not found or has no cultivator." }, 404);
    }
    return context.json(payload);
  });

  app.post("/world/tick", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const service = createRuntimeService({ repository });
    const body = (await context.req.json()) as Partial<AdvanceWorldRequest>;
    const steps = typeof body.steps === "number" ? body.steps : 1;
    return context.json(await service.advanceWorld(steps, "manual"));
  });

  app.get("/agent/state", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    return context.json(await buildAuthenticatedAgentState({ repository, agent }));
  });

  app.get("/agent/actions", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    return context.json(await buildAuthenticatedAgentActions({ repository, agent }));
  });

  app.get("/agent/messages", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    return context.json(await listAuthenticatedAgentMessages({ repository, agent }));
  });

  app.post("/agent/messages", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    const body = (await context.req.json()) as AgentSendMessageRequest & Record<string, unknown>;
    const content = readRequiredBodyString(body.content, "Body must include content.");
    const response = await sendAuthenticatedAgentMessage({
      repository,
      agent,
      request: {
        toAgentId: readOptionalBodyString(body.toAgentId),
        toCultivatorId: readOptionalBodyString(body.toCultivatorId),
        subject: readOptionalBodyString(body.subject),
        content,
      },
    });

    const recipientCultivatorId = response.message.toCultivatorId;
    if (recipientCultivatorId) {
      const [world, agentProfiles] = await Promise.all([
        repository.readWorld(),
        repository.listAgentProfiles(),
      ]);
      const target = resolveMessageWebhookTarget(world, recipientCultivatorId, agent.name, world.tick, agentProfiles);
      if (target) {
        context.executionCtx.waitUntil(dispatchWebhooks([target]));
      }
    }

    return context.json(response);
  });

  app.get("/agent/events", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    return context.json(
      await buildAuthenticatedAgentEvents({
        repository,
        agent,
        sinceTick: readOptionalSinceTick(context.req.query("sinceTick")),
      }),
    );
  });

  app.get("/agent/strategy", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    return context.json(await readAuthenticatedAgentStrategy({ repository, agent }));
  });

  app.get("/agent/tribulation", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    return context.json(await readAuthenticatedAgentTribulation({ repository, agent }));
  });

  app.get("/agent/sect", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    return context.json(await readAuthenticatedAgentSectInfo({ repository, agent }));
  });

  app.get("/agent/dao-heart", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    return context.json(await readAuthenticatedAgentDaoLogs({ repository, agent }));
  });

  app.get("/agent/registration", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    return context.json(await readAuthenticatedAgentRegistration({ repository, agent }));
  });

  app.post("/agent/credential/reset", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const currentCredential = readBearerToken(context.req.header("authorization") ?? undefined);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    return context.json(await resetAuthenticatedAgentCredential({ repository, agent, currentCredential }));
  });

  app.post("/agent/webhook", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    const body = (await context.req.json()) as Record<string, unknown>;
    const webhookUrl = readRequiredBodyString(body.webhookUrl, "Body must include webhookUrl.");
    const allowInsecure = isLocalDevelopmentOrigin(context.env?.FRONTEND_ORIGIN);
    return context.json(
      await updateAgentWebhookUrl({
        repository,
        agent,
        webhookUrl,
        allowInsecure,
      }),
    );
  });

  app.post("/agent/registration", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    const body = (await context.req.json()) as Record<string, unknown>;
    return context.json(await saveAuthenticatedAgentRegistration({ repository, agent, record: readNormalizedRegistrationRecord(body) }));
  });

  app.post("/agent/act", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    const body = (await context.req.json()) as Partial<PerformActionRequest> & Record<string, unknown>;
    const actionId = readRequiredBodyString(body.actionId, "Body must include actionId.");
    return context.json(await performAuthenticatedAgentAction({ repository, agent, actionId: actionId as ActionId }));
  });

  app.post("/agent/tick", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    await readAuthenticatedAgent(context.req.raw, repository);
    const body = (await context.req.json()) as Partial<AdvanceWorldRequest>;
    const steps = typeof body.steps === "number" ? body.steps : 1;
    const tickSummary = await advanceAuthenticatedAgentWorld({ repository, steps });
    const [world, agentProfiles] = await Promise.all([
      repository.readWorld(),
      repository.listAgentProfiles(),
    ]);
    const targets = resolveWebhookTargets(world, tickSummary, agentProfiles);
    if (targets.length > 0) {
      context.executionCtx.waitUntil(dispatchWebhooks(targets));
    }
    return context.json(tickSummary);
  });
}

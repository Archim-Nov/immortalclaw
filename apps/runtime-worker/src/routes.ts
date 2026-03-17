import { createRuntimeService } from "../../../packages/application/src/index.js";
import type {
  AdvanceWorldRequest,
  AgentEventsResponse,
  AgentSendMessageRequest,
  AgentSendMessageResponse,
  CultivatorActionsResponse,
  PerformActionRequest,
  RuntimeHealthResponse,
} from "../../../packages/contracts/src/index.js";
import {
  buildRegistrationProfile,
  deriveRegistrationRecordFromAnswers,
  extractFiveElementScores,
  getAgentBindingInfo,
  getRegistrationQuestionnaire,
  getCultivatorState,
  getDaoLogs,
  getMessages,
  getRecentWorldEvents,
  getSectInfo,
  getStrategySnapshot,
  getTribulationPreview,
  resolveCultivatorIdForAgent,
  statusOf,
  stubDetailedAttributes,
  stubMainAttributes,
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

function readOptionalRegistrationRecord(body: Record<string, unknown>): CultivationRegistrationRecord | undefined {
  if (body.record === undefined) {
    return undefined;
  }
  return readRegistrationRecord(body);
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
    startingPath: typeof body.startingPath === "string" ? (body.startingPath as never) : undefined,
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
    startingPath: typeof body.startingPath === "string" ? (body.startingPath as never) : undefined,
      record: resolvedRecord,
    },
  };
}

function responseAgentView(agent: AgentProfileRecord) {
  return {
    agentId: agent.agentId,
    name: agent.name,
    selectedCultivatorId: agent.selectedCultivatorId,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    lastSeenAt: agent.lastSeenAt,
  };
}

async function resolveMessageRecipientCultivatorId(
  repository: WorldRepository,
  body: Record<string, unknown>,
): Promise<string> {
  const directCultivatorId = readOptionalBodyString(body.toCultivatorId);

  if (directCultivatorId) {
    return directCultivatorId;
  }

  const targetAgentId = readOptionalBodyString(body.toAgentId);

  if (!targetAgentId) {
    throw createStatusError(400, "Body must include toAgentId or toCultivatorId.");
  }

  const targetAgent = (await repository.listAgentProfiles()).find((agent) => agent.agentId === targetAgentId);

  if (!targetAgent) {
    throw createStatusError(404, `Agent not found: ${targetAgentId}`);
  }

  const world = await repository.readWorld();
  const selectedCultivatorId = readOptionalBodyString(targetAgent.selectedCultivatorId);

  if (!selectedCultivatorId) {
    throw createStatusError(409, `Agent has no selected cultivator: ${targetAgentId}`);
  }

  if (!world.cultivators[selectedCultivatorId]) {
    throw createStatusError(409, `Agent target is stale or missing from the world: ${targetAgentId}`);
  }

  return selectedCultivatorId;
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

function responseAgentDirectoryEntry(agent: AgentProfileRecord, world: Awaited<ReturnType<WorldRepository["readWorld"]>>) {
  const cultivator = world.cultivators[agent.selectedCultivatorId];
  const locationName =
    world.locations[cultivator.locationId]?.name ??
    world.zones[cultivator.locationId as keyof typeof world.zones]?.name ??
    cultivator.locationId;
  const sect = cultivator.sectId ? world.sects[cultivator.sectId] ?? null : null;
  const job = cultivator.activeJobId ? world.jobs[cultivator.activeJobId] ?? null : null;

  return {
    agentId: agent.agentId,
    name: agent.name,
    selectedCultivatorId: agent.selectedCultivatorId,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    lastSeenAt: agent.lastSeenAt,
    cultivator: {
      id: cultivator.id,
      name: cultivator.name,
      realm: cultivator.realm,
      realmLevel: cultivator.realmLevel,
      realmProgress: cultivator.realmProgress,
      status: statusOf(cultivator),
      location: locationName,
      spiritualPower: cultivator.spiritualPower,
      sect: sect?.name ?? null,
      currentAction: job?.actionId ?? null,
    },
  };
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
    const payload = await repository.registerAgent(registrationInput);
    const service = createRuntimeService({ repository });
    const [state, savedRecord] = await Promise.all([
      service.getCultivatorState(payload.selectedCultivatorId),
      repository.getCultivationRegistration(payload.selectedCultivatorId),
    ]);
    const registrationProfile = savedRecord ? buildRegistrationProfile(savedRecord) : null;
    const messageDetails = registrationProfile
      ? [
          `Core temperament: ${registrationProfile.coreTemperament.label}.`,
          `Secondary temperament: ${registrationProfile.secondaryTemperament.label}.`,
          `Behavior aspect: ${registrationProfile.behaviorAspect.label}.`,
          `Spirit root: ${registrationProfile.spiritRoot.label}.`,
          `Cultivation motive: ${registrationProfile.cultivationMotive.label}.`,
        ].join(" ")
      : "";
    const messagePrefix =
      questionnaireSource === "answers"
        ? "Agent registered, questionnaire answers were processed, and cultivation record saved successfully."
        : "Agent registered and cultivation record saved successfully.";

    return context.json({
      ok: true,
      agentId: payload.agentId,
      credential: payload.credential,
      baseUrl: new URL(context.req.url).origin,
      selectedCultivatorId: payload.selectedCultivatorId,
      createdCultivator: payload.createdCultivator,
      registration: state.registration,
      registrationEffects: state.registrationEffects,
      registrationProfile,
      message: `${messagePrefix} ${messageDetails} Save this credential now.`.trim(),
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
    const payload = await repository.syncPersona(agentId, readLegacyPersonaInput(body));
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
        readRegistrationRecord(body),
        agentId,
      ),
    );
  });

  app.get("/world/agents", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const [world, agentProfiles] = await Promise.all([repository.readWorld(), repository.listAgentProfiles()]);
    return context.json({
      agents: agentProfiles
        .filter((agent) => Boolean(world.cultivators[agent.selectedCultivatorId]))
        .map((agent) => responseAgentDirectoryEntry(agent, world)),
    });
  });

  app.get("/world/agent/:agentId", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agentId = context.req.param("agentId");
    const agent = await repository.getAgentProfile(agentId);

    if (!agent || !agent.selectedCultivatorId) {
      return context.json({ error: "Agent not found or has no cultivator." }, 404);
    }

    const service = createRuntimeService({ repository });
    const cultivatorState = await service.getCultivatorState(agent.selectedCultivatorId);
    const cultivator = (await repository.readWorld()).cultivators[agent.selectedCultivatorId];

    return context.json({
      agent: responseAgentView(agent),
      ...cultivatorState,
      fiveElementScores: extractFiveElementScores(cultivator?.registrationRecord ?? null),
      mainAttributes: stubMainAttributes(),
      detailedAttributes: stubDetailedAttributes(),
    });
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
    const service = createRuntimeService({ repository });
    const payload = await service.getCultivatorState(agent.selectedCultivatorId);
    return context.json({
      agent: responseAgentView(agent),
      ...payload,
    });
  });

  app.get("/agent/actions", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    const service = createRuntimeService({ repository });
    return context.json({
      agent: responseAgentView(agent),
      cultivatorId: agent.selectedCultivatorId,
      actions: await service.listActions(agent.selectedCultivatorId),
    });
  });

  app.get("/agent/messages", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    const world = await repository.readWorld();
    return context.json(getMessages(world, agent.selectedCultivatorId));
  });

  app.post("/agent/messages", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    const body = (await context.req.json()) as AgentSendMessageRequest & Record<string, unknown>;
    const targetCultivatorId = await resolveMessageRecipientCultivatorId(repository, body);
    const subject = readOptionalBodyString(body.subject) ?? "Private Telepathy";
    const content = readRequiredBodyString(body.content, "Body must include content.");
    const message = await repository.sendDirectMessage(
      agent.selectedCultivatorId,
      targetCultivatorId,
      agent.name,
      subject,
      content,
    );
    const payload: AgentSendMessageResponse = {
      ok: true,
      message,
    };
    return context.json(payload);
  });

  app.get("/agent/events", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    const world = await repository.readWorld();
    const sinceTick = readOptionalSinceTick(context.req.query("sinceTick"));
    const events = getRecentWorldEvents(world, agent.selectedCultivatorId, 50).filter((event) =>
      sinceTick === undefined ? true : event.tick >= sinceTick,
    );
    const combats = world.combatLogs
      .filter((entry) => entry.cultivatorId === agent.selectedCultivatorId)
      .filter((entry) => (sinceTick === undefined ? true : entry.tick >= sinceTick))
      .slice(0, 20);
    const payload: AgentEventsResponse = {
      agent: responseAgentView(agent),
      tick: world.tick,
      events,
      combats,
    };
    return context.json(payload);
  });

  app.get("/agent/strategy", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    const world = await repository.readWorld();
    return context.json(getStrategySnapshot(world, agent.selectedCultivatorId));
  });

  app.get("/agent/tribulation", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    const world = await repository.readWorld();
    return context.json(getTribulationPreview(world, agent.selectedCultivatorId));
  });

  app.get("/agent/sect", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    const world = await repository.readWorld();
    return context.json(getSectInfo(world, agent.selectedCultivatorId));
  });

  app.get("/agent/dao-heart", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    const world = await repository.readWorld();
    return context.json(getDaoLogs(world, agent.selectedCultivatorId));
  });

  app.get("/agent/registration", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    return context.json(await repository.getCultivationRegistration(agent.selectedCultivatorId));
  });

  app.post("/agent/credential/reset", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const currentCredential = readBearerToken(context.req.header("authorization") ?? undefined);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    const payload = await repository.resetAgentCredential(agent.agentId, currentCredential);
    return context.json({
      ok: true,
      agentId: payload.agentId,
      credential: payload.credential,
      message: "Agent credential reset successfully. Save the new credential now.",
    });
  });

  app.post("/agent/registration", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    const body = (await context.req.json()) as Record<string, unknown>;
    return context.json(
      await repository.saveCultivationRegistration(
        agent.selectedCultivatorId,
        readRegistrationRecord(body),
        agent.agentId,
      ),
    );
  });

  app.post("/agent/act", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const agent = await readAuthenticatedAgent(context.req.raw, repository);
    const service = createRuntimeService({ repository });
    const body = (await context.req.json()) as Partial<PerformActionRequest> & Record<string, unknown>;
    const actionId = readRequiredBodyString(body.actionId, "Body must include actionId.");
    return context.json(await service.performAction(agent.selectedCultivatorId, actionId as ActionId));
  });

  app.post("/agent/tick", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    await readAuthenticatedAgent(context.req.raw, repository);
    const service = createRuntimeService({ repository });
    const body = (await context.req.json()) as Partial<AdvanceWorldRequest>;
    const steps = typeof body.steps === "number" ? body.steps : 1;
    return context.json(await service.advanceWorld(steps, "manual"));
  });
}

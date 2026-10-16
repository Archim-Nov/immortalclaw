import type { Hono } from "hono";
import {
  advanceAuthenticatedAgentWorld,
  applyAuthenticatedPlayerSectApplication,
  buildAuthenticatedAgentActions,
  buildAuthenticatedAgentEvents,
  buildAuthenticatedAgentState,
  chooseAuthenticatedMoralityChoice,
  buildPublicAgentDirectory,
  buildPublicAgentState,
  buildPublicSectsDirectory,
  buildPublicWorldChronicle,
  createRuntimeService,
  deduplicateWebhookTargets,
  dispatchWebhooks,
  foundAuthenticatedPlayerSect,
  listAuthenticatedPlayerSectRecruitment,
  listAuthenticatedSectApplications,
  readAuthenticatedPlayerSectFoundingOptions,
  listAuthenticatedAgentMessages,
  performAuthenticatedAgentAction,
  readAuthenticatedPendingMoralityChoice,
  readAuthenticatedAgentDaoLogs,
  readAuthenticatedAgentRegistration,
  readAuthenticatedAgentSectInfo,
  readAuthenticatedAgentStrategy,
  registerAgentWorkflow,
  buildAgentPresentationCatalog,
  readAgentTemplateHtml,
  resetAuthenticatedAgentCredential,
  resolveMessageWebhookTarget,
  resolveWebhookTargets,
  reviewAuthenticatedSectApplication,
  saveAuthenticatedAgentRegistration,
  sendAuthenticatedAgentMessage,
  syncAgentPersonaWorkflow,
  updateAgentWebhookUrl,
  updateAuthenticatedSectAdmissionPolicy,
} from "@immortal-claw/application";
import type {
  AdvanceWorldRequest,
  AgentSendMessageRequest,
  CultivatorActionsResponse,
  FoundPlayerSectRequest,
  PerformActionRequest,
  PlayerSectApplicationRequest,
  ResolveMoralityChoiceRequest,
  RuntimeHealthResponse,
  ReviewSectApplicationRequest,
  UpdateSectAdmissionPolicyRequest,
} from "@immortal-claw/contracts";
import {
  deriveRegistrationRecordFromAnswers,
  getAgentBindingInfo,
  getRegistrationQuestionnaire,
  getDaoLogs,
  getMessages,
  normalizeCultivationRegistrationRecord,
  REGISTRATION_ANSWERS_SET,
  REGISTRATION_QUESTION_IDS,
  getSectInfo,
  getStrategySnapshot,
  resolveCultivatorIdForAgent,
  saveCultivationRegistration,
} from "@immortal-claw/domain";
import type {
  ActionId,
  CultivationRegistrationRecord,
  RegistrationAnswer,
  RegistrationQuestionId,
} from "@immortal-claw/domain";
import type {
  AuthClient,
  AgentPersonaInput,
  AgentProfileRecord,
  AgentRegistrationInput,
  WorldRepository,
} from "@immortal-claw/persistence";
import { renderHeartbeatMarkdown, renderRegisterMarkdown, renderSkillMarkdown } from "./agent-guides.js";
import type { WorldDOHonoEnv } from "./env.js";

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

function readOptionalPageLimit(value: string | undefined): number | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw createStatusError(400, "limit must be a positive number.");
  }
  return Math.floor(parsed);
}

function readOptionalCursor(value: string | undefined): string | undefined {
  return value?.trim() ? value.trim() : undefined;
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

function readSectAdmissionPolicy(value: unknown): UpdateSectAdmissionPolicyRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw createStatusError(400, "Body must include an admissionPolicy object.");
  }
  const policy = value as Record<string, unknown>;
  if (typeof policy.minimumRealmLevel !== "number" || !Number.isFinite(policy.minimumRealmLevel)) {
    throw createStatusError(400, "admissionPolicy.minimumRealmLevel must be a number.");
  }
  if (!Array.isArray(policy.allowedMotiveBuckets) || policy.allowedMotiveBuckets.some((entry) => typeof entry !== "string")) {
    throw createStatusError(400, "admissionPolicy.allowedMotiveBuckets must be a string array.");
  }
  return {
    minimumRealmLevel: Math.floor(policy.minimumRealmLevel),
    allowedMotiveBuckets: policy.allowedMotiveBuckets as UpdateSectAdmissionPolicyRequest["allowedMotiveBuckets"],
  };
}

function readReviewDecision(value: unknown): ReviewSectApplicationRequest["decision"] {
  const decision = readRequiredBodyString(value, "Body must include decision.");
  if (decision !== "approve" && decision !== "reject") {
    throw createStatusError(400, "decision must be approve or reject.");
  }
  return decision;
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
      record: resolvedRecord,
    },
  };
}

function readAuthenticatedAgent(request: Request, auth: AuthClient): Promise<AgentProfileRecord> {
  const credential = readBearerToken(request.headers.get("authorization") ?? undefined);
  return auth.authenticateAgent(credential).then(async (agent) => {
    if (!agent) {
      throw createStatusError(401, INVALID_CREDENTIAL_MESSAGE);
    }
    await auth.touchAgent(agent.agentId);
    return agent;
  });
}

function markdownResponse(content: string) {
  return new Response(content, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}

export function registerRoutes(app: Hono<WorldDOHonoEnv>) {
  app.get("/health", (context) => {
    const payload: RuntimeHealthResponse = { ok: true };
    return context.json(payload);
  });

  app.get("/skill.md", (context) => markdownResponse(renderSkillMarkdown(new URL(context.req.url).origin)));
  app.get("/register.md", (context) => markdownResponse(renderRegisterMarkdown(new URL(context.req.url).origin)));
  app.get("/heartbeat.md", (context) => markdownResponse(renderHeartbeatMarkdown(new URL(context.req.url).origin)));
  app.get("/agent/guide", (context) => markdownResponse(renderSkillMarkdown(new URL(context.req.url).origin)));
  app.get("/agent/templates", (context) => {
    context.header("cache-control", "no-cache");
    return context.json(buildAgentPresentationCatalog());
  });
  app.get("/agent/templates/:id", (context) => {
    const html = readAgentTemplateHtml(context.req.param("id"));
    if (!html) {
      return context.json({ error: "Unknown template." }, 404);
    }
    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  });
  app.get("/agent/register/questions", (context) => context.json(getRegistrationQuestionnaire()));

  app.get("/world/status", async (context) => {
    const world = context.get("world");
    const meta = await world.getWorldMetadata();
    return context.json({ ok: true, tick: meta.tick, lastTickAt: meta.updatedAt });
  });

  app.post("/agent/register", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const body = (await context.req.json()) as Record<string, unknown>;
    const { input: registrationInput, questionnaireSource } = readRegistrationInput(body);
    const payload = await registerAgentWorkflow({
      world,
      auth,
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
    const world = context.get("world");
    const snapshot = await world.readWorld();
    return context.json(getAgentBindingInfo(snapshot, readAgentId(context.req.query("agentId"))));
  });

  app.post("/agent/sync-persona", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const body = (await context.req.json()) as Record<string, unknown>;
    const authenticatedAgent = context.req.header("authorization")
      ? await readAuthenticatedAgent(context.req.raw, auth)
      : null;
    const agentId = authenticatedAgent?.agentId ?? readRequiredBodyString(body.agentId, "Body must include agentId.");
    const payload = await syncAgentPersonaWorkflow({
      world,
      auth,
      agentId,
      input: readLegacyPersonaInput(body),
    });
    return context.json(payload);
  });

  app.get("/cultivator/state", async (context) => {
    const world = context.get("world");
    const service = createRuntimeService({ world });
    const cultivatorId = readCultivatorId(context.req.query("cultivatorId"));
    return context.json(await service.getCultivatorState(cultivatorId));
  });

  app.get("/cultivator/actions", async (context) => {
    const world = context.get("world");
    const service = createRuntimeService({ world });
    const cultivatorId = readCultivatorId(context.req.query("cultivatorId"));
    const payload: CultivatorActionsResponse = {
      cultivatorId,
      actions: await service.listActions(cultivatorId),
    };
    return context.json(payload);
  });

  app.get("/cultivator/messages", async (context) => {
    const world = context.get("world");
    const snapshot = await world.readWorld();
    return context.json(getMessages(snapshot, readLegacyCultivatorIdFromQuery(snapshot, new URL(context.req.url))));
  });

  app.get("/cultivator/strategy", async (context) => {
    const world = context.get("world");
    const snapshot = await world.readWorld();
    return context.json(getStrategySnapshot(snapshot, readLegacyCultivatorIdFromQuery(snapshot, new URL(context.req.url))));
  });

  app.get("/cultivator/registration", async (context) => {
    const world = context.get("world");
    const snapshot = await world.readWorld();
    const cultivatorId = readLegacyCultivatorIdFromQuery(snapshot, new URL(context.req.url));
    return context.json(await world.getCultivationRegistration(cultivatorId));
  });

  app.get("/cultivator/sect", async (context) => {
    const world = context.get("world");
    const snapshot = await world.readWorld();
    return context.json(getSectInfo(snapshot, readLegacyCultivatorIdFromQuery(snapshot, new URL(context.req.url))));
  });

  app.get("/cultivator/dao-heart", async (context) => {
    const world = context.get("world");
    const snapshot = await world.readWorld();
    return context.json(getDaoLogs(snapshot, readLegacyCultivatorIdFromQuery(snapshot, new URL(context.req.url))));
  });

  app.post("/cultivator/act", async (context) => {
    const world = context.get("world");
    const service = createRuntimeService({ world });
    const body = (await context.req.json()) as Partial<PerformActionRequest>;
    const cultivatorId = readCultivatorId(body.cultivatorId);
    const actionId = body.actionId?.trim();
    const line = typeof body.line === "string" ? body.line : undefined;

    if (!actionId) {
      throw createStatusError(400, "Body must include actionId.");
    }

    return context.json(await service.performAction(cultivatorId, actionId as ActionId, line));
  });

  app.post("/cultivator/registration", async (context) => {
    const world = context.get("world");
    const body = (await context.req.json()) as Record<string, unknown>;
    const agentId = readOptionalBodyString(body.agentId);
    const cultivatorId = readCultivatorIdFromBody(body);
    const record = readNormalizedRegistrationRecord(body);
    return context.json(
      await world.transactWorld((state) =>
        saveCultivationRegistration(state, cultivatorId, record, agentId),
      ),
    );
  });

  app.get("/world/agents", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    return context.json(await buildPublicAgentDirectory({ world, auth }));
  });

  app.get("/world/sects", async (context) => {
    const world = context.get("world");
    return context.json(await buildPublicSectsDirectory({ world }));
  });

  app.get("/world/chronicle", async (context) => {
    const world = context.get("world");
    return context.json(
      await buildPublicWorldChronicle({
        world,
        limit: readOptionalPageLimit(context.req.query("limit")),
      }),
    );
  });

  app.get("/world/agent/:agentId", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agentId = context.req.param("agentId");
    const payload = await buildPublicAgentState({ world, auth, agentId });

    if (!payload) {
      return context.json({ error: "Agent not found or has no cultivator." }, 404);
    }
    return context.json(payload);
  });

  app.post("/world/tick", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const service = createRuntimeService({ world });
    const body = (await context.req.json()) as Partial<AdvanceWorldRequest>;
    const steps = typeof body.steps === "number" ? body.steps : 1;
    const tickSummary = await service.advanceWorld(steps, "manual");

    if (tickSummary.completedJobs.length > 0) {
      const profiles = await auth.listAgentProfiles();
      const snapshot = await world.readWorld();
      const targets = deduplicateWebhookTargets(resolveWebhookTargets(snapshot, tickSummary, profiles));
      if (targets.length > 0) {
        void dispatchWebhooks(targets).catch(() => {});
      }
    }

    return context.json(tickSummary);
  });

  app.get("/agent/state", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    return context.json(await buildAuthenticatedAgentState({ world, agent }));
  });

  app.get("/agent/digest", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    const state = await buildAuthenticatedAgentState({ world, agent });
    return context.json(state.digest ?? {
      windowTicks: 6,
      windowHours: 12,
      fromTick: state.tick,
      toTick: state.tick,
      summary: "最近六个时辰过得平常。",
    });
  });

  app.get("/agent/actions", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    return context.json(await buildAuthenticatedAgentActions({ world, agent }));
  });

  app.get("/agent/messages", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    return context.json(await listAuthenticatedAgentMessages({ world, agent }));
  });

  app.post("/agent/messages", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    const body = (await context.req.json()) as AgentSendMessageRequest & Record<string, unknown>;
    const content = readRequiredBodyString(body.content, "Body must include content.");
    const request = {
      toAgentId: readOptionalBodyString(body.toAgentId),
      toCultivatorId: readOptionalBodyString(body.toCultivatorId),
      subject: readOptionalBodyString(body.subject),
      content,
    };
    const result = await sendAuthenticatedAgentMessage({ world, auth, agent, request });

    const recipientCultivatorId = request.toCultivatorId?.trim() || result.message.toCultivatorId;
    if (recipientCultivatorId) {
      const profiles = await auth.listAgentProfiles();
      const snapshot = await world.readWorld();
      const target = resolveMessageWebhookTarget(snapshot, recipientCultivatorId, agent.name, snapshot.tick, profiles);
      if (target) {
        void dispatchWebhooks([target]).catch(() => {});
      }
    }

    return context.json(result);
  });

  app.get("/agent/events", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    return context.json(
      await buildAuthenticatedAgentEvents({
        world,
        agent,
        sinceTick: readOptionalSinceTick(context.req.query("sinceTick")),
      }),
    );
  });

  app.get("/agent/events/pending", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    return context.json(await readAuthenticatedPendingMoralityChoice({ world, agent }));
  });

  app.post("/agent/events/choose", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    const body = (await context.req.json()) as ResolveMoralityChoiceRequest & Record<string, unknown>;
    return context.json(
      await chooseAuthenticatedMoralityChoice({
        world,
        agent,
        choiceId: readRequiredBodyString(body.choiceId, "Body must include choiceId."),
        optionId: readRequiredBodyString(body.optionId, "Body must include optionId."),
      }),
    );
  });

  app.get("/agent/strategy", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    return context.json(await readAuthenticatedAgentStrategy({ world, agent }));
  });

  app.get("/agent/sect", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    return context.json(await readAuthenticatedAgentSectInfo({ world, agent }));
  });

  app.get("/agent/sects/founding-options", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    return context.json(await readAuthenticatedPlayerSectFoundingOptions({ world, agent }));
  });

  app.post("/agent/sects/found", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    const body = (await context.req.json()) as FoundPlayerSectRequest & Record<string, unknown>;
    return context.json(
      await foundAuthenticatedPlayerSect({
        world,
        agent,
        input: {
          name: readRequiredBodyString(body.name, "Body must include name."),
          admissionPolicy: readSectAdmissionPolicy(body.admissionPolicy),
        },
      }),
    );
  });

  app.get("/agent/player-sects/recruitment", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    return context.json(
      await listAuthenticatedPlayerSectRecruitment({
        world,
        agent,
        limit: readOptionalPageLimit(context.req.query("limit")),
        cursor: readOptionalCursor(context.req.query("cursor")),
      }),
    );
  });

  app.post("/agent/player-sect-applications", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    const body = (await context.req.json()) as PlayerSectApplicationRequest & Record<string, unknown>;
    return context.json(
      await applyAuthenticatedPlayerSectApplication({
        world,
        agent,
        sectId: readRequiredBodyString(body.sectId, "Body must include sectId."),
      }),
    );
  });

  app.get("/agent/sect/applications", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    return context.json(
      await listAuthenticatedSectApplications({
        world,
        agent,
        limit: readOptionalPageLimit(context.req.query("limit")),
        cursor: readOptionalCursor(context.req.query("cursor")),
      }),
    );
  });

  app.post("/agent/sect/applications/review", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    const body = (await context.req.json()) as ReviewSectApplicationRequest & Record<string, unknown>;
    return context.json(
      await reviewAuthenticatedSectApplication({
        world,
        agent,
        applicationId: readRequiredBodyString(body.applicationId, "Body must include applicationId."),
        decision: readReviewDecision(body.decision),
      }),
    );
  });

  app.post("/agent/sect/admission-policy", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    const body = (await context.req.json()) as UpdateSectAdmissionPolicyRequest & Record<string, unknown>;
    return context.json(
      await updateAuthenticatedSectAdmissionPolicy({
        world,
        agent,
        policy: readSectAdmissionPolicy(body),
      }),
    );
  });

  app.get("/agent/dao-heart", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    return context.json(await readAuthenticatedAgentDaoLogs({ world, agent }));
  });

  app.get("/agent/registration", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    return context.json(await readAuthenticatedAgentRegistration({ world, agent }));
  });

  app.post("/agent/credential/reset", async (context) => {
    const auth = context.get("auth");
    const currentCredential = readBearerToken(context.req.header("authorization") ?? undefined);
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    return context.json(await resetAuthenticatedAgentCredential({ auth, agent, currentCredential }));
  });

  app.post("/agent/registration", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    const body = (await context.req.json()) as Record<string, unknown>;
    return context.json(await saveAuthenticatedAgentRegistration({ world, agent, record: readNormalizedRegistrationRecord(body) }));
  });

  app.post("/agent/act", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    const body = (await context.req.json()) as Partial<PerformActionRequest> & Record<string, unknown>;
    const actionId = readRequiredBodyString(body.actionId, "Body must include actionId.");
    const line = typeof body.line === "string" ? body.line : undefined;
    return context.json(await performAuthenticatedAgentAction({ world, agent, actionId: actionId as ActionId, line }));
  });

  app.post("/agent/webhook", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    const agent = await readAuthenticatedAgent(context.req.raw, auth);
    const body = (await context.req.json()) as Record<string, unknown>;
    const webhookUrl = readRequiredBodyString(body.webhookUrl, "Body must include webhookUrl.");
    const isLocalDev = new URL(context.req.url).hostname === "localhost" || new URL(context.req.url).hostname === "127.0.0.1";
    return context.json(
      await updateAgentWebhookUrl({
        repository: auth,
        agent,
        webhookUrl,
        allowInsecure: isLocalDev,
      }),
    );
  });

  app.post("/agent/tick", async (context) => {
    const world = context.get("world");
    const auth = context.get("auth");
    await readAuthenticatedAgent(context.req.raw, auth);
    const body = (await context.req.json()) as Partial<AdvanceWorldRequest>;
    const steps = typeof body.steps === "number" ? body.steps : 1;
    const tickSummary = await advanceAuthenticatedAgentWorld({ world, steps });

    if (tickSummary.completedJobs.length > 0) {
      const profiles = await auth.listAgentProfiles();
      const snapshot = await world.readWorld();
      const targets = deduplicateWebhookTargets(resolveWebhookTargets(snapshot, tickSummary, profiles));
      if (targets.length > 0) {
        void dispatchWebhooks(targets).catch(() => {});
      }
    }

    return context.json(tickSummary);
  });
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

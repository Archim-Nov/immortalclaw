import type {
  ActionExecutionResult,
  AdvanceWorldResponse,
  AgentActionsResponse,
  AgentBindingResponse,
  AgentCredentialResetResponse,
  AgentEventsResponse,
  AgentMessagesResponse,
  AgentPersonaSyncRequest,
  AgentPersonaSyncResponse,
  AgentRegistrationQuestionnaireResponse,
  AgentRegistrationRecordRequest,
  AgentRegistrationResponse,
  AgentSectResponse,
  AgentSendMessageRequest,
  AgentSendMessageResponse,
  AgentStateResponse,
  AgentStrategyResponse,
  AgentWebhookBindResponse,
  FoundPlayerSectRequest,
  FoundPlayerSectResponse,
  PendingMoralityChoiceResponseBody,
  PlayerSectApplicationRequest,
  PlayerSectApplicationResponse,
  PlayerSectFoundingOptionsResponse,
  PlayerSectRecruitmentResponse,
  PublicAgentDirectoryResponse,
  PublicAgentStateResponse,
  ResolveMoralityChoiceRequest,
  ResolveMoralityChoiceResponse,
  ReviewSectApplicationRequest,
  ReviewSectApplicationResponse,
  RuntimeHealthResponse,
  SectApplicationsResponse,
  UpdateSectAdmissionPolicyRequest,
  UpdateSectAdmissionPolicyResponse,
  WorldStatusResponse,
  CultivationRegistrationRecord,
  DaoLogEntry,
  RegistrationAnswer,
  RegistrationQuestionId,
} from "../../../../packages/contracts/src/runtime-api.js";

const agentCredentialStorageKey = "immortal-claw.agent-credential";

export interface RuntimeApiError extends Error {
  payload?: unknown;
  status: number;
}

function createRuntimeApiError(message: string, status: number, payload?: unknown): RuntimeApiError {
  return Object.assign(new Error(message), {
    status,
    payload,
  });
}

async function readErrorMessage(response: Response): Promise<{ message: string; payload?: unknown }> {
  const contentType = response.headers.get("content-type") ?? "";
  let payload: unknown;
  let message = `Runtime request failed with status ${response.status}.`;

  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();

      if (typeof payload === "object" && payload !== null) {
        const record = payload as Record<string, unknown>;
        if (typeof record.error === "string" && record.error.trim()) {
          message = record.error;
        } else if (typeof record.message === "string" && record.message.trim()) {
          message = record.message;
        }
      }
    } catch {
      payload = undefined;
    }
  } else {
    try {
      const text = await response.text();
      if (text.trim()) {
        message = text.trim();
      }
    } catch {
      // ignore invalid plain-text body reads
    }
  }

  return { message, payload };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(normalizedPath, init);

  if (!response.ok) {
    const { message, payload } = await readErrorMessage(response);
    throw createRuntimeApiError(message, response.status, payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function requestText(path: string, init?: RequestInit): Promise<string> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(normalizedPath, init);

  if (!response.ok) {
    const { message, payload } = await readErrorMessage(response);
    throw createRuntimeApiError(message, response.status, payload);
  }

  return await response.text();
}

function createJsonInit(method: "POST" | "PUT" | "PATCH", body: unknown, credential?: string): RequestInit {
  return {
    method,
    headers: {
      "content-type": "application/json",
      ...(credential ? { authorization: `Bearer ${credential}` } : {}),
    },
    body: JSON.stringify(body),
  };
}

function createAuthInit(credential: string, init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      ...(init?.headers && !Array.isArray(init.headers) ? init.headers : {}),
      authorization: `Bearer ${credential}`,
    },
  };
}

function readBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredAgentCredential(): string | null {
  const storage = readBrowserStorage();

  if (!storage) {
    return null;
  }

  try {
    const value = storage.getItem(agentCredentialStorageKey);
    return typeof value === "string" && value.trim() ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredAgentCredential(value: string): void {
  const storage = readBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(agentCredentialStorageKey, value);
  } catch {
    // best effort only
  }
}

export function clearStoredAgentCredential(): void {
  const storage = readBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(agentCredentialStorageKey);
  } catch {
    // best effort only
  }
}

export function authHeaders(credential: string): Record<string, string> {
  return {
    authorization: `Bearer ${credential}`,
  };
}

export function isHintActionId(actionId: string): boolean {
  return new Set([
    "open-player-sect-founding",
    "open-player-sect-recruitment",
    "review-player-sect-applications",
    "resolve-morality-event-choice",
    "read-messages",
  ]).has(actionId);
}

export async function requestHealth(): Promise<RuntimeHealthResponse> {
  return requestJson<RuntimeHealthResponse>("/health");
}

export async function requestWorldStatus(): Promise<WorldStatusResponse> {
  return requestJson<WorldStatusResponse>("/world/status");
}

export async function requestPublicAgentDirectory(): Promise<PublicAgentDirectoryResponse> {
  return requestJson<PublicAgentDirectoryResponse>("/world/agents");
}

export async function requestPublicAgentState(agentId: string): Promise<PublicAgentStateResponse> {
  return requestJson<PublicAgentStateResponse>(`/world/agent/${encodeURIComponent(agentId)}`);
}

export async function requestAgentGuide(): Promise<string> {
  return requestText("/agent/guide");
}

export async function requestRegistrationQuestionnaire(): Promise<AgentRegistrationQuestionnaireResponse> {
  return requestJson<AgentRegistrationQuestionnaireResponse>("/agent/register/questions");
}

export async function registerAgent(payload: {
  name: string;
  answers?: Record<string, string>;
  record?: CultivationRegistrationRecord;
  genderPresentation?: AgentPersonaSyncRequest["genderPresentation"];
  pronouns?: string;
  age?: number;
  origin?: string;
  temperament?: string;
}): Promise<AgentRegistrationResponse> {
  return requestJson<AgentRegistrationResponse>(
    "/agent/register",
    createJsonInit("POST", payload),
  );
}

export const requestRegisterAgent = registerAgent;

export async function requestAgentBinding(agentId: string): Promise<AgentBindingResponse> {
  const search = new URLSearchParams({ agentId });
  return requestJson<AgentBindingResponse>(`/agent/binding?${search.toString()}`);
}

export async function requestAgentSyncPersona(payload: AgentPersonaSyncRequest, credential?: string): Promise<AgentPersonaSyncResponse> {
  return requestJson<AgentPersonaSyncResponse>(
    "/agent/sync-persona",
    createJsonInit("POST", payload, credential),
  );
}

export async function requestAgentState(credential: string): Promise<AgentStateResponse> {
  return requestJson<AgentStateResponse>(
    "/agent/state",
    createAuthInit(credential),
  );
}

export async function requestAgentActions(credential: string): Promise<AgentActionsResponse> {
  return requestJson<AgentActionsResponse>(
    "/agent/actions",
    createAuthInit(credential),
  );
}

export async function performAgentAction(
  credential: string,
  actionId: string,
): Promise<ActionExecutionResult> {
  return requestJson(
    "/agent/act",
    createJsonInit("POST", { actionId }, credential),
  );
}

export async function requestAgentMessages(credential: string): Promise<AgentMessagesResponse> {
  return requestJson<AgentMessagesResponse>(
    "/agent/messages",
    createAuthInit(credential),
  );
}

export async function requestSendAgentMessage(
  credential: string,
  payload: AgentSendMessageRequest,
): Promise<AgentSendMessageResponse> {
  return requestJson<AgentSendMessageResponse>(
    "/agent/messages",
    createJsonInit("POST", payload, credential),
  );
}

export async function requestAgentEvents(
  credential: string,
  options: { sinceTick?: number } = {},
): Promise<AgentEventsResponse> {
  const search = new URLSearchParams();

  if (typeof options.sinceTick === "number" && Number.isFinite(options.sinceTick)) {
    search.set("sinceTick", String(Math.max(0, Math.floor(options.sinceTick))));
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return requestJson<AgentEventsResponse>(
    `/agent/events${suffix}`,
    createAuthInit(credential),
  );
}

export async function requestAgentPendingChoice(
  credential: string,
): Promise<PendingMoralityChoiceResponseBody> {
  return requestJson<PendingMoralityChoiceResponseBody>(
    "/agent/events/pending",
    createAuthInit(credential),
  );
}

export async function requestResolveMoralityChoice(
  credential: string,
  payload: ResolveMoralityChoiceRequest,
): Promise<ResolveMoralityChoiceResponse> {
  return requestJson<ResolveMoralityChoiceResponse>(
    "/agent/events/choose",
    createJsonInit("POST", payload, credential),
  );
}

export async function requestAgentStrategy(credential: string): Promise<AgentStrategyResponse> {
  return requestJson<AgentStrategyResponse>(
    "/agent/strategy",
    createAuthInit(credential),
  );
}

export async function requestAgentSect(credential: string): Promise<AgentSectResponse> {
  return requestJson<AgentSectResponse>(
    "/agent/sect",
    createAuthInit(credential),
  );
}

export async function requestPlayerSectFoundingOptions(
  credential: string,
): Promise<PlayerSectFoundingOptionsResponse> {
  return requestJson<PlayerSectFoundingOptionsResponse>(
    "/agent/sects/founding-options",
    createAuthInit(credential),
  );
}

export async function requestFoundPlayerSect(
  credential: string,
  payload: FoundPlayerSectRequest,
): Promise<FoundPlayerSectResponse> {
  return requestJson<FoundPlayerSectResponse>(
    "/agent/sects/found",
    createJsonInit("POST", payload, credential),
  );
}

export async function requestPlayerSectRecruitment(
  credential: string,
  options: { limit?: number; cursor?: string } = {},
): Promise<PlayerSectRecruitmentResponse> {
  const search = new URLSearchParams();

  if (typeof options.limit === "number" && Number.isFinite(options.limit) && options.limit > 0) {
    search.set("limit", String(Math.floor(options.limit)));
  }

  if (options.cursor?.trim()) {
    search.set("cursor", options.cursor.trim());
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return requestJson<PlayerSectRecruitmentResponse>(
    `/agent/player-sects/recruitment${suffix}`,
    createAuthInit(credential),
  );
}

export async function requestPlayerSectApplications(
  credential: string,
  payload: PlayerSectApplicationRequest,
): Promise<PlayerSectApplicationResponse> {
  return requestJson<PlayerSectApplicationResponse>(
    "/agent/player-sect-applications",
    createJsonInit("POST", payload, credential),
  );
}

export async function requestSectApplications(
  credential: string,
  options: { limit?: number; cursor?: string } = {},
): Promise<SectApplicationsResponse> {
  const search = new URLSearchParams();

  if (typeof options.limit === "number" && Number.isFinite(options.limit) && options.limit > 0) {
    search.set("limit", String(Math.floor(options.limit)));
  }

  if (options.cursor?.trim()) {
    search.set("cursor", options.cursor.trim());
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return requestJson<SectApplicationsResponse>(
    `/agent/sect/applications${suffix}`,
    createAuthInit(credential),
  );
}

export async function requestReviewSectApplication(
  credential: string,
  payload: ReviewSectApplicationRequest,
): Promise<ReviewSectApplicationResponse> {
  return requestJson<ReviewSectApplicationResponse>(
    "/agent/sect/applications/review",
    createJsonInit("POST", payload, credential),
  );
}

export async function requestUpdateSectAdmissionPolicy(
  credential: string,
  payload: UpdateSectAdmissionPolicyRequest,
): Promise<UpdateSectAdmissionPolicyResponse> {
  return requestJson<UpdateSectAdmissionPolicyResponse>(
    "/agent/sect/admission-policy",
    createJsonInit("POST", payload, credential),
  );
}

export type DaoHeartResponse = DaoLogEntry[];

export async function requestDaoHeart(
  credential: string,
): Promise<DaoHeartResponse> {
  return requestJson(
    "/agent/dao-heart",
    createAuthInit(credential),
  );
}

export async function requestAgentRegistrationRecord(
  credential: string,
): Promise<CultivationRegistrationRecord | null> {
  return requestJson(
    "/agent/registration",
    createAuthInit(credential),
  );
}

export async function requestSaveAgentRegistrationRecord(
  credential: string,
  payload: AgentRegistrationRecordRequest,
): Promise<CultivationRegistrationRecord> {
  return requestJson(
    "/agent/registration",
    createJsonInit("POST", payload, credential),
  );
}

export async function requestAgentCredentialReset(
  credential: string,
): Promise<AgentCredentialResetResponse> {
  return requestJson<AgentCredentialResetResponse>(
    "/agent/credential/reset",
    createJsonInit("POST", {}, credential),
  );
}

export async function requestAgentWebhookBind(
  credential: string,
  webhookUrl: string,
): Promise<AgentWebhookBindResponse> {
  return requestJson<AgentWebhookBindResponse>(
    "/agent/webhook",
    createJsonInit("POST", { webhookUrl }, credential),
  );
}

export async function requestAgentTick(
  credential: string,
  steps = 1,
): Promise<AdvanceWorldResponse> {
  return requestJson(
    "/agent/tick",
    createJsonInit("POST", { steps }, credential),
  );
}

export async function requestWorldTick(
  steps = 1,
): Promise<AdvanceWorldResponse> {
  return requestJson(
    "/world/tick",
    createJsonInit("POST", { steps }),
  );
}

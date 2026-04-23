import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AgentStateResponse,
  AgentStrategyResponse,
  AgentActionsResponse,
  AgentEventsResponse,
  PendingMoralityChoiceResponseBody,
  AgentSectResponse,
  RuntimeHealthResponse,
  WorldStatusResponse,
  PublicAgentDirectoryResponse,
  PublicAgentDirectoryEntry,
  AgentBindingResponse,
  AgentCredentialResetResponse,
  AgentPersonaSyncRequest,
  AgentPersonaSyncResponse,
  AgentRegistrationRecordRequest,
  AgentRegistrationResponse,
  AgentRegistrationQuestionnaireResponse,
  AgentWebhookBindResponse,
  PublicAgentStateResponse,
  ResolveMoralityChoiceResponse,
  ResolveMoralityChoiceRequest,
  AgentSendMessageRequest,
  AgentSendMessageResponse,
  PlayerSectFoundingOptionsResponse,
  FoundPlayerSectRequest,
  FoundPlayerSectResponse,
  PlayerSectRecruitmentResponse,
  PlayerSectApplicationRequest,
  PlayerSectApplicationResponse,
  SectApplicationsResponse,
  ReviewSectApplicationRequest,
  ReviewSectApplicationResponse,
  UpdateSectAdmissionPolicyRequest,
  UpdateSectAdmissionPolicyResponse,
  AdvanceWorldResponse,
  ActionExecutionResult,
} from "../../../../packages/contracts/src/runtime-api.js";
import {
  performAgentAction,
  requestAgentActions,
  requestAgentBinding,
  requestAgentCredentialReset,
  requestAgentEvents,
  requestAgentMessages,
  requestAgentPendingChoice,
  requestAgentRegistrationRecord,
  requestAgentSect,
  requestAgentState,
  requestAgentStrategy,
  requestAgentSyncPersona,
  requestAgentTick,
  requestAgentWebhookBind,
  requestDaoHeart,
  requestFoundPlayerSect,
  requestHealth,
  requestPlayerSectApplications,
  requestPlayerSectFoundingOptions,
  requestPlayerSectRecruitment,
  requestPublicAgentDirectory,
  requestPublicAgentState,
  requestRegisterAgent,
  requestRegistrationQuestionnaire,
  requestResolveMoralityChoice,
  requestReviewSectApplication,
  requestSaveAgentRegistrationRecord,
  requestSectApplications,
  requestSendAgentMessage,
  requestUpdateSectAdmissionPolicy,
  requestWorldStatus,
  requestWorldTick,
  type DaoHeartResponse,
} from "./runtime-api";

const agentCredentialStorageKey = "immortal-claw.agent-credential";

export interface RuntimeSessionError {
  message: string;
  source:
    | "session"
    | "health"
    | "world"
    | "register"
    | "state"
    | "strategy"
    | "actions"
    | "messages"
    | "events"
    | "pending-choice"
    | "sect"
    | "dao-heart"
    | "registration-record"
    | "binding"
    | "public-agents"
    | "unknown";
}

export interface RuntimeSessionState {
  credential: string | null;
  isBound: boolean;
  isBootstrapping: boolean;
  isRefreshingAuthenticated: boolean;
  isRegistering: boolean;
  lastAuthenticatedAt: string | null;
  lastRegistrationResult: AgentRegistrationResponse | null;
  health: RuntimeHealthResponse | null;
  worldStatus: WorldStatusResponse | null;
  publicAgents: PublicAgentDirectoryEntry[];
  publicAgentDirectory: PublicAgentDirectoryResponse | null;
  agentState: AgentStateResponse | null;
  agentStrategy: AgentStrategyResponse | null;
  agentActions: AgentActionsResponse | null;
  agentMessages: AgentSendMessageResponse["message"][] | null;
  agentEvents: AgentEventsResponse | null;
  pendingChoice: PendingMoralityChoiceResponseBody | null;
  agentSect: AgentSectResponse | null;
  daoHeart: DaoHeartResponse | null;
  registrationRecord: ReturnType<typeof normalizeRegistrationRecord> | null;
  binding: AgentBindingResponse | null;
  lastError: RuntimeSessionError | null;
}

export interface RuntimeSessionContextValue extends RuntimeSessionState {
  bindCredential: (credential: string) => void;
  clearCredential: () => void;
  refreshPublicData: () => Promise<void>;
  refreshAuthenticatedData: () => Promise<void>;
  registerAgent: (payload: {
    name: string;
    answers: Record<string, string>;
    genderPresentation?: AgentPersonaSyncRequest["genderPresentation"];
    pronouns?: string;
    age?: number;
    origin?: string;
    temperament?: string;
  }) => Promise<AgentRegistrationResponse>;
  fetchRegistrationQuestionnaire: () => Promise<AgentRegistrationQuestionnaireResponse>;
  sendMessage: (payload: AgentSendMessageRequest) => Promise<AgentSendMessageResponse>;
  resolveMoralityChoice: (
    payload: ResolveMoralityChoiceRequest,
  ) => Promise<ResolveMoralityChoiceResponse>;
  resetCredential: () => Promise<AgentCredentialResetResponse>;
  bindWebhook: (webhookUrl: string) => Promise<AgentWebhookBindResponse>;
  syncPersona: (payload: AgentPersonaSyncRequest) => Promise<AgentPersonaSyncResponse>;
  saveRegistrationRecord: (
    payload: AgentRegistrationRecordRequest,
  ) => Promise<ReturnType<typeof normalizeRegistrationRecord>>;
  fetchFoundingOptions: () => Promise<PlayerSectFoundingOptionsResponse>;
  foundSect: (payload: FoundPlayerSectRequest) => Promise<FoundPlayerSectResponse>;
  fetchRecruitment: (options?: {
    limit?: number;
    cursor?: string;
  }) => Promise<PlayerSectRecruitmentResponse>;
  applyToSect: (payload: PlayerSectApplicationRequest) => Promise<PlayerSectApplicationResponse>;
  fetchSectApplications: (options?: {
    limit?: number;
    cursor?: string;
  }) => Promise<SectApplicationsResponse>;
  reviewSectApplication: (
    payload: ReviewSectApplicationRequest,
  ) => Promise<ReviewSectApplicationResponse>;
  updateSectAdmissionPolicy: (
    payload: UpdateSectAdmissionPolicyRequest,
  ) => Promise<UpdateSectAdmissionPolicyResponse>;
  performAction: (actionId: string) => Promise<ActionExecutionResult>;
  runAgentTick: (steps?: number) => Promise<AdvanceWorldResponse>;
  runWorldTick: (steps?: number) => Promise<AdvanceWorldResponse>;
  readPublicAgentState: (agentId: string) => Promise<PublicAgentStateResponse>;
}

const RuntimeSessionContext = createContext<RuntimeSessionContextValue | null>(null);

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

function readStoredCredential(): string | null {
  const storage = readBrowserStorage();

  if (!storage) {
    return null;
  }

  try {
    const value = storage.getItem(agentCredentialStorageKey);
    return typeof value === "string" && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

function writeStoredCredential(value: string): void {
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

function clearStoredCredential(): void {
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

function normalizeError(
  source: RuntimeSessionError["source"],
  error: unknown,
  fallbackMessage: string,
): RuntimeSessionError {
  return {
    source,
    message: error instanceof Error && error.message.trim() ? error.message : fallbackMessage,
  };
}

function normalizeRegistrationRecord(
  record: unknown,
): Record<string, unknown> | null {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return null;
  }

  return record as Record<string, unknown>;
}

export function resolveRuntimeSessionCredential(
  overrideCredential?: string | null,
  storedCredential?: string | null,
): string | null {
  const override = overrideCredential?.trim();

  if (override) {
    return override;
  }

  const stored = storedCredential?.trim();
  return stored ? stored : null;
}

const initialState: RuntimeSessionState = {
  credential: null,
  isBound: false,
  isBootstrapping: true,
  isRefreshingAuthenticated: false,
  isRegistering: false,
  lastAuthenticatedAt: null,
  lastRegistrationResult: null,
  health: null,
  worldStatus: null,
  publicAgents: [],
  publicAgentDirectory: null,
  agentState: null,
  agentStrategy: null,
  agentActions: null,
  agentMessages: null,
  agentEvents: null,
  pendingChoice: null,
  agentSect: null,
  daoHeart: null,
  registrationRecord: null,
  binding: null,
  lastError: null,
};

function useRuntimeSessionState(): RuntimeSessionContextValue {
  const [state, setState] = useState<RuntimeSessionState>(() => ({
    ...initialState,
    credential: readStoredCredential(),
    isBound: Boolean(readStoredCredential()),
  }));

  const setLastError = useCallback((error: RuntimeSessionError | null) => {
    setState((current) => ({
      ...current,
      lastError: error,
    }));
  }, []);

  const refreshPublicData = useCallback(async () => {
    try {
      const [health, worldStatus, publicAgentDirectory] = await Promise.all([
        requestHealth(),
        requestWorldStatus(),
        requestPublicAgentDirectory(),
      ]);

      setState((current) => ({
        ...current,
        health,
        worldStatus,
        publicAgentDirectory,
        publicAgents: Array.isArray(publicAgentDirectory.agents)
          ? publicAgentDirectory.agents
          : [],
        lastError:
          current.lastError?.source === "health" ||
          current.lastError?.source === "world" ||
          current.lastError?.source === "public-agents"
            ? null
            : current.lastError,
      }));
    } catch (error) {
      setLastError(normalizeError("public-agents", error, "Failed to load public runtime data."));
    }
  }, [setLastError]);

  const clearAuthenticatedState = useCallback(() => {
    setState((current) => ({
      ...current,
      credential: null,
      isBound: false,
      isRefreshingAuthenticated: false,
      isRegistering: false,
      lastAuthenticatedAt: null,
      lastRegistrationResult: null,
      agentState: null,
      agentStrategy: null,
      agentActions: null,
      agentMessages: null,
      agentEvents: null,
      pendingChoice: null,
      agentSect: null,
      daoHeart: null,
      registrationRecord: null,
      binding: null,
      lastError: null,
    }));
  }, []);

  const bindCredential = useCallback((credential: string) => {
    const normalized = credential.trim();

    if (!normalized) {
      return;
    }

    writeStoredCredential(normalized);
    setState((current) => ({
      ...current,
      credential: normalized,
      isBound: true,
      lastError: null,
    }));
  }, []);

  const clearCredential = useCallback(() => {
    clearStoredCredential();
    clearAuthenticatedState();
  }, [clearAuthenticatedState]);

  const refreshAuthenticatedData = useCallback(async (credentialOverride?: string | null) => {
    const credential = resolveRuntimeSessionCredential(credentialOverride, state.credential);

    if (!credential) {
      return;
    }

    setState((current) => ({
      ...current,
      isRefreshingAuthenticated: true,
    }));

    try {
      const [
        agentState,
        agentStrategy,
        agentActions,
        agentMessages,
        agentEvents,
        pendingChoice,
        agentSect,
        daoHeart,
        registrationRecord,
      ] = await Promise.all([
        requestAgentState(credential),
        requestAgentStrategy(credential),
        requestAgentActions(credential),
        requestAgentMessages(credential),
        requestAgentEvents(credential),
        requestAgentPendingChoice(credential),
        requestAgentSect(credential),
        requestDaoHeart(credential),
        requestAgentRegistrationRecord(credential),
      ]);

      const binding = await requestAgentBinding(agentState.agent.agentId);

      setState((current) => ({
        ...current,
        isBound: true,
        isRefreshingAuthenticated: false,
        lastAuthenticatedAt: new Date().toISOString(),
        agentState,
        agentStrategy,
        agentActions,
        agentMessages,
        agentEvents,
        pendingChoice,
        agentSect,
        daoHeart,
        registrationRecord: normalizeRegistrationRecord(registrationRecord),
        binding,
        lastError: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        isRefreshingAuthenticated: false,
      }));
      setLastError(
        normalizeError("session", error, "Failed to refresh authenticated runtime state."),
      );
    }
  }, [setLastError, state.credential]);

  useEffect(() => {
    void refreshPublicData().finally(() => {
      setState((current) => ({
        ...current,
        isBootstrapping: false,
      }));
    });
  }, [refreshPublicData]);

  useEffect(() => {
    if (!state.credential) {
      return;
    }

    void refreshAuthenticatedData();
  }, [refreshAuthenticatedData, state.credential]);

  const fetchRegistrationQuestionnaire = useCallback(async () => {
    try {
      return await requestRegistrationQuestionnaire();
    } catch (error) {
      const normalized = normalizeError(
        "register",
        error,
        "Failed to load registration questionnaire.",
      );
      setLastError(normalized);
      throw new Error(normalized.message);
    }
  }, [setLastError]);

  const registerAgent = useCallback<
    RuntimeSessionContextValue["registerAgent"]
  >(
    async (payload) => {
      setState((current) => ({
        ...current,
        isRegistering: true,
      }));

      try {
        const result = await requestRegisterAgent(payload);
        writeStoredCredential(result.credential);

        setState((current) => ({
          ...current,
          credential: result.credential,
          isBound: true,
          isRegistering: false,
          lastRegistrationResult: result,
          agentState: result,
          lastAuthenticatedAt: new Date().toISOString(),
          lastError: null,
        }));

        await Promise.all([refreshPublicData(), refreshAuthenticatedData(result.credential)]);
        return result;
      } catch (error) {
        const normalized = normalizeError("register", error, "Failed to register agent.");
        setState((current) => ({
          ...current,
          isRegistering: false,
          lastError: normalized,
        }));
        throw new Error(normalized.message);
      }
    },
    [refreshAuthenticatedData, refreshPublicData],
  );

  const sendMessage = useCallback<RuntimeSessionContextValue["sendMessage"]>(
    async (payload) => {
      const credential = state.credential?.trim();

      if (!credential) {
        throw new Error("No agent credential is currently bound.");
      }

      try {
        const response = await requestSendAgentMessage(credential, payload);
        await refreshAuthenticatedData(credential);
        return response;
      } catch (error) {
        const normalized = normalizeError("messages", error, "Failed to send private message.");
        setLastError(normalized);
        throw new Error(normalized.message);
      }
    },
    [refreshAuthenticatedData, setLastError, state.credential],
  );

  const resolveMoralityChoice = useCallback<
    RuntimeSessionContextValue["resolveMoralityChoice"]
  >(
    async (payload) => {
      const credential = state.credential?.trim();

      if (!credential) {
        throw new Error("No agent credential is currently bound.");
      }

      try {
        const response = await requestResolveMoralityChoice(credential, payload);
        await refreshAuthenticatedData(credential);
        return response;
      } catch (error) {
        const normalized = normalizeError(
          "pending-choice",
          error,
          "Failed to resolve the pending morality choice.",
        );
        setLastError(normalized);
        throw new Error(normalized.message);
      }
    },
    [refreshAuthenticatedData, setLastError, state.credential],
  );

  const resetCredential = useCallback<RuntimeSessionContextValue["resetCredential"]>(
    async () => {
      const credential = state.credential?.trim();

      if (!credential) {
        throw new Error("No agent credential is currently bound.");
      }

      try {
        const response = await requestAgentCredentialReset(credential);
        writeStoredCredential(response.credential);

        setState((current) => ({
          ...current,
          credential: response.credential,
          isBound: true,
          lastError: null,
        }));

        await refreshAuthenticatedData(response.credential);
        return response;
      } catch (error) {
        const normalized = normalizeError(
          "session",
          error,
          "Failed to reset the bound agent credential.",
        );
        setLastError(normalized);
        throw new Error(normalized.message);
      }
    },
    [refreshAuthenticatedData, setLastError, state.credential],
  );

  const bindWebhook = useCallback<RuntimeSessionContextValue["bindWebhook"]>(
    async (webhookUrl) => {
      const credential = state.credential?.trim();

      if (!credential) {
        throw new Error("No agent credential is currently bound.");
      }

      try {
        const response = await requestAgentWebhookBind(credential, webhookUrl);
        await refreshAuthenticatedData(credential);
        return response;
      } catch (error) {
        const normalized = normalizeError("session", error, "Failed to bind webhook URL.");
        setLastError(normalized);
        throw new Error(normalized.message);
      }
    },
    [refreshAuthenticatedData, setLastError, state.credential],
  );

  const syncPersona = useCallback<RuntimeSessionContextValue["syncPersona"]>(
    async (payload) => {
      const credential = resolveRuntimeSessionCredential(undefined, state.credential);

      try {
        const response = await requestAgentSyncPersona(payload, credential ?? undefined);
        if (credential) {
          await refreshAuthenticatedData(credential);
        }
        return response;
      } catch (error) {
        const normalized = normalizeError("binding", error, "Failed to sync persona.");
        setLastError(normalized);
        throw new Error(normalized.message);
      }
    },
    [refreshAuthenticatedData, setLastError, state.credential],
  );

  const saveRegistrationRecord = useCallback<
    RuntimeSessionContextValue["saveRegistrationRecord"]
  >(
    async (payload) => {
      const credential = state.credential?.trim();

      if (!credential) {
        throw new Error("No agent credential is currently bound.");
      }

      try {
        const response = await requestSaveAgentRegistrationRecord(credential, payload);
        const normalized = normalizeRegistrationRecord(response);

        setState((current) => ({
          ...current,
          registrationRecord: normalized,
          lastError: null,
        }));

        await refreshAuthenticatedData(credential);
        return normalized;
      } catch (error) {
        const normalized = normalizeError(
          "registration-record",
          error,
          "Failed to save registration record.",
        );
        setLastError(normalized);
        throw new Error(normalized.message);
      }
    },
    [refreshAuthenticatedData, setLastError, state.credential],
  );

  const fetchFoundingOptions = useCallback<
    RuntimeSessionContextValue["fetchFoundingOptions"]
  >(async () => {
    const credential = state.credential?.trim();

    if (!credential) {
      throw new Error("No agent credential is currently bound.");
    }

    try {
      return await requestPlayerSectFoundingOptions(credential);
    } catch (error) {
      const normalized = normalizeError("sect", error, "Failed to read sect founding options.");
      setLastError(normalized);
      throw new Error(normalized.message);
    }
  }, [setLastError, state.credential]);

  const foundSect = useCallback<RuntimeSessionContextValue["foundSect"]>(
    async (payload) => {
      const credential = state.credential?.trim();

      if (!credential) {
        throw new Error("No agent credential is currently bound.");
      }

      try {
        const response = await requestFoundPlayerSect(credential, payload);
        await refreshAuthenticatedData(credential);
        return response;
      } catch (error) {
        const normalized = normalizeError("sect", error, "Failed to found player sect.");
        setLastError(normalized);
        throw new Error(normalized.message);
      }
    },
    [refreshAuthenticatedData, setLastError, state.credential],
  );

  const fetchRecruitment = useCallback<RuntimeSessionContextValue["fetchRecruitment"]>(
    async (options) => {
      const credential = state.credential?.trim();

      if (!credential) {
        throw new Error("No agent credential is currently bound.");
      }

      try {
        return await requestPlayerSectRecruitment(credential, options);
      } catch (error) {
        const normalized = normalizeError("sect", error, "Failed to load sect recruitment.");
        setLastError(normalized);
        throw new Error(normalized.message);
      }
    },
    [setLastError, state.credential],
  );

  const applyToSect = useCallback<RuntimeSessionContextValue["applyToSect"]>(
    async (payload) => {
      const credential = state.credential?.trim();

      if (!credential) {
        throw new Error("No agent credential is currently bound.");
      }

      try {
        const response = await requestPlayerSectApplications(credential, payload);
        await refreshAuthenticatedData(credential);
        return response;
      } catch (error) {
        const normalized = normalizeError("sect", error, "Failed to apply to player sect.");
        setLastError(normalized);
        throw new Error(normalized.message);
      }
    },
    [refreshAuthenticatedData, setLastError, state.credential],
  );

  const fetchSectApplications = useCallback<
    RuntimeSessionContextValue["fetchSectApplications"]
  >(
    async (options) => {
      const credential = state.credential?.trim();

      if (!credential) {
        throw new Error("No agent credential is currently bound.");
      }

      try {
        return await requestSectApplications(credential, options);
      } catch (error) {
        const normalized = normalizeError("sect", error, "Failed to load sect applications.");
        setLastError(normalized);
        throw new Error(normalized.message);
      }
    },
    [setLastError, state.credential],
  );

  const reviewSectApplication = useCallback<
    RuntimeSessionContextValue["reviewSectApplication"]
  >(
    async (payload) => {
      const credential = state.credential?.trim();

      if (!credential) {
        throw new Error("No agent credential is currently bound.");
      }

      try {
        const response = await requestReviewSectApplication(credential, payload);
        await refreshAuthenticatedData(credential);
        return response;
      } catch (error) {
        const normalized = normalizeError(
          "sect",
          error,
          "Failed to review player sect application.",
        );
        setLastError(normalized);
        throw new Error(normalized.message);
      }
    },
    [refreshAuthenticatedData, setLastError, state.credential],
  );

  const updateSectAdmissionPolicy = useCallback<
    RuntimeSessionContextValue["updateSectAdmissionPolicy"]
  >(
    async (payload) => {
      const credential = state.credential?.trim();

      if (!credential) {
        throw new Error("No agent credential is currently bound.");
      }

      try {
        const response = await requestUpdateSectAdmissionPolicy(credential, payload);
        await refreshAuthenticatedData(credential);
        return response;
      } catch (error) {
        const normalized = normalizeError(
          "sect",
          error,
          "Failed to update sect admission policy.",
        );
        setLastError(normalized);
        throw new Error(normalized.message);
      }
    },
    [refreshAuthenticatedData, setLastError, state.credential],
  );

  const performAction = useCallback<RuntimeSessionContextValue["performAction"]>(
    async (actionId) => {
      const credential = state.credential?.trim();

      if (!credential) {
        throw new Error("No agent credential is currently bound.");
      }

      try {
        const response = await performAgentAction(credential, actionId);
        await refreshAuthenticatedData(credential);
        await refreshPublicData();
        return response;
      } catch (error) {
        const normalized = normalizeError("actions", error, "Failed to execute runtime action.");
        setLastError(normalized);
        throw new Error(normalized.message);
      }
    },
    [refreshAuthenticatedData, refreshPublicData, setLastError, state.credential],
  );

  const runAgentTick = useCallback<RuntimeSessionContextValue["runAgentTick"]>(
    async (steps) => {
      const credential = state.credential?.trim();

      if (!credential) {
        throw new Error("No agent credential is currently bound.");
      }

      try {
        const response = await requestAgentTick(credential, steps);
        await refreshAuthenticatedData(credential);
        await refreshPublicData();
        return response;
      } catch (error) {
        const normalized = normalizeError("world", error, "Failed to advance agent tick.");
        setLastError(normalized);
        throw new Error(normalized.message);
      }
    },
    [refreshAuthenticatedData, refreshPublicData, setLastError, state.credential],
  );

  const runWorldTick = useCallback<RuntimeSessionContextValue["runWorldTick"]>(
    async (steps) => {
      try {
        const response = await requestWorldTick(steps);
        await refreshPublicData();
        if (state.credential) {
          await refreshAuthenticatedData(state.credential);
        }
        return response;
      } catch (error) {
        const normalized = normalizeError("world", error, "Failed to advance world tick.");
        setLastError(normalized);
        throw new Error(normalized.message);
      }
    },
    [refreshAuthenticatedData, refreshPublicData, setLastError, state.credential],
  );

  const readPublicAgentState = useCallback<RuntimeSessionContextValue["readPublicAgentState"]>(
    async (agentId) => {
      try {
        return await requestPublicAgentState(agentId);
      } catch (error) {
        const normalized = normalizeError("public-agents", error, "Failed to load public agent.");
        setLastError(normalized);
        throw new Error(normalized.message);
      }
    },
    [setLastError],
  );

  return useMemo(
    () => ({
      ...state,
      bindCredential,
      clearCredential,
      refreshPublicData,
      refreshAuthenticatedData,
      registerAgent,
      fetchRegistrationQuestionnaire,
      sendMessage,
      resolveMoralityChoice,
      resetCredential,
      bindWebhook,
      syncPersona,
      saveRegistrationRecord,
      fetchFoundingOptions,
      foundSect,
      fetchRecruitment,
      applyToSect,
      fetchSectApplications,
      reviewSectApplication,
      updateSectAdmissionPolicy,
      performAction,
      runAgentTick,
      runWorldTick,
      readPublicAgentState,
    }),
    [
      applyToSect,
      bindCredential,
      bindWebhook,
      clearCredential,
      fetchFoundingOptions,
      fetchRecruitment,
      fetchRegistrationQuestionnaire,
      fetchSectApplications,
      foundSect,
      readPublicAgentState,
      refreshAuthenticatedData,
      refreshPublicData,
      registerAgent,
      resolveMoralityChoice,
      resetCredential,
      reviewSectApplication,
      performAction,
      runAgentTick,
      runWorldTick,
      saveRegistrationRecord,
      sendMessage,
      state,
      syncPersona,
      updateSectAdmissionPolicy,
    ],
  );
}

export interface RuntimeSessionProviderProps {
  children: ReactNode;
}

export function RuntimeSessionProvider({ children }: RuntimeSessionProviderProps) {
  const value = useRuntimeSessionState();
  return (
    <RuntimeSessionContext.Provider value={value}>
      {children}
    </RuntimeSessionContext.Provider>
  );
}

export function useRuntimeSession() {
  const context = useContext(RuntimeSessionContext);

  if (!context) {
    throw new Error("useRuntimeSession must be used within RuntimeSessionProvider.");
  }

  return context;
}

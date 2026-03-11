import { normalizeRuntimeBaseUrl, type RuntimeBaseUrlMeta } from "./env";

export interface RuntimeClientOptions {
  baseUrl?: string | null;
  fetchImpl?: typeof fetch;
  meta?: RuntimeBaseUrlMeta;
}

export interface RuntimeClientError extends Error {
  payload?: unknown;
  status: number;
}

function readRuntimeBaseUrlInput(meta: RuntimeBaseUrlMeta | undefined): string | undefined {
  return (meta ?? (import.meta as RuntimeBaseUrlMeta)).env?.VITE_RUNTIME_BASE_URL;
}

async function createRuntimeClientError(response: Response): Promise<RuntimeClientError> {
  const contentType = response.headers.get("content-type") ?? "";
  let payload: unknown;
  let message = `Runtime request failed with status ${response.status}.`;

  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();

      if (typeof payload === "object" && payload !== null) {
        const errorMessage =
          typeof (payload as { error?: unknown }).error === "string"
            ? (payload as { error: string }).error
            : typeof (payload as { message?: unknown }).message === "string"
              ? (payload as { message: string }).message
              : null;

        if (errorMessage) {
          message = errorMessage;
        }
      }
    } catch {
      payload = undefined;
    }
  }

  return Object.assign(new Error(message), {
    payload,
    status: response.status,
  });
}

export function createRuntimeClient(options: RuntimeClientOptions = {}) {
  const rawBaseUrl = options.baseUrl ?? readRuntimeBaseUrlInput(options.meta);
  const baseUrl = normalizeRuntimeBaseUrl(rawBaseUrl);

  if (!rawBaseUrl?.trim()) {
    throw new Error("Runtime base URL is not configured.");
  }

  if (!baseUrl) {
    throw new Error("Runtime base URL must be an absolute http/https URL.");
  }

  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async request(path: string, init?: RequestInit) {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const response = await fetchImpl(`${baseUrl}${normalizedPath}`, init);

      if (!response.ok) {
        throw await createRuntimeClientError(response);
      }

      return response;
    },
  };
}

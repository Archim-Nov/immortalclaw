import { readRuntimeBaseUrl } from "./env.js";

export interface RuntimeClientOptions {
  baseUrl?: string | null;
  fetchImpl?: typeof fetch;
}

export function createRuntimeClient(options: RuntimeClientOptions = {}) {
  const baseUrl = options.baseUrl ?? readRuntimeBaseUrl();
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async request(path: string, init?: RequestInit) {
      if (!baseUrl) {
        throw new Error("Runtime base URL is not configured.");
      }

      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      return fetchImpl(`${baseUrl}${normalizedPath}`, init);
    },
  };
}

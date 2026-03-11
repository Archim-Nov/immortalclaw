export interface RuntimeBaseUrlEnv {
  VITE_RUNTIME_BASE_URL?: string;
}

export interface RuntimeBaseUrlMeta {
  env?: RuntimeBaseUrlEnv;
}

function normalizeRuntimeBaseUrl(value: string | undefined): string | null {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue.replace(/\/$/, "") : null;
}

export function readRuntimeBaseUrl(meta: RuntimeBaseUrlMeta = import.meta as RuntimeBaseUrlMeta): string | null {
  return normalizeRuntimeBaseUrl(meta.env?.VITE_RUNTIME_BASE_URL);
}

export interface RuntimeBaseUrlEnv {
  VITE_RUNTIME_BASE_URL?: string;
}

export interface RuntimeBaseUrlMeta {
  env?: RuntimeBaseUrlEnv;
}

let runtimeBaseUrlMetaOverride: RuntimeBaseUrlMeta | null = null;

function normalizeRuntimeBaseUrl(value: string | undefined): string | null {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue.replace(/\/$/, "") : null;
}

export function setRuntimeBaseUrlMetaOverride(meta: RuntimeBaseUrlMeta | null) {
  runtimeBaseUrlMetaOverride = meta;
}

export function readRuntimeBaseUrl(meta: RuntimeBaseUrlMeta = import.meta as RuntimeBaseUrlMeta): string | null {
  if (runtimeBaseUrlMetaOverride) {
    return normalizeRuntimeBaseUrl(runtimeBaseUrlMetaOverride.env?.VITE_RUNTIME_BASE_URL);
  }

  return normalizeRuntimeBaseUrl(meta.env?.VITE_RUNTIME_BASE_URL);
}

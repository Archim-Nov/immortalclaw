export interface RuntimeBaseUrlEnv {
  VITE_RUNTIME_BASE_URL?: string;
}

export interface RuntimeBaseUrlMeta {
  env?: RuntimeBaseUrlEnv;
}

export function normalizeRuntimeBaseUrl(value: string | null | undefined): string | null {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return null;
  }

  const normalizedValue = trimmedValue.replace(/\/$/, "");

  try {
    const url = new URL(normalizedValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return normalizedValue;
  } catch {
    return null;
  }
}

export function readRuntimeBaseUrl(meta: RuntimeBaseUrlMeta = import.meta as RuntimeBaseUrlMeta): string | null {
  return normalizeRuntimeBaseUrl(meta.env?.VITE_RUNTIME_BASE_URL);
}

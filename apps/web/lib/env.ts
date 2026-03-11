export interface RuntimeBaseUrlEnv {
  VITE_RUNTIME_BASE_URL?: string;
  NEXT_PUBLIC_RUNTIME_BASE_URL?: string;
}

function readDefaultRuntimeBaseUrlEnv(): RuntimeBaseUrlEnv {
  const viteEnv = (import.meta as ImportMeta & { env?: RuntimeBaseUrlEnv }).env;

  if (viteEnv) {
    return viteEnv;
  }

  if (typeof process !== "undefined") {
    return process.env as RuntimeBaseUrlEnv;
  }

  return {};
}

export function readRuntimeBaseUrl(env: RuntimeBaseUrlEnv = readDefaultRuntimeBaseUrlEnv()): string | null {
  const value = env.VITE_RUNTIME_BASE_URL?.trim() ?? env.NEXT_PUBLIC_RUNTIME_BASE_URL?.trim();
  return value ? value.replace(/\/$/, "") : null;
}

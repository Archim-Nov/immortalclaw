export interface RuntimeBaseUrlEnv {
  NEXT_PUBLIC_RUNTIME_BASE_URL?: string;
}

export function readRuntimeBaseUrl(env: RuntimeBaseUrlEnv = process.env as RuntimeBaseUrlEnv): string | null {
  const value = env.NEXT_PUBLIC_RUNTIME_BASE_URL?.trim();
  return value ? value.replace(/\/$/, "") : null;
}

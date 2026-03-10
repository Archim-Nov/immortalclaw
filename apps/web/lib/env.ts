export function readRuntimeBaseUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const value = env.NEXT_PUBLIC_RUNTIME_BASE_URL?.trim();
  return value ? value.replace(/\/$/, "") : null;
}

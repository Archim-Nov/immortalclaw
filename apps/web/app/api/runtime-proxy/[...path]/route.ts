import type { RuntimeBaseUrlEnv } from "../../../../lib/env.js";
import { createRuntimeClient } from "../../../../lib/runtime-client.js";

export async function forwardRuntimeRequest(
  request: Request,
  pathSegments: string[],
  env: RuntimeBaseUrlEnv = process.env as RuntimeBaseUrlEnv,
  fetchImpl: typeof fetch = fetch,
) {
  const client = createRuntimeClient({
    baseUrl: env.NEXT_PUBLIC_RUNTIME_BASE_URL?.trim() ?? null,
    fetchImpl,
  });
  const url = new URL(request.url);
  const path = pathSegments.join("/");
  const proxiedResponse = await client.request(`/${path}${url.search}`, {
    method: request.method,
    headers: new Headers(request.headers),
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
  });

  return proxiedResponse;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forwardRuntimeRequest(request, path);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forwardRuntimeRequest(request, path);
}

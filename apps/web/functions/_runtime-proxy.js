function normalizeRuntimeProxyBaseUrl(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const normalizedValue = trimmedValue.replace(/\/+$/, "");

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

export function readRuntimeProxyBaseUrl(env = {}) {
  return (
    normalizeRuntimeProxyBaseUrl(env.RUNTIME_PROXY_BASE_URL) ??
    normalizeRuntimeProxyBaseUrl(env.RUNTIME_BASE_URL) ??
    normalizeRuntimeProxyBaseUrl(env.VITE_RUNTIME_BASE_URL)
  );
}

export function buildRuntimeProxyUrl(requestUrl, runtimeBaseUrl) {
  const incomingUrl = new URL(requestUrl);
  return new URL(`${incomingUrl.pathname}${incomingUrl.search}`, `${runtimeBaseUrl}/`).toString();
}

export async function onRequest(context) {
  const runtimeBaseUrl = readRuntimeProxyBaseUrl(context.env);
  if (!runtimeBaseUrl) {
    return new Response("Runtime proxy is not configured.", {
      status: 500,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  const upstreamRequest = new Request(
    buildRuntimeProxyUrl(context.request.url, runtimeBaseUrl),
    context.request,
  );
  const upstreamResponse = await fetch(upstreamRequest);
  const headers = new Headers(upstreamResponse.headers);
  headers.set("x-immortal-proxy", "pages");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}

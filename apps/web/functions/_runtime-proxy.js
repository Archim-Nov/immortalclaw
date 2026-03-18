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
    return new Response(
      JSON.stringify({ error: "Runtime proxy is not configured. Set RUNTIME_PROXY_BASE_URL or VITE_RUNTIME_BASE_URL in the Pages environment." }),
      {
        status: 502,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-immortal-proxy": "pages",
        },
      },
    );
  }

  const upstreamUrl = buildRuntimeProxyUrl(context.request.url, runtimeBaseUrl);
  const upstreamRequest = new Request(upstreamUrl, context.request);

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(upstreamRequest);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: `Runtime worker is unreachable at ${runtimeBaseUrl}: ${error instanceof Error ? error.message : "unknown error"}`,
      }),
      {
        status: 502,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-immortal-proxy": "pages",
        },
      },
    );
  }

  const headers = new Headers(upstreamResponse.headers);
  headers.set("x-immortal-proxy", "pages");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}

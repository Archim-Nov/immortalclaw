import type { AuthClient, WorldRepository } from "@immortal-claw/persistence";

export const LOCAL_VITE_DEV_PORT = 5173;
export const LOCAL_VITE_PREVIEW_PORT = 4173;
export const LOCAL_VITE_DEV_ORIGIN = `http://localhost:${LOCAL_VITE_DEV_PORT}`;
export const LOCAL_VITE_PREVIEW_ORIGIN = `http://localhost:${LOCAL_VITE_PREVIEW_PORT}`;

export interface WorldDOEnv {
  FRONTEND_ORIGIN?: string;
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  WORLD_TICK_STEPS?: string;
  WORLD_RESET_TOKEN?: string;
}

export interface WorldDOHonoEnv {
  Bindings: WorldDOEnv;
  Variables: {
    world: WorldRepository;
    auth: AuthClient;
  };
}

function invalidFrontendOriginError() {
  return new Error(
    "FRONTEND_ORIGIN must be a valid absolute http:// or https:// origin like https://immortal-claw.pages.dev",
  );
}

function readAbsoluteOriginUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    url.username !== "" ||
    url.password !== ""
  ) {
    return null;
  }

  return url;
}

function isDnsLabel(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(value);
}

function isPagesProjectOrigin(url: URL): boolean {
  const labels = url.hostname.split(".");
  return labels.length === 3 && labels[1] === "pages" && labels[2] === "dev" && isDnsLabel(labels[0]);
}

function isPagesPreviewOrigin(originUrl: URL, frontendUrl: URL): boolean {
  if (!isPagesProjectOrigin(frontendUrl)) {
    return false;
  }

  if (originUrl.protocol !== frontendUrl.protocol || originUrl.port !== frontendUrl.port) {
    return false;
  }

  const frontendLabels = frontendUrl.hostname.split(".");
  const originLabels = originUrl.hostname.split(".");
  if (originLabels.length !== frontendLabels.length + 1) {
    return false;
  }

  return originUrl.hostname.endsWith(`.${frontendUrl.hostname}`) && isDnsLabel(originLabels[0]);
}

export function readFrontendOrigin(bindings?: Pick<WorldDOEnv, "FRONTEND_ORIGIN">): string {
  const trimmed = bindings?.FRONTEND_ORIGIN?.trim();
  if (!trimmed) {
    throw new Error("FRONTEND_ORIGIN must be configured.");
  }

  const url = readAbsoluteOriginUrl(trimmed);
  if (!url) {
    throw invalidFrontendOriginError();
  }

  return url.origin;
}

export function resolveCorsOrigins(bindings?: Pick<WorldDOEnv, "FRONTEND_ORIGIN">): string[] {
  return [
    ...new Set([
      readFrontendOrigin(bindings),
      LOCAL_VITE_DEV_ORIGIN,
      LOCAL_VITE_PREVIEW_ORIGIN,
    ]),
  ];
}

export function isAllowedCorsOrigin(origin: string, bindings?: Pick<WorldDOEnv, "FRONTEND_ORIGIN">): boolean {
  const originUrl = readAbsoluteOriginUrl(origin);
  if (!originUrl) {
    return false;
  }

  const normalizedOrigin = originUrl.origin;
  const frontendOrigin = readFrontendOrigin(bindings);
  if (
    normalizedOrigin === frontendOrigin ||
    normalizedOrigin === LOCAL_VITE_DEV_ORIGIN ||
    normalizedOrigin === LOCAL_VITE_PREVIEW_ORIGIN
  ) {
    return true;
  }

  return isPagesPreviewOrigin(originUrl, new URL(frontendOrigin));
}

export function readTickSteps(bindings: Pick<WorldDOEnv, "WORLD_TICK_STEPS">): number {
  const parsed = Number(bindings.WORLD_TICK_STEPS ?? 1);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.max(1, Math.min(20, Math.floor(parsed)));
}

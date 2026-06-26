// End-to-end smoke test for the self-hosted Node server (apps/server) over real HTTP.
// Unlike smoke-questionnaire-to-register.mjs (which drives the Hono app in-process),
// this exercises the full self-hosted stack: @hono/node-server transport,
// node:sqlite world repository, and the local SqliteAuthClient.
//
// Usage: BASE_URL=http://127.0.0.1:8799 node --import tsx scripts/smoke-self-host.mjs

import { buildQuestionnaireDrivenAgentPayload } from "./lib/questionnaire-registration.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:8799";

async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status} ${JSON.stringify(json)}`);
  }
  return json;
}

function pickActionId(actionsPayload) {
  const actions = Array.isArray(actionsPayload) ? actionsPayload : actionsPayload?.actions ?? [];
  const first = actions[0];
  if (!first) return null;
  return first.id ?? first.actionId ?? null;
}

async function main() {
  const steps = [];
  const log = (label, detail) => {
    steps.push({ label, detail });
    console.log(`✓ ${label}${detail ? ` — ${detail}` : ""}`);
  };

  // 1. health
  const health = await call("GET", "/health");
  if (!health.ok) throw new Error(`/health not ok: ${JSON.stringify(health)}`);
  log("health", health.service ?? "ok");

  // 2. world status (capture starting tick)
  const status0 = await call("GET", "/world/status");
  log("world/status", `tick=${status0.tick}`);

  // 3. questionnaire definition
  const questions = await call("GET", "/agent/register/questions");
  log("register/questions", `version=${questions.version}, count=${questions.questions?.length ?? 0}`);

  // 4. register an agent (questionnaire-driven payload)
  const { payload } = buildQuestionnaireDrivenAgentPayload(20260626);
  const register = await call("POST", "/agent/register", { body: payload });
  if (!register.credential) throw new Error(`register returned no credential: ${JSON.stringify(register)}`);
  log("agent/register", `agentId=${register.agentId}, cultivator=${register.selectedCultivatorId}`);
  const token = register.credential;

  // 5. authenticated state (proves SqliteAuthClient auth + world hydrate)
  const state = await call("GET", "/agent/state", { token });
  log("agent/state", `tick=${state.tick}, cultivator=${state.cultivator?.name} (${state.cultivator?.realm})`);

  // 6. list available actions
  const actionsPayload = await call("GET", "/agent/actions", { token });
  const actionId = pickActionId(actionsPayload);
  if (!actionId) throw new Error(`no available action: ${JSON.stringify(actionsPayload).slice(0, 300)}`);
  log("agent/actions", `picked actionId=${actionId}`);

  // 7. perform the action
  const actResult = await call("POST", "/agent/act", { token, body: { actionId } });
  log("agent/act", `accepted=${actResult.accepted ?? actResult.ok ?? "?"}`);

  // 8. advance the world a few steps and confirm the tick moved
  const tickSummary = await call("POST", "/world/tick", { body: { steps: 3 } });
  const status1 = await call("GET", "/world/status");
  if (!(status1.tick > status0.tick)) {
    throw new Error(`tick did not advance: ${status0.tick} -> ${status1.tick}`);
  }
  log("world/tick", `tick ${status0.tick} -> ${status1.tick} (advanced ${tickSummary.advancedTicks ?? "?"})`);

  // 9. read events
  const events = await call("GET", "/agent/events", { token });
  const eventCount = Array.isArray(events) ? events.length : events?.events?.length ?? "?";
  log("agent/events", `events=${eventCount}`);

  console.log(`\nALL_OK ${steps.length} steps against ${BASE_URL}`);
}

main().catch((error) => {
  console.error(`SMOKE_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

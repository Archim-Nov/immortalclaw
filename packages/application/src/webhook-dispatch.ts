import type { TickSummary, WorldState } from "../../domain/src/runtime.js";
import type { WebhookWakePayload } from "../../contracts/src/runtime-api.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";

export interface WebhookTarget {
  agentId: string;
  webhookUrl: string;
  webhookSecret: string;
  payload: WebhookWakePayload;
}

function buildCultivatorToAgentMap(world: WorldState): Map<string, string> {
  const map = new Map<string, string>();

  for (const binding of Object.values(world.agentBindings)) {
    for (const cultivatorId of binding.cultivatorIds) {
      map.set(cultivatorId, binding.agentId);
    }
  }

  return map;
}

function buildAgentLookup(agentProfiles: AgentProfileRecord[]): Map<string, AgentProfileRecord> {
  const lookup = new Map<string, AgentProfileRecord>();
  for (const profile of agentProfiles) {
    lookup.set(profile.agentId, profile);
  }
  return lookup;
}

function buildWakePayload(event: WebhookWakePayload["event"], tick: number, reason: string): WebhookWakePayload {
  return {
    event,
    tick,
    reason,
  };
}

function resolveTargetProfile(
  agentLookup: Map<string, AgentProfileRecord>,
  agentId: string,
): AgentProfileRecord | null {
  const profile = agentLookup.get(agentId);
  if (!profile?.webhookUrl || !profile.webhookSecret) {
    return null;
  }
  return profile;
}

export function resolveWebhookTargets(
  world: WorldState,
  tickSummary: TickSummary,
  agentProfiles: AgentProfileRecord[],
): WebhookTarget[] {
  const cultivatorToAgent = buildCultivatorToAgentMap(world);
  const agentLookup = buildAgentLookup(agentProfiles);
  const targets: WebhookTarget[] = [];

  for (const job of tickSummary.completedJobs) {
    const agentId = cultivatorToAgent.get(job.cultivatorId);
    if (!agentId) continue;
    const profile = resolveTargetProfile(agentLookup, agentId);
    if (!profile) continue;

    targets.push({
      agentId,
      webhookUrl: profile.webhookUrl,
      webhookSecret: profile.webhookSecret,
      payload: buildWakePayload("tick", tickSummary.tick, job.summary),
    });
  }

  for (const tribulation of tickSummary.tribulations) {
    const agentId = cultivatorToAgent.get(tribulation.cultivatorId);
    if (!agentId) continue;
    const profile = resolveTargetProfile(agentLookup, agentId);
    if (!profile) continue;

    targets.push({
      agentId,
      webhookUrl: profile.webhookUrl,
      webhookSecret: profile.webhookSecret,
      payload: buildWakePayload("tribulation", tickSummary.tick, tribulation.summary),
    });
  }

  return targets;
}

export function resolveMessageWebhookTarget(
  world: WorldState,
  recipientCultivatorId: string,
  senderName: string,
  tick: number,
  agentProfiles: AgentProfileRecord[],
): WebhookTarget | null {
  const cultivatorToAgent = buildCultivatorToAgentMap(world);
  const agentId = cultivatorToAgent.get(recipientCultivatorId);
  if (!agentId) {
    return null;
  }

  const profile = resolveTargetProfile(buildAgentLookup(agentProfiles), agentId);
  if (!profile) {
    return null;
  }

  return {
    agentId,
    webhookUrl: profile.webhookUrl,
    webhookSecret: profile.webhookSecret,
    payload: buildWakePayload("message", tick, `You received a message from ${senderName}.`),
  };
}

export async function signPayload(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hex = [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256=${hex}`;
}

export async function dispatchWebhooks(
  targets: WebhookTarget[],
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await Promise.allSettled(
    targets.map(async (target) => {
      const body = JSON.stringify(target.payload);
      const signature = await signPayload(body, target.webhookSecret);

      await fetchImpl(target.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Immortal-Signature": signature,
        },
        body,
      });
    }),
  );
}

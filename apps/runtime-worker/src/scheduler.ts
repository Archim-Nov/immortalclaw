import {
  createRuntimeService,
  dispatchWebhooks,
  resolveWebhookTargets,
} from "../../../packages/application/src/index.js";
import type { WorldRepository } from "../../../packages/persistence/src/index.js";
import type { RuntimeWorkerBindings } from "./env.js";
import { readTickSteps, resolveRepository } from "./env.js";

export interface ScheduledController {
  waitUntil(promise: Promise<unknown>): void;
}

export interface ScheduledEventLike {
  cron: string;
}

export async function runScheduledTick(
  event: ScheduledEventLike,
  bindings: RuntimeWorkerBindings,
  controller: ScheduledController,
  repository?: WorldRepository,
): Promise<void> {
  const resolvedRepository = resolveRepository(bindings, repository);
  const lockOwner = `scheduled:${event.cron}`;
  const lock = await resolvedRepository.acquireTickLock(lockOwner);

  if (!lock) {
    return;
  }

  try {
    const service = createRuntimeService({ repository: resolvedRepository });
    const tickSummary = await service.advanceWorld(readTickSteps(bindings), "scheduled");
    const [world, agentProfiles] = await Promise.all([
      resolvedRepository.readWorld(),
      resolvedRepository.listAgentProfiles(),
    ]);
    const targets = resolveWebhookTargets(world, tickSummary, agentProfiles);
    if (targets.length > 0) {
      controller.waitUntil(dispatchWebhooks(targets));
    }
  } finally {
    await resolvedRepository.releaseTickLock(lock.lockId);
  }
}

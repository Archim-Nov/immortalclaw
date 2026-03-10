import { createRuntimeService } from "../../../packages/application/src/index.js";
import type {
  CultivatorActionsResponse,
  PerformActionRequest,
  RuntimeHealthResponse,
} from "../../../packages/contracts/src/index.js";
import type { ActionId } from "../../../packages/domain/src/runtime.js";
import type { Hono } from "hono";
import type { WorldRepository } from "../../../packages/persistence/src/index.js";
import type { RuntimeWorkerEnv } from "./env.js";
import { resolveRepository } from "./env.js";

export interface RouteRegistrationOptions {
  repository?: WorldRepository;
}

function readCultivatorId(value: string | undefined): string {
  const cultivatorId = value?.trim();
  if (!cultivatorId) {
    throw new Error("Missing query parameter: cultivatorId");
  }
  return cultivatorId;
}

export function registerRuntimeRoutes(app: Hono<RuntimeWorkerEnv>, options: RouteRegistrationOptions = {}) {
  app.get("/health", (context) => {
    const payload: RuntimeHealthResponse = { ok: true };
    return context.json(payload);
  });

  app.get("/cultivator/state", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const service = createRuntimeService({ repository });
    const cultivatorId = readCultivatorId(context.req.query("cultivatorId"));
    const payload = await service.getCultivatorState(cultivatorId);
    return context.json(payload);
  });

  app.get("/cultivator/actions", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const service = createRuntimeService({ repository });
    const cultivatorId = readCultivatorId(context.req.query("cultivatorId"));
    const payload: CultivatorActionsResponse = {
      cultivatorId,
      actions: await service.listActions(cultivatorId),
    };
    return context.json(payload);
  });

  app.post("/cultivator/act", async (context) => {
    const repository = resolveRepository(context.env, options.repository);
    const service = createRuntimeService({ repository });
    const body = (await context.req.json()) as Partial<PerformActionRequest>;
    const cultivatorId = readCultivatorId(body.cultivatorId);
    const actionId = body.actionId?.trim();

    if (!actionId) {
      throw new Error("Body must include actionId.");
    }

    const payload = await service.performAction(cultivatorId, actionId as ActionId);
    return context.json(payload);
  });
}

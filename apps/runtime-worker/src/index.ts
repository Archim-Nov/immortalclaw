import type { RuntimeWorkerBindings } from "./env.js";
import type { ScheduledController, ScheduledEventLike } from "./scheduler.js";
import { app } from "./app.js";
import { runScheduledTick } from "./scheduler.js";

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEventLike, env: RuntimeWorkerBindings, context: ScheduledController) {
    await runScheduledTick(event, env, context);
  },
};

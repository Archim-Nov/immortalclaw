import type { WorldDurableObject as WorldDurableObjectType } from "@immortal-claw/world-do";

export let WorldDurableObject: typeof WorldDurableObjectType =
  class {} as unknown as typeof WorldDurableObjectType;

try {
  ({ WorldDurableObject } = await import("@immortal-claw/world-do"));
} catch {
  // Node-based tests can import the worker entry without Cloudflare-only modules.
}

interface RuntimeWorkerEnv {
  WORLD: {
    idFromName(name: string): unknown;
    get(id: unknown): {
      fetch(request: Request): Promise<Response>;
    };
  };
}

export default {
  async fetch(request: Request, env: RuntimeWorkerEnv): Promise<Response> {
    const id = env.WORLD.idFromName("primary");
    const stub = env.WORLD.get(id);
    return stub.fetch(request);
  },
};

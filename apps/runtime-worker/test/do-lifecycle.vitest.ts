/// <reference types="@cloudflare/workers-types" />
/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { DurableObject } from "cloudflare:workers";
import { env, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { WorldDurableObject } from "../src/index.js";

interface TestEnv {
  WORLD: {
    newUniqueId(): unknown;
    get(id: unknown): {
      fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
    };
  };
}

type WorldStatusResponse = {
  ok: boolean;
  tick: number;
  lastTickAt: string;
};

test("world durable object is backed by the real DurableObject base class", async () => {
  const worldEnv = env as unknown as TestEnv;
  const stub = worldEnv.WORLD.get(worldEnv.WORLD.newUniqueId());
  const response = await stub.fetch("https://runtime.test/world/status");
  const body = (await response.json()) as WorldStatusResponse;

  expect(response.status).toBe(200);
  expect(body.ok).toBe(true);

  await runInDurableObject(stub as never, async (instance: InstanceType<typeof WorldDurableObject>) => {
    expect(instance).toBeInstanceOf(DurableObject);
  });
});

test("world durable object alarm advances the world tick", async () => {
  const worldEnv = env as unknown as TestEnv;
  const stub = worldEnv.WORLD.get(worldEnv.WORLD.newUniqueId());
  const initialResponse = await stub.fetch("https://runtime.test/world/status");
  const initialBody = (await initialResponse.json()) as WorldStatusResponse;

  const alarmRan = await runDurableObjectAlarm(stub as never);
  const afterResponse = await stub.fetch("https://runtime.test/world/status");
  const afterBody = (await afterResponse.json()) as WorldStatusResponse;

  expect(alarmRan).toBe(true);
  expect(afterBody.tick).toBeGreaterThan(initialBody.tick);
});

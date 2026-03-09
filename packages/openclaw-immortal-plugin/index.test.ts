import assert from "node:assert/strict";
import test from "node:test";
import { createImmortalRealmPlugin } from "./index.js";

test("plugin registers tools and prompt hook", async () => {
  const plugin = createImmortalRealmPlugin({
    fetchImpl: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  });

  const tools: Array<{ name: string }> = [];
  const hooks: Array<{ event: string; handler: (...args: unknown[]) => unknown }> = [];

  plugin.register({
    pluginConfig: {
      defaultCultivatorId: "yun-zhong-he",
    },
    registerTool(tool) {
      tools.push(tool);
    },
    on(event, handler) {
      hooks.push({ event, handler });
    },
    logger: {},
  });

  assert.deepEqual(
    tools.map((tool) => tool.name),
    [
      "immortal_state",
      "immortal_actions",
      "immortal_messages",
      "immortal_tribulation",
      "immortal_sect",
      "immortal_dao_logs",
      "immortal_act",
      "immortal_tick",
    ],
  );
  assert.equal(hooks.length, 1);
  assert.equal(hooks[0]?.event, "before_prompt_build");
  const result = await hooks[0]?.handler({}, {});
  assert.match(String((result as { prependSystemContext?: string }).prependSystemContext), /immortal_state/);
});

test("tools call the world API with default cultivator id", async () => {
  const requests: Array<{ url: string; method: string; body: string | undefined }> = [];
  const plugin = createImmortalRealmPlugin({
    fetchImpl: async (input, init) => {
      requests.push({
        url: String(input),
        method: String(init?.method ?? "GET"),
        body: typeof init?.body === "string" ? init.body : undefined,
      });
      return new Response(JSON.stringify({ ok: true, url: String(input) }), { status: 200 });
    },
  });

  const tools = new Map<string, { execute: (toolCallId: string, params: Record<string, unknown>) => Promise<unknown> }>();

  plugin.register({
    pluginConfig: {
      worldBaseUrl: "http://127.0.0.1:8787/",
      defaultCultivatorId: "yun-zhong-he",
    },
    registerTool(tool) {
      tools.set(tool.name, tool);
    },
    logger: {},
  });

  await tools.get("immortal_state")?.execute("tool-1", {});
  await tools.get("immortal_act")?.execute("tool-2", { actionId: "cultivate" });
  await tools.get("immortal_tick")?.execute("tool-3", { steps: 3 });

  assert.equal(requests.length, 3);
  assert.equal(
    requests[0]?.url,
    "http://127.0.0.1:8787/cultivator/state?cultivatorId=yun-zhong-he",
  );
  assert.equal(requests[1]?.method, "POST");
  assert.match(String(requests[1]?.body), /"actionId":"cultivate"/);
  assert.equal(requests[2]?.url, "http://127.0.0.1:8787/world/tick");
});


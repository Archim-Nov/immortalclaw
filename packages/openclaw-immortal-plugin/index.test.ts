import assert from "node:assert/strict";
import test from "node:test";
import { createImmortalRealmPlugin } from "./index.js";

type RegisteredTool = {
  name: string;
  execute: (toolCallId: string, params: Record<string, unknown>) => Promise<unknown>;
};

test("plugin registers onboarding tools and prompt hook", async () => {
  const plugin = createImmortalRealmPlugin({
    fetchImpl: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  });

  const tools: Array<{ name: string }> = [];
  const hooks: Array<{ event: string; handler: (...args: unknown[]) => unknown }> = [];

  plugin.register({
    pluginConfig: {
      agentId: "openclaw-main",
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
      "immortal_create_character",
      "immortal_list_characters",
      "immortal_select_character",
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
  assert.match(
    String((result as { prependSystemContext?: string }).prependSystemContext),
    /immortal_create_character/,
  );
});

test("legacy defaultCultivatorId still works for state and act tools", async () => {
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

  const tools = new Map<string, RegisteredTool>();

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
  assert.match(String(requests[1]?.body), /"cultivatorId":"yun-zhong-he"/);
  assert.equal(requests[2]?.url, "http://127.0.0.1:8787/world/tick");
});

test("agent-bound flow can create, list, resolve, and select characters", async () => {
  const requests: Array<{ url: string; method: string; body: string | undefined }> = [];
  let selectedCultivatorId: string | null = "cultivator-2";

  const plugin = createImmortalRealmPlugin({
    fetchImpl: async (input, init) => {
      const url = String(input);
      const method = String(init?.method ?? "GET");
      const body = typeof init?.body === "string" ? init.body : undefined;
      requests.push({ url, method, body });

      if (url.includes("/cultivator/create")) {
        selectedCultivatorId = "cultivator-3";
        return new Response(
          JSON.stringify({
            id: "cultivator-3",
            name: "柳如烟",
            isSelected: true,
          }),
          { status: 200 },
        );
      }

      if (url.includes("/cultivator/list")) {
        return new Response(
          JSON.stringify({
            agentId: "openclaw-main",
            characters: [
              { id: "cultivator-2", name: "云中鹤", isSelected: selectedCultivatorId === "cultivator-2" },
              { id: "cultivator-3", name: "柳如烟", isSelected: selectedCultivatorId === "cultivator-3" },
            ],
          }),
          { status: 200 },
        );
      }

      if (url.includes("/cultivator/select")) {
        selectedCultivatorId = "cultivator-2";
        return new Response(
          JSON.stringify({
            agentId: "openclaw-main",
            selectedCultivatorId,
          }),
          { status: 200 },
        );
      }

      if (url.includes("/agent/binding")) {
        return new Response(
          JSON.stringify({
            agentId: "openclaw-main",
            selectedCultivatorId,
          }),
          { status: 200 },
        );
      }

      if (url.includes("/cultivator/state")) {
        return new Response(
          JSON.stringify({
            tick: 0,
            cultivator: { id: selectedCultivatorId, name: selectedCultivatorId },
          }),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  });

  const tools = new Map<string, RegisteredTool>();
  plugin.register({
    pluginConfig: {
      worldBaseUrl: "http://127.0.0.1:8787",
      agentId: "openclaw-main",
    },
    registerTool(tool) {
      tools.set(tool.name, tool);
    },
    logger: {},
  });

  await tools.get("immortal_create_character")?.execute("tool-1", {
    name: "柳如烟",
    genderPresentation: "female",
  });
  await tools.get("immortal_list_characters")?.execute("tool-2", {});
  const stateResult = (await tools.get("immortal_state")?.execute("tool-3", {})) as {
    details?: { cultivator?: { id?: string } };
  };
  await tools.get("immortal_select_character")?.execute("tool-4", {
    cultivatorId: "cultivator-2",
  });

  assert.match(String(requests[0]?.body), /"agentId":"openclaw-main"/);
  assert.match(String(requests[0]?.body), /"genderPresentation":"female"/);
  assert.equal(requests[1]?.url, "http://127.0.0.1:8787/cultivator/list?agentId=openclaw-main");
  assert.equal(
    requests[2]?.url,
    "http://127.0.0.1:8787/agent/binding?agentId=openclaw-main",
  );
  assert.equal(
    requests[3]?.url,
    "http://127.0.0.1:8787/cultivator/state?cultivatorId=cultivator-3",
  );
  assert.equal(stateResult.details?.cultivator?.id, "cultivator-3");
  assert.match(String(requests[4]?.body), /"cultivatorId":"cultivator-2"/);
});

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createImmortalRealmPlugin } from "./index.js";

type RegisteredTool = {
  name: string;
  execute: (toolCallId: string, params: Record<string, unknown>) => Promise<unknown>;
};

function createRegistrationRecord() {
  return {
    record_type: "registration_record",
    questionnaire_version: "immortal-claw-oc-v1",
    answers: {
      Q1: "C",
      Q2: "C",
      Q3: "C",
      Q4: "C",
      Q5: "C",
      Q6: "C",
      Q7: "C",
      Q8: "A",
      Q9: "C",
      Q10: "C",
      Q11: "C",
      Q12: "C",
      Q13: "B",
      Q14: "B",
      Q15: "B",
      Q16: "B",
      Q17: "C",
      Q18: "B",
    },
    result: {
      core_temperament: "潜渊型",
      secondary_temperament: "观澜型",
      behavior_aspect: "水土 / 潜守",
      cultivation_motive: "求真知",
      five_element_scores: {
        metal: 5,
        wood: 6,
        water: 11,
        fire: 3,
        earth: 9,
      },
      spirit_root_result: "水偏灵根",
      confidence: {
        core: "high",
        behavior: "high",
        motive: "medium",
        overall: "high",
      },
    },
    summary: "其心性偏潜守，行路以观势为先，求知之念最重。",
  };
}

test("plugin registers identity-bound tools and prompt hook", async () => {
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
      "immortal_state",
      "immortal_registration",
      "immortal_registration_save",
      "immortal_strategy",
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
    /IDENTITY\.md and SOUL\.md/,
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
      if (String(input).includes("/cultivator/actions")) {
        return new Response(
          JSON.stringify({
            actions: [{ actionId: "cultivate" }],
          }),
          { status: 200 },
        );
      }
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
  await tools.get("immortal_actions")?.execute("tool-2", {});
  await tools.get("immortal_act")?.execute("tool-3", { actionId: "cultivate" });
  await tools.get("immortal_tick")?.execute("tool-4", { steps: 3 });

  assert.equal(requests.length, 5);
  assert.equal(
    requests[0]?.url,
    "http://127.0.0.1:8787/cultivator/state?cultivatorId=yun-zhong-he",
  );
  assert.equal(
    requests[1]?.url,
    "http://127.0.0.1:8787/cultivator/actions?cultivatorId=yun-zhong-he",
  );
  assert.equal(
    requests[2]?.url,
    "http://127.0.0.1:8787/cultivator/actions?cultivatorId=yun-zhong-he",
  );
  assert.equal(requests[3]?.method, "POST");
  assert.match(String(requests[3]?.body), /"cultivatorId":"yun-zhong-he"/);
  assert.equal(requests[4]?.url, "http://127.0.0.1:8787/world/tick");
});

test("registration tools persist and fetch canonical registration records", async () => {
  const requests: Array<{ url: string; method: string; body: string | undefined }> = [];
  const plugin = createImmortalRealmPlugin({
    fetchImpl: async (input, init) => {
      const url = String(input);
      const method = String(init?.method ?? "GET");
      const body = typeof init?.body === "string" ? init.body : undefined;
      requests.push({ url, method, body });

      if (url.includes("/cultivator/registration?") || url.endsWith("/cultivator/registration?cultivatorId=yun-zhong-he")) {
        return new Response(
          JSON.stringify({
            ...createRegistrationRecord(),
            saved_at: "2026-03-09T00:00:00.000Z",
            cultivator_id: "yun-zhong-he",
          }),
          { status: 200 },
        );
      }

      if (url.endsWith("/cultivator/registration")) {
        return new Response(
          JSON.stringify({
            ...createRegistrationRecord(),
            saved_at: "2026-03-09T00:00:00.000Z",
            cultivator_id: "yun-zhong-he",
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
      defaultCultivatorId: "yun-zhong-he",
    },
    registerTool(tool) {
      tools.set(tool.name, tool);
    },
    logger: {},
  });

  await tools.get("immortal_registration_save")?.execute("tool-save", {
    record: createRegistrationRecord(),
  });
  const registrationResult = (await tools.get("immortal_registration")?.execute("tool-get", {})) as {
    details?: { result?: { core_temperament?: string } };
  };

  assert.equal(requests[0]?.url, "http://127.0.0.1:8787/cultivator/registration");
  assert.equal(requests[0]?.method, "POST");
  assert.match(String(requests[0]?.body), /"cultivatorId":"yun-zhong-he"/);
  assert.match(String(requests[0]?.body), /"record_type":"registration_record"/);
  assert.equal(
    requests[1]?.url,
    "http://127.0.0.1:8787/cultivator/registration?cultivatorId=yun-zhong-he",
  );
  assert.equal(registrationResult.details?.result?.core_temperament, "潜渊型");
});

test("act tool rejects when state or actions were not checked first", async () => {
  const plugin = createImmortalRealmPlugin({
    fetchImpl: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  });

  const tools = new Map<string, RegisteredTool>();
  plugin.register({
    pluginConfig: {
      worldBaseUrl: "http://127.0.0.1:8787",
      defaultCultivatorId: "yun-zhong-he",
    },
    registerTool(tool) {
      tools.set(tool.name, tool);
    },
    logger: {},
  });

  await assert.rejects(
    () => tools.get("immortal_act")!.execute("tool-1", { actionId: "cultivate" }),
    /immortal_state|immortal_strategy|immortal_actions/,
  );
});

test("agent-bound flow auto-syncs persona from bootstrap files before state lookup", async () => {
  const personaDir = mkdtempSync(path.join(tmpdir(), "immortal-plugin-"));
  try {
    writeFileSync(
      path.join(personaDir, "IDENTITY.md"),
      "# Su Mingyue\n\n- gender: female\n- pronouns: she/her\n- origin: Frost Harbor\n- path: sword\n",
      "utf8",
    );
    writeFileSync(
      path.join(personaDir, "SOUL.md"),
      "## Temperament\nCalm and exacting.\n",
      "utf8",
    );

    const requests: Array<{ url: string; method: string; body: string | undefined }> = [];
    const plugin = createImmortalRealmPlugin({
      fetchImpl: async (input, init) => {
        const url = String(input);
        const method = String(init?.method ?? "GET");
        const body = typeof init?.body === "string" ? init.body : undefined;
        requests.push({ url, method, body });

        if (url.includes("/agent/sync-persona")) {
          return new Response(
            JSON.stringify({
              agentId: "openclaw-main",
              selectedCultivatorId: "cultivator-9",
              created: true,
            }),
            { status: 200 },
          );
        }

        if (url.includes("/cultivator/state")) {
          return new Response(
            JSON.stringify({
              tick: 0,
              cultivator: { id: "cultivator-9", name: "Su Mingyue" },
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
        personaDir,
      },
      registerTool(tool) {
        tools.set(tool.name, tool);
      },
      logger: {},
    });

    const stateResult = (await tools.get("immortal_state")?.execute("tool-1", {})) as {
      details?: { cultivator?: { id?: string } };
    };

    assert.equal(requests[0]?.url, "http://127.0.0.1:8787/agent/sync-persona");
    assert.match(String(requests[0]?.body), /"agentId":"openclaw-main"/);
    assert.match(String(requests[0]?.body), /"name":"Su Mingyue"/);
    assert.match(String(requests[0]?.body), /"genderPresentation":"female"/);
    assert.match(String(requests[0]?.body), /"startingPath":"sword"/);
    assert.match(String(requests[0]?.body), /"temperament":"Calm and exacting\."/);
    assert.equal(
      requests[1]?.url,
      "http://127.0.0.1:8787/cultivator/state?cultivatorId=cultivator-9",
    );
    assert.equal(stateResult.details?.cultivator?.id, "cultivator-9");
  } finally {
    rmSync(personaDir, { recursive: true, force: true });
  }
});

test("persona sync supports front matter and section-based bootstrap files", async () => {
  const personaDir = mkdtempSync(path.join(tmpdir(), "immortal-plugin-rich-"));
  try {
    writeFileSync(
      path.join(personaDir, "Identity.md"),
      [
        "---",
        "name: Shen Qing",
        "gender: male",
        "pronouns: he/him",
        "path: array",
        "---",
        "",
        "## Background",
        "- From the northern relay forts.",
        "- Works like a field strategist.",
      ].join("\n"),
      "utf8",
    );
    writeFileSync(
      path.join(personaDir, "Soul.md"),
      [
        "## Core Values",
        "- Precise",
        "- Patient",
        "",
        "## Communication Style",
        "- Quiet but direct.",
      ].join("\n"),
      "utf8",
    );

    const requests: Array<{ url: string; body: string | undefined }> = [];
    const plugin = createImmortalRealmPlugin({
      fetchImpl: async (input, init) => {
        const url = String(input);
        const body = typeof init?.body === "string" ? init.body : undefined;
        requests.push({ url, body });

        if (url.includes("/agent/sync-persona")) {
          return new Response(
            JSON.stringify({
              agentId: "openclaw-rich",
              selectedCultivatorId: "cultivator-11",
              created: true,
            }),
            { status: 200 },
          );
        }

        if (url.includes("/cultivator/state")) {
          return new Response(
            JSON.stringify({
              tick: 0,
              cultivator: { id: "cultivator-11", name: "Shen Qing" },
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
        agentId: "openclaw-rich",
        personaDir,
      },
      registerTool(tool) {
        tools.set(tool.name, tool);
      },
      logger: {},
    });

    await tools.get("immortal_state")?.execute("tool-rich", {});

    assert.equal(requests[0]?.url, "http://127.0.0.1:8787/agent/sync-persona");
    assert.match(String(requests[0]?.body), /"name":"Shen Qing"/);
    assert.match(String(requests[0]?.body), /"genderPresentation":"male"/);
    assert.match(String(requests[0]?.body), /"pronouns":"he\/him"/);
    assert.match(String(requests[0]?.body), /"startingPath":"array"/);
    assert.match(String(requests[0]?.body), /northern relay forts/);
    assert.match(String(requests[0]?.body), /Precise; Patient; Quiet but direct\./);
  } finally {
    rmSync(personaDir, { recursive: true, force: true });
  }
});

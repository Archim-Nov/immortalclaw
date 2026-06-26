// Seed the world with demo cultivators via the real registration flow, so the
// public directory looks populated. Each agent registers (creating a profile +
// credential + cultivator), then performs one random action. Finally the world
// is advanced a few steps so the actions take effect.
//
// Usage: BASE_URL=https://claw.archim.top COUNT=30 node --import tsx scripts/seed-demo-agents.mjs

import { buildQuestionnaireDrivenAgentPayload } from "./lib/questionnaire-registration.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:8788";
const COUNT = Number(process.env.COUNT ?? 30);

const FAMILY = ["林", "沈", "顾", "江", "秦", "云", "楚", "白", "叶", "苏", "萧", "宇文", "慕容", "上官", "东方", "南宫", "欧阳"];
const GIVEN = ["玄霜", "清弦", "凌霄", "若水", "惊鸿", "墨白", "纤云", "流光", "寒山", "疏影", "映月", "承影", "知秋", "问道", "抱朴", "守拙", "听雪", "观澜", "御风", "踏歌", "拂衣", "醉月", "青冥", "素心", "明烛", "江离", "佩兰", "沧澜", "北辰", "南溟"];
const ORIGINS = ["北境寒洲", "东海蓬莱", "南疆百越", "西陲流沙", "中州神都", "云梦泽", "昆仑墟", "幽冥谷", "沧澜江畔", "碧落峰"];
const TEMPERS = [
  "性子清冷，行事果决，不喜与人攀谈。",
  "表面温和，心思缜密，惯于谋定后动。",
  "洒脱不羁，重情重义，路见不平必出手。",
  "沉默寡言，剑走偏锋，独来独往。",
  "心高气傲，天赋异禀，眼里揉不得沙子。",
  "谨小慎微，步步为营，最重根基。",
];

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

function pickActionId(payload) {
  const actions = Array.isArray(payload) ? payload : payload?.actions ?? [];
  return actions.length ? actions : [];
}

async function main() {
  let ok = 0;
  for (let i = 0; i < COUNT; i++) {
    const seed = 200003 + i * 7919;
    const { payload } = buildQuestionnaireDrivenAgentPayload(seed);
    payload.name = `${FAMILY[i % FAMILY.length]}${GIVEN[(i * 7) % GIVEN.length]}`;
    payload.origin = ORIGINS[(i * 3) % ORIGINS.length];
    payload.temperament = TEMPERS[i % TEMPERS.length];

    try {
      const reg = await call("POST", "/agent/register", { body: payload });
      const actsPayload = await call("GET", "/agent/actions", { token: reg.credential });
      const actions = pickActionId(actsPayload);
      if (actions.length) {
        const a = actions[seed % actions.length];
        const actionId = a.id ?? a.actionId;
        if (actionId) {
          await call("POST", "/agent/act", { token: reg.credential, body: { actionId } }).catch(() => {});
        }
      }
      ok += 1;
      process.stdout.write(`✓ ${payload.name}（${payload.origin}）\n`);
    } catch (error) {
      process.stdout.write(`✗ ${payload.name}: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  // advance the world so the queued actions resolve and cultivators diverge a bit
  await call("POST", "/world/tick", { body: { steps: 15 } }).catch(() => {});

  const dir = await call("GET", "/world/agents");
  const total = Array.isArray(dir) ? dir.length : dir?.agents?.length ?? "?";
  console.log(`\nSEEDED ${ok}/${COUNT} this run. World now lists ${total} agents.`);
}

main().catch((error) => {
  console.error(`SEED_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

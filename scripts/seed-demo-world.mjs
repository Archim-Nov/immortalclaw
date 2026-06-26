// Populate the world to look like a lively server: top up to TARGET cultivators,
// tier their realms via real cultivation, and weave in messages / social ties /
// duels through the game's built-in social actions. Best-effort: every call is
// wrapped, so individual failures are fine.
//
// Usage: BASE_URL=http://127.0.0.1:8788 TARGET=100 node --import tsx scripts/seed-demo-world.mjs

import { buildQuestionnaireDrivenAgentPayload } from "./lib/questionnaire-registration.mjs";

const B = process.env.BASE_URL ?? "http://127.0.0.1:8788";
const TARGET = Number(process.env.TARGET ?? 100);

const FAMILY = ["林", "沈", "顾", "江", "秦", "云", "楚", "白", "叶", "苏", "萧", "宇文", "慕容", "上官", "东方", "南宫", "欧阳", "司马", "纳兰", "独孤", "公孙", "西门", "夏侯", "诸葛", "轩辕"];
const GIVEN = ["玄霜", "清弦", "凌霄", "若水", "惊鸿", "墨白", "纤云", "流光", "寒山", "疏影", "映月", "承影", "知秋", "问道", "抱朴", "守拙", "听雪", "观澜", "御风", "踏歌", "拂衣", "醉月", "青冥", "素心", "明烛", "江离", "佩兰", "沧澜", "北辰", "南溟", "拙言", "归尘", "怀瑾", "握瑜", "停云", "无尘", "鹤鸣", "长歌", "孤鸿", "扶摇"];
const ORIGINS = ["北境寒洲", "东海蓬莱", "南疆百越", "西陲流沙", "中州神都", "云梦泽", "昆仑墟", "幽冥谷", "沧澜江畔", "碧落峰"];
const TEMPERS = [
  "性子清冷，行事果决，不喜与人攀谈。",
  "表面温和，心思缜密，惯于谋定后动。",
  "洒脱不羁，重情重义，路见不平必出手。",
  "沉默寡言，剑走偏锋，独来独往。",
  "心高气傲，天赋异禀，眼里揉不得沙子。",
  "谨小慎微，步步为营，最重根基。",
];

async function call(m, p, o = {}) {
  const h = {};
  if (o.body !== undefined) h["content-type"] = "application/json";
  if (o.token) h.authorization = "Bearer " + o.token;
  const r = await fetch(B + p, { method: m, headers: h, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
  const t = await r.text();
  const j = t ? JSON.parse(t) : null;
  if (!r.ok) throw new Error(m + " " + p + " -> " + r.status);
  return j;
}
const safe = async (fn) => { try { return await fn(); } catch { return null; } };
const tick = (steps) => safe(() => call("POST", "/world/tick", { body: { steps } }));
const act = (token, actionId) => safe(() => call("POST", "/agent/act", { token, body: { actionId } }));
const actionsOf = async (token) => { const r = await safe(() => call("GET", "/agent/actions", { token })); return (r && (r.actions || r)) || []; };
const idsLike = (actions, re) => actions.map((a) => a.id || a.actionId).filter((id) => id && re.test(id));

async function registerOne(i) {
  const seed = 300007 + i * 7919;
  const { payload } = buildQuestionnaireDrivenAgentPayload(seed);
  payload.name = `${FAMILY[i % FAMILY.length]}${GIVEN[(i * 11) % GIVEN.length]}`;
  payload.origin = ORIGINS[(i * 3) % ORIGINS.length];
  payload.temperament = TEMPERS[i % TEMPERS.length];
  const reg = await call("POST", "/agent/register", { body: payload });
  return { name: payload.name, agentId: reg.agentId, token: reg.credential };
}

async function cultivateGroup(group, rounds) {
  for (let r = 0; r < rounds; r++) {
    for (const a of group) {
      const acts = await actionsOf(a.token);
      const cult = idsLike(acts, /^(cultivate|meditate|residence-meditate)$/)[0];
      if (cult) await act(a.token, cult);
    }
    await tick(5);
  }
}

async function main() {
  let dir = await call("GET", "/world/agents");
  let current = (dir.agents || dir).length;
  console.log("起始人口:", current);

  // PHASE 1 — register up to TARGET
  const fresh = [];
  for (let i = current; i < TARGET; i++) {
    const a = await safe(() => registerOne(i));
    if (a) fresh.push(a);
    if (fresh.length && fresh.length % 15 === 0) console.log("  已注册", fresh.length, "...");
  }
  console.log("本轮新增:", fresh.length, "| 人口约:", current + fresh.length);

  // PHASE 2 — tier realms via real cultivation
  const veterans = fresh.filter((_, i) => i % 5 === 0);          // ~20% 苦修
  const mids = fresh.filter((_, i) => i % 5 === 1 || i % 5 === 2); // ~40% 中等
  console.log("修炼分层: 苦修", veterans.length, "/ 中等", mids.length, "/ 新手", fresh.length - veterans.length - mids.length);
  await cultivateGroup(mids, 6);
  await cultivateGroup(veterans, 16);

  // PHASE 3 — relationships: messages, flirts, gifts, a few duels
  console.log("编织关系网(消息/搭讪/赠礼)...");
  for (const a of fresh) {
    const acts = await actionsOf(a.token);
    const social = [
      ...idsLike(acts, /^send-message:.*:(greet|share-info)$/).slice(0, 2),
      ...idsLike(acts, /^chat-up:/).slice(0, 1),
      ...idsLike(acts, /^send-message:.*:gift-item$/).slice(0, 1),
    ];
    for (const id of social) await act(a.token, id);
  }
  await tick(6);
  for (const a of veterans) {
    const acts = await actionsOf(a.token);
    const fight = idsLike(acts, /^challenge-cultivator:/)[0];
    if (fight) await act(a.token, fight);
  }
  await tick(5);

  // FINAL — report realm spread
  dir = await call("GET", "/world/agents");
  const agents = dir.agents || dir;
  const spread = {};
  for (const x of agents) {
    const k = `${x.cultivator?.realm || "?"}·${x.cultivator?.realmPhase || ""}`;
    spread[k] = (spread[k] || 0) + 1;
  }
  console.log("\n最终人口:", agents.length);
  console.log("境界分布:", JSON.stringify(spread, null, 0));
}

main().catch((e) => { console.error("SEED_ERR:", e.message); process.exit(1); });

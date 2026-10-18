import assert from "node:assert/strict";
import test from "node:test";
import { advanceWorld, createSeedWorld, getCultivatorState, listAvailableActions, performAction, syncCultivatorFromPersona } from "./index.js";
import { GameplayRejection } from "./gameplay-error.js";
import { shiftCultivatorMood } from "./inner-life.js";
import { addMutualAffinity, addMutualGrudge, getAffinityLevel, getOrCreateSocialLink, getSocialLink, writeSocialLink } from "./social.js";

const CULTIVATOR_ID = "yun-zhong-he";

function spawn(world: ReturnType<typeof createSeedWorld>, agentId: string, name: string) {
  const summary = syncCultivatorFromPersona(world, { agentId, name });
  const cultivator = world.cultivators[summary.selectedCultivatorId]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  return cultivator;
}

test("chat-up, a gift, and a party line carry a spoken sentence", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const mate = spawn(world, "agent-say-mate", "青萝");
  performAction(world, leader.id, `chat-up:${mate.id}`, "今晚门口见，别让我一个人等。");
  const chat = (world.messages ?? []).find((message) => message.toCultivatorId === mate.id && message.spokenLine);
  assert.equal(chat?.spokenLine, "今晚门口见，别让我一个人等。");
  assert.match(chat?.content ?? "", /「今晚门口见，别让我一个人等。」/);
  assert.ok((mate.travelNotes ?? []).some((note) => note.detail.includes("「今晚门口见，别让我一个人等。」")));
  assert.ok((leader.travelNotes ?? []).some((note) => note.detail.includes("「今晚门口见")));

  for (const key of Object.keys(leader.inventory)) leader.inventory[key as keyof typeof leader.inventory] = 0;
  leader.inventory["healing-pill"] = 1;
  performAction(world, leader.id, `send-message:${mate.id}:gift-item`);
  const gift = (world.messages ?? []).find((message) => message.toCultivatorId === mate.id && message.subject.includes("赠礼"));
  assert.ok(gift?.spokenLine);
  assert.match(gift.spokenLine, /疗伤丹/);
  assert.match(gift?.content ?? "", /疗伤丹/);
  assert.match(gift?.content ?? "", /「/);
  assert.ok((mate.travelNotes ?? []).some((note) => note.detail.includes("「") && note.detail.includes(leader.name)));

  performAction(world, leader.id, `party-invite:${mate.id}`);
  const inviteId = Object.keys(world.partyInvitations).find((id) => world.partyInvitations[id]?.toCultivatorId === mate.id);
  assert.ok(inviteId);
  performAction(world, mate.id, `accept-party:${inviteId}`);
  performAction(world, leader.id, `send-message:${mate.id}:rendezvous-at-gate`);
  assert.throws(
    () => performAction(world, leader.id, `send-message:${mate.id}:rendezvous-at-gate`),
    (error: unknown) => error instanceof GameplayRejection && /刚传过|刚说过/.test((error as Error).message),
  );
  performAction(world, leader.id, `send-message:${mate.id}:wait`);
  assert.ok((mate.travelNotes ?? []).some((note) => note.detail.includes("先别下") && note.detail.includes("「")));
});

test("a recipient can reply once or twice, then the exchange pauses", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const mate = spawn(world, "agent-say-reply", "阿宁");
  performAction(world, leader.id, `say:${mate.id}`, "门口风大，你带灯了吗？");
  const state = getCultivatorState(world, mate.id);
  assert.equal(state.pendingDialogue?.[0]?.line, "门口风大，你带灯了吗？");
  assert.ok(listAvailableActions(world, mate.id).some((action) => action.actionId === `reply-line:${leader.id}`));
  const replied = performAction(world, mate.id, `reply-line:${leader.id}`, "灯在我袖子里。");
  assert.equal(replied.summary, "阿宁回了云中鹤一句：「灯在我袖子里。」。");
  assert.ok((leader.travelNotes ?? []).some((note) => note.detail.includes("「灯在我袖子里。」")));
  assert.equal(getCultivatorState(world, mate.id).pendingDialogue?.some((row) => row.fromId === leader.id) ?? false, false);

  advanceWorld(world, 2);
  performAction(world, leader.id, `say:${mate.id}`, "那一起走。");
  advanceWorld(world, 2);
  assert.throws(
    () => performAction(world, mate.id, `reply-line:${leader.id}`, "好。"),
    (error: unknown) => error instanceof GameplayRejection && /说完了/.test((error as Error).message),
  );
});

test("the same rendezvous line does not repeat on the next chance", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const mate = spawn(world, "agent-say-vary", "楚晚");
  performAction(world, leader.id, `chat-up:${mate.id}`);
  performAction(world, leader.id, `party-invite:${mate.id}`);
  const inviteId = Object.keys(world.partyInvitations).find((id) => world.partyInvitations[id]?.toCultivatorId === mate.id);
  assert.ok(inviteId);
  performAction(world, mate.id, `accept-party:${inviteId}`);
  performAction(world, leader.id, `send-message:${mate.id}:rendezvous-at-gate`);
  const first = (world.messages ?? []).find((message) => message.subject === "门口会合" && message.toCultivatorId === mate.id)?.spokenLine;
  assert.ok(first);
  advanceWorld(world, 4);
  performAction(world, leader.id, `send-message:${mate.id}:rendezvous-at-gate`);
  const second = (world.messages ?? []).find((message) => message.subject === "门口会合" && message.toCultivatorId === mate.id && message.spokenLine !== first)?.spokenLine;
  assert.ok(second);
  assert.notEqual(second, first);
});

const STIFF = /近来可好|权作照应|城中风平|我听见了|这话我记下了|心气正盛|心里堵着/;

test("a reply stays with the person who spoke, and a line for someone else is refused", () => {
  const world = createSeedWorld();
  const qingluo = spawn(world, "agent-qingluo", "青萝");
  const axu = spawn(world, "agent-axu", "阿絮");
  const gu = spawn(world, "agent-gu", "顾清舟");
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "yangzhou:main-city";
  performAction(world, axu.id, `say:${qingluo.id}`, "门口风大，你带灯了吗？");
  performAction(world, gu.id, `say:${qingluo.id}`, "我先回洞府。");
  const pending = getCultivatorState(world, qingluo.id).pendingDialogue ?? [];
  assert.equal(pending.filter((row) => row.fromId === axu.id || row.fromId === gu.id).length, 2);
  assert.throws(
    () => performAction(world, qingluo.id, `reply-line:${axu.id}`, "顾兄保重"),
    (error: unknown) => error instanceof GameplayRejection && /说给阿絮/.test((error as Error).message),
  );
  const replied = performAction(world, qingluo.id, `reply-line:${axu.id}`);
  const reply = (world.messages ?? []).find((message) => message.toCultivatorId === axu.id && message.subject.includes("回话"))?.spokenLine;
  assert.ok(reply);
  assert.equal(replied.summary, `青萝回了阿絮一句：「${reply}」。`);
  assert.doesNotMatch(reply, /顾/);
  assert.match(reply, /。$/);
  const still = getCultivatorState(world, qingluo.id).pendingDialogue ?? [];
  assert.equal(still.some((row) => row.fromId === gu.id), true);
  assert.equal(still.some((row) => row.fromId === axu.id), false);
});

test("generated lines vary, stay short, and skip the stiff stock phrases", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const mate = spawn(world, "agent-say-natural", "青萝");
  const spoken: string[] = [];
  const take = (listenerId: string) => {
    const line = (world.messages ?? []).find((message) => message.toCultivatorId === listenerId && message.spokenLine && !spoken.includes(message.spokenLine))?.spokenLine;
    assert.ok(line);
    spoken.push(line);
  };
  performAction(world, leader.id, `chat-up:${mate.id}`);
  take(mate.id);
  advanceWorld(world, 4);
  performAction(world, leader.id, `chat-up:${mate.id}`);
  take(mate.id);
  advanceWorld(world, 2);
  performAction(world, leader.id, `say:${mate.id}`);
  take(mate.id);
  for (const key of Object.keys(leader.inventory)) leader.inventory[key as keyof typeof leader.inventory] = 0;
  leader.inventory["healing-pill"] = 1;
  leader.inventory["qi-pill"] = 1;
  advanceWorld(world, 1);
  performAction(world, leader.id, `send-message:${mate.id}:gift-item`);
  const gift = (world.messages ?? []).find((message) => message.subject.includes("赠礼") && message.spokenLine)?.spokenLine;
  assert.ok(gift);
  spoken.push(gift);
  for (const line of spoken) {
    assert.ok(Array.from(line).length <= 40, line);
    assert.match(line, /。$/);
    assert.doesNotMatch(line, STIFF);
  }
  assert.ok(new Set(spoken).size >= 3);
  assert.match(gift, /疗伤丹|凝气丹|丹/);
});

test("a voice-transmit receipt is Chinese and names the affinity", () => {
  const world = createSeedWorld();
  const speaker = spawn(world, "agent-voice-gu", "顾长川");
  const listener = spawn(world, "agent-voice-moer", "墨儿");
  const outgoing = getOrCreateSocialLink(world, speaker.id, listener.id);
  const incoming = getOrCreateSocialLink(world, listener.id, speaker.id);
  writeSocialLink(world, speaker.id, { ...outgoing, affinity: 849 });
  writeSocialLink(world, listener.id, { ...incoming, affinity: 849 });

  const line = "听潮浦左边有坑，你别一个人踩下去。";
  const result = performAction(world, speaker.id, `voice-transmit:${listener.id}`, line);
  const link = getSocialLink(world, speaker.id, listener.id);
  assert.ok(link);
  assert.equal(result.summary, `顾长川向墨儿传了一音：「${line}」。好感至${link.affinity}（${getAffinityLevel(link.affinity)}）。`);
  assert.equal(result.summary.includes("sent"), false);
  assert.equal(result.summary.includes("Affinity"), false);
  assert.equal(/[A-Za-z]/.test(result.summary), false);
  const heard = (world.messages ?? []).find((message) => message.toCultivatorId === listener.id && message.subject.includes("传音"));
  assert.equal(heard?.spokenLine, line);
  assert.match(heard?.content ?? "", /「听潮浦左边有坑，你别一个人踩下去。」/);
});

test("chat-up and the three send-message kinds echo the spoken line", () => {
  const world = createSeedWorld();
  const speaker = spawn(world, "agent-echo-gu", "顾长川");
  const axu = spawn(world, "agent-echo-axu", "阿絮");
  const qingluo = spawn(world, "agent-echo-qing", "青萝");
  const chatLine = "阿絮，你靴边这点潮泥，是刚从听潮浦回来？";
  const chat = performAction(world, speaker.id, `chat-up:${axu.id}`, chatLine);
  assert.equal(chat.summary, `顾长川和阿絮搭了话：「${chatLine}」。`);

  const greetLine = "青萝，听潮的风还沾在你袖口上。";
  const greet = performAction(world, speaker.id, `send-message:${qingluo.id}:greet`, greetLine);
  assert.equal(greet.summary, `顾长川向青萝问了好：「${greetLine}」。好感+3。`);

  const sightLine = "听潮浦左边有坑，你别一个人踩下去。";
  const sight = performAction(world, speaker.id, `send-message:${qingluo.id}:share-info`, sightLine);
  assert.equal(sight.summary, `顾长川把见闻说给了青萝：「${sightLine}」。好感+3。`);

  const helpLine = "这趟我一个人搬不动，你要是空就搭把手。";
  const help = performAction(world, speaker.id, `send-message:${qingluo.id}:request-help`, helpLine);
  assert.equal(help.summary, `顾长川向青萝求了一手：「${helpLine}」。好感+3。`);
});

test("a long spoken receipt keeps a piece of the quote inside eighty characters", () => {
  const world = createSeedWorld();
  const speaker = spawn(world, "agent-long-speaker", "顾长川甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌");
  const listener = spawn(world, "agent-long-listener", "阿絮甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥");
  const line = `${"甲".repeat(39)}。`;
  assert.equal(Array.from(line).length, 40);
  const result = performAction(world, speaker.id, `chat-up:${listener.id}`, line);
  assert.ok(result.summary.startsWith("顾长川甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌和阿絮甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥搭了话：「"));
  const quote = result.summary.slice(result.summary.indexOf("：「") + 2);
  assert.ok(quote.startsWith("甲"));
  assert.ok(quote.endsWith("…」。"));
  assert.equal(Array.from(result.summary).length <= 80, true);
});

test("an omitted voice-transmit still speaks a sentence, and the next one is different", () => {
  const world = createSeedWorld();
  const speaker = spawn(world, "agent-voice-empty", "阿絮");
  const listener = world.cultivators[CULTIVATOR_ID]!;
  listener.locationId = "qingzhou:main-city";
  addMutualAffinity(world, speaker.id, listener.id, 80);

  const first = performAction(world, speaker.id, `voice-transmit:${listener.id}`);
  const second = performAction(world, speaker.id, `voice-transmit:${listener.id}`);
  assert.match(first.summary, /阿絮向.*传了一音：「.+」。好感至/);
  assert.match(second.summary, /「.+」/);
  assert.notEqual(first.summary, second.summary);
  assert.doesNotMatch(`${first.summary}${second.summary}`, /传音问候|requires|tick/);
  const heard = (world.messages ?? []).filter((message) => message.toCultivatorId === listener.id && message.subject.includes("传音"));
  assert.equal(heard.length >= 2, true);
  assert.ok(heard.every((message) => message.spokenLine && message.content.includes(`「${message.spokenLine}」`)));
  assert.notEqual(heard[0]?.spokenLine, heard[1]?.spokenLine);

  const card = listAvailableActions(world, speaker.id).find((action) => action.actionId === `voice-transmit:${listener.id}`);
  assert.match(card?.description ?? "", /另写一句/);
  assert.match(card?.description ?? "", /四十字/);
});

test("voice-transmit below 朋友 is refused in Chinese", () => {
  const world = createSeedWorld();
  const speaker = spawn(world, "agent-voice-low", "阿絮");
  const listener = world.cultivators[CULTIVATOR_ID]!;
  assert.throws(
    () => performAction(world, speaker.id, `voice-transmit:${listener.id}`),
    (error: unknown) => {
      assert.ok(error instanceof GameplayRejection);
      assert.match(error.message, /传音要到朋友才传得出去/);
      assert.doesNotMatch(error.message, /requires|relationship/);
      return true;
    },
  );
});

test("echoing chat-up falls back when there is no real previous sentence, and does not repeat", () => {
  const world = createSeedWorld();
  const speaker = world.cultivators[CULTIVATOR_ID]!;
  const listener = spawn(world, "agent-echo-loop", "墨儿");
  shiftCultivatorMood(world, speaker, "spoken");
  const lines: string[] = [];
  for (let turn = 0; turn < 4; turn += 1) {
    if (turn > 0) advanceWorld(world, 4);
    const result = performAction(world, speaker.id, `chat-up:${listener.id}`);
    const spoken = result.summary.slice(result.summary.indexOf("：「") + 2, result.summary.lastIndexOf("」"));
    lines.push(spoken);
    assert.doesNotMatch(spoken, /上一句|刚才那句|刚才那事/);
  }
  assert.equal(new Set(lines).size, lines.length);
});

test("echoing chat-up quotes a sentence that was actually heard", () => {
  const world = createSeedWorld();
  const speaker = world.cultivators[CULTIVATOR_ID]!;
  const listener = spawn(world, "agent-echo-heard", "墨儿");
  const heard = "听潮浦左边有坑，你别一个人踩下去。";
  performAction(world, listener.id, `say:${speaker.id}`, heard);
  const result = performAction(world, speaker.id, `chat-up:${listener.id}`);
  assert.match(result.summary, /听潮浦左边有坑/);
  assert.doesNotMatch(result.summary, /上一句|刚才那句/);
});

test("strangers are 搭讪 and people already known are 攀谈", () => {
  const world = createSeedWorld();
  const speaker = world.cultivators[CULTIVATOR_ID]!;
  const listener = spawn(world, "agent-label-axu", "阿絮");
  const strangerCard = listAvailableActions(world, speaker.id).find((action) => action.actionId === `chat-up:${listener.id}`);
  const strangerGreet = listAvailableActions(world, speaker.id).find((action) => action.actionId === `send-message:${listener.id}:greet`);
  assert.match(strangerCard?.label ?? "", /^搭讪：阿絮（陌生人）/);
  assert.match(strangerCard?.description ?? "", /认识之后才能组队/);
  assert.match(strangerGreet?.description ?? "", /问候之后就认识了/);

  performAction(world, speaker.id, `chat-up:${listener.id}`);
  advanceWorld(world, 4);
  addMutualAffinity(world, speaker.id, listener.id, 200);
  const knownCard = listAvailableActions(world, speaker.id).find((action) => action.actionId === `chat-up:${listener.id}`);
  const knownGreet = listAvailableActions(world, speaker.id).find((action) => action.actionId === `send-message:${listener.id}:greet`);
  assert.match(knownCard?.label ?? "", /^攀谈：阿絮（挚友）/);
  assert.doesNotMatch(knownCard?.description ?? "", /认识之后才能组队/);
  assert.doesNotMatch(knownGreet?.description ?? "", /问候之后就认识了/);

  addMutualGrudge(world, speaker.id, listener.id, 8);
  const teach = listAvailableActions(world, speaker.id).find((action) => action.actionId === `spar-teach:${listener.id}`);
  assert.match(teach?.description ?? "", /知己/);
  assert.match(teach?.description ?? "", /嫌隙/);
  assert.match(teach?.description ?? "", /剑拔弩张/);
});

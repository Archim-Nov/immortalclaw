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

function formParty(world: ReturnType<typeof createSeedWorld>, leaderId: string, mateId: string) {
  performAction(world, leaderId, `chat-up:${mateId}`);
  performAction(world, leaderId, `party-invite:${mateId}`);
  const inviteId = Object.keys(world.partyInvitations).find((id) => world.partyInvitations[id]?.toCultivatorId === mateId);
  assert.ok(inviteId);
  performAction(world, mateId, `accept-party:${inviteId}`);
}

function setAffinity(world: ReturnType<typeof createSeedWorld>, aId: string, bId: string, affinity: number) {
  for (const [ownerId, otherId] of [[aId, bId], [bId, aId]] as const) {
    writeSocialLink(world, ownerId, { ...getOrCreateSocialLink(world, ownerId, otherId), affinity });
  }
}

function notesMatching(person: { travelNotes?: ReadonlyArray<{ title: string; detail: string; mood?: string }> }, needle: string) {
  return (person.travelNotes ?? []).filter((note) => note.detail.includes(needle) || note.title.includes(needle));
}

test("a party witness overhears a chat-up without taking the addressee's title", () => {
  const world = createSeedWorld();
  const speaker = spawn(world, "agent-witness-speaker", "顾长川");
  const listener = spawn(world, "agent-witness-listener", "柳如烟");
  const witness = spawn(world, "agent-witness-moer", "墨儿");
  const beside = spawn(world, "agent-witness-beside", "楚晚");
  const away = spawn(world, "agent-witness-away", "青萝");
  formParty(world, speaker.id, witness.id);
  formParty(world, speaker.id, beside.id);
  formParty(world, speaker.id, away.id);
  away.locationId = "qingzhou:sub-town-east";
  setAffinity(world, speaker.id, listener.id, 200);

  const line = "柳如烟，广津城的风今晚有点硬。";
  performAction(world, speaker.id, `chat-up:${listener.id}`, line);

  for (const person of [witness, beside]) {
    const overheard = notesMatching(person, line);
    assert.equal(overheard.length, 1, person.name);
    assert.equal(overheard[0]!.title, "听见顾长川跟柳如烟攀谈");
    assert.equal(overheard[0]!.mood, "同队的人听见了");
    assert.match(overheard[0]!.detail, /顾长川在.+跟柳如烟攀谈，说到：「柳如烟，广津城的风今晚有点硬。」/);
    assert.doesNotMatch(`${overheard[0]!.title}${overheard[0]!.detail}`, /过来攀谈|关系到了|关系从|墨儿/);
  }
  assert.equal(notesMatching(away, line).length, 0);

  const addressed = notesMatching(listener, line);
  assert.equal(addressed.length, 1);
  assert.equal(addressed[0]!.title, "顾长川过来攀谈");
  assert.equal(addressed[0]!.mood, "有人找上门说话");
  assert.match(addressed[0]!.detail, /关系到了挚友/);

  const spoken = notesMatching(speaker, line);
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0]!.title, "与柳如烟说上了话");
  assert.match(spoken[0]!.detail, /关系到了挚友/);

  advanceWorld(world, 4);
  const direct = "墨儿，这句是对你说的。";
  performAction(world, speaker.id, `chat-up:${witness.id}`, direct);
  const toWitness = notesMatching(witness, direct);
  assert.equal(toWitness.length, 1);
  assert.equal(toWitness[0]!.title, "顾长川过来攀谈");
  assert.equal(toWitness[0]!.mood, "有人找上门说话");
  assert.match(toWitness[0]!.detail, /关系到了/);
  const besideHeard = notesMatching(beside, direct);
  assert.equal(besideHeard.length, 1);
  assert.equal(besideHeard[0]!.title, "听见顾长川跟墨儿攀谈");
  assert.equal(besideHeard[0]!.mood, "同队的人听见了");
  assert.doesNotMatch(`${besideHeard[0]!.title}${besideHeard[0]!.detail}`, /过来攀谈|关系到了|关系从/);
});

test("a party witness hears a say, a reply, and a gift as overheard", () => {
  const world = createSeedWorld();
  const speaker = spawn(world, "agent-witness-say", "顾长川");
  const listener = spawn(world, "agent-witness-say-listener", "柳如烟");
  const witness = spawn(world, "agent-witness-say-moer", "墨儿");
  formParty(world, speaker.id, witness.id);
  formParty(world, speaker.id, listener.id);

  const said = "柳如烟，灯还在你袖子里。";
  performAction(world, speaker.id, `say:${listener.id}`, said);
  const heardSay = notesMatching(witness, said);
  assert.equal(heardSay.length, 1);
  assert.equal(heardSay[0]!.title, "听见顾长川对柳如烟说了一句");
  assert.equal(heardSay[0]!.mood, "同队的人听见了");
  assert.match(heardSay[0]!.detail, /顾长川对柳如烟说：「柳如烟，灯还在你袖子里。」/);
  const addressedSay = notesMatching(listener, said);
  assert.equal(addressedSay[0]!.title, "顾长川说了一句");
  assert.equal(addressedSay[0]!.mood, "话留在了耳朵里");

  const replied = "顾长川，灯在我袖子里。";
  performAction(world, listener.id, `reply-line:${speaker.id}`, replied);
  const heardReply = notesMatching(witness, replied);
  assert.equal(heardReply.length, 1);
  assert.equal(heardReply[0]!.title, "听见柳如烟回顾长川一句");
  assert.equal(heardReply[0]!.mood, "同队的人听见了");
  assert.match(heardReply[0]!.detail, /柳如烟回顾长川：「顾长川，灯在我袖子里。」/);
  assert.equal(notesMatching(speaker, replied)[0]!.title, "柳如烟回了一句");

  for (const key of Object.keys(speaker.inventory)) speaker.inventory[key as keyof typeof speaker.inventory] = 0;
  speaker.inventory["healing-pill"] = 1;
  speaker.lastGiftTick = -1;
  const giftLine = "柳如烟，这枚丹你先收着。";
  performAction(world, speaker.id, `send-message:${listener.id}:gift-item:healing-pill`, giftLine);
  const heardGift = notesMatching(witness, giftLine);
  assert.equal(heardGift.length, 1);
  assert.equal(heardGift[0]!.title, "听见顾长川把礼递给柳如烟");
  assert.equal(heardGift[0]!.mood, "同队的人听见了");
  assert.match(heardGift[0]!.detail, /顾长川把1个疗伤丹塞给柳如烟/);
  assert.doesNotMatch(heardGift[0]!.title, /递来一份礼/);
  const addressedGift = notesMatching(listener, giftLine);
  assert.equal(addressedGift[0]!.title, "顾长川递来一份礼");
  assert.equal(addressedGift[0]!.mood, "手里多了别人的东西");
});

test("a greet's affinity clause stays on the pair and off the party witness", () => {
  const world = createSeedWorld();
  const speaker = spawn(world, "agent-witness-greet", "顾长川");
  const listener = spawn(world, "agent-witness-greet-listener", "柳如烟");
  const witness = spawn(world, "agent-witness-greet-moer", "墨儿");
  formParty(world, speaker.id, witness.id);
  setAffinity(world, speaker.id, listener.id, 17);

  const line = "柳如烟，路上小心。";
  performAction(world, speaker.id, `send-message:${listener.id}:greet`, line);

  const overheard = notesMatching(witness, line);
  assert.equal(overheard.length, 1);
  assert.equal(overheard[0]!.title, "听见顾长川向柳如烟问了好");
  assert.equal(overheard[0]!.mood, "同队的人听见了");
  assert.match(overheard[0]!.detail, /顾长川在.+跟柳如烟点了下头，说：「柳如烟，路上小心。」/);
  assert.doesNotMatch(`${overheard[0]!.title}${overheard[0]!.detail}`, /关系从|关系到了|过来攀谈/);

  const spoken = notesMatching(speaker, line);
  assert.equal(spoken[0]!.title, "向柳如烟问了好");
  assert.match(spoken[0]!.detail, /关系从认识到了熟识/);
  const addressed = notesMatching(listener, line);
  assert.equal(addressed[0]!.title, "顾长川打了招呼");
  assert.match(addressed[0]!.detail, /关系从认识到了熟识/);
});

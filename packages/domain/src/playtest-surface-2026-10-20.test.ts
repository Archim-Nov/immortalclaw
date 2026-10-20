import assert from "node:assert/strict";
import test from "node:test";

import { BASE_QUEST_TEMPLATES, HIGH_RISK_QUEST_TEMPLATES } from "./constants.js";
import { createCultivator } from "./engine.js";
import { actionFailureBody, GameplayRejection } from "./gameplay-error.js";
import { advanceWorld, createSeedWorld, getCultivatorState, listAvailableActions, performAction } from "./index.js";
import type { QuestInstance, QuestTemplate, WorldState } from "./model.js";
import { createSocialLink, describeArcLine, getSocialLinksView, writeSocialLink } from "./social.js";

const SELF_ID = "yun-zhong-he";

function idle(world: WorldState, cultivatorId: string) {
  let guard = 0;
  while (world.cultivators[cultivatorId]?.activeJobId && guard < 20) {
    advanceWorld(world, 1);
    guard += 1;
  }
}

function countWord(line: string, word: string): number {
  return line.split(word).length - 1;
}

function paintQuest(quest: QuestInstance, template: QuestTemplate, stones: number): void {
  quest.templateId = template.id;
  quest.type = template.type;
  quest.category = template.category;
  quest.name = template.name;
  quest.nameCn = template.nameCn;
  quest.description = template.description;
  quest.durationTicks = template.durationTicks;
  quest.reward = {
    spiritStones: stones,
    reputation: template.reward.reputation,
    contribution: template.reward.contribution,
  };
  quest.failurePenalty = { injuryTicks: template.failurePenalty.injuryTicks, spiritStoneLoss: template.failurePenalty.spiritStoneLoss };
  quest.successRate = template.successRate;
}

test("arc lines stay readable at every grudge level", () => {
  const bonds = [
    { affinity: 0, label: null },
    { affinity: 20, label: "点头之交" },
    { affinity: 120, label: "好友" },
    { affinity: 200, label: "知己" },
  ] as const;
  const feuds = [
    { grudge: 0, label: null },
    { grudge: 7, label: null },
    { grudge: 8, label: "嫌隙" },
    { grudge: 17, label: "嫌隙" },
    { grudge: 18, label: "宿怨" },
    { grudge: 40, label: "宿怨" },
  ] as const;

  for (const bond of bonds) {
    for (const feud of feuds) {
      const line = describeArcLine(
        { ...createSocialLink("cultivator-5", 1, bond.affinity), grudge: feud.grudge },
        "墨儿",
        "Luna",
      );
      assert.match(line, /墨儿与Luna/);
      assert.doesNotMatch(line, /到了嫌隙|到了宿怨/);
      assert.equal(line.endsWith("。"), true);
      if (feud.label === "嫌隙") {
        assert.equal(countWord(line, "嫌隙"), 1, line);
        assert.equal(countWord(line, "宿怨"), 0, line);
      } else if (feud.label === "宿怨") {
        assert.equal(countWord(line, "宿怨"), 1, line);
        assert.equal(countWord(line, "嫌隙"), 0, line);
      } else {
        assert.equal(countWord(line, "宿怨"), 0, line);
        const mentions = countWord(line, "嫌隙");
        assert.ok(mentions === 0 || (mentions === 1 && line.includes("没有结下嫌隙")), line);
      }
      if (bond.label) assert.match(line, new RegExp(bond.label));
    }
  }
});

test("Luna keeps one name on favor cards, commissions, and the roster", () => {
  const world = createSeedWorld();
  const self = world.cultivators[SELF_ID]!;
  const luna = world.cultivators[createCultivator(world, { name: "Luna" }).id]!;
  const qing = world.cultivators[createCultivator(world, { name: "青萝" }).id]!;
  for (const person of [luna, qing]) {
    person.locationId = self.locationId;
    person.injuryTicksRemaining = 0;
    person.activeJobId = null;
  }

  const favors = listAvailableActions(world, self.id);
  const lunaFavor = favors.find((action) => action.actionId === `ask-favor:${luna.id}:guard-breakthrough`);
  const qingFavor = favors.find((action) => action.actionId === `ask-favor:${qing.id}:guard-breakthrough`);
  assert.ok(lunaFavor);
  assert.ok(qingFavor);
  assert.equal(lunaFavor.label, "请托：Luna守关");
  assert.equal(lunaFavor.description.includes("苏青萝"), false);
  assert.equal(lunaFavor.description.includes("Luna"), true);
  assert.equal(qingFavor.label, "请托：青萝守关");

  writeSocialLink(world, self.id, { ...createSocialLink(luna.id, world.tick, 120), grudge: 8 });
  const linked = getCultivatorState(world, self.id);
  const social = linked.socialLinks.find((link) => link.targetCultivatorId === luna.id);
  const nearby = linked.nearbyCultivators?.find((row) => row.cultivatorId === luna.id);
  assert.equal(social?.targetName, "Luna");
  assert.equal(nearby?.name, "Luna");
  assert.match(social?.arcLine ?? "", /有了嫌隙/);
  assert.doesNotMatch(social?.arcLine ?? "", /嫌隙到了嫌隙/);
  assert.equal(nearby?.arcLine, social?.arcLine);

  self.inventory["beast-core"] = 1;
  world.commissions["comm-luna"] = {
    id: "comm-luna",
    posterId: luna.id,
    locationId: self.locationId,
    type: "gather",
    targetItemId: "beast-core",
    targetCount: 1,
    rewardSpiritStones: 40,
    acceptedById: null,
    createdAtTick: world.tick,
    completedAtTick: null,
  };
  const commission = listAvailableActions(world, self.id).find((action) => action.actionId === "accept-commission:comm-luna");
  assert.ok(commission);
  assert.equal(commission.label, "接受委托：Luna的采集任务");
  assert.equal(commission.label.includes("苏青萝"), false);
  assert.equal(getCultivatorState(world, self.id).localCommissions.find((row) => row.id === "comm-luna")?.posterName, "Luna");
});

test("a failed lead stays visible, names the wound, and keeps the other quest", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[SELF_ID]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.injuryTicksRemaining = 0;
  cultivator.activeJobId = null;
  cultivator.spiritStones = 500;
  cultivator.statusEffects = [];
  const place = world.locations[cultivator.locationId]?.name ?? "";
  assert.equal(place, "青岚城");

  const board = world.questBoards[cultivator.locationId]!;
  const leadTemplate = HIGH_RISK_QUEST_TEMPLATES.find((template) => template.type === "strong-event-quest")!;
  const investigationTemplate = BASE_QUEST_TEMPLATES.find((template) => template.type === "investigation")!;
  const lead = board.quests[0]!;
  const investigation = board.quests[1]!;
  paintQuest(lead, leadTemplate, 170);
  paintQuest(investigation, investigationTemplate, 100);
  lead.nameCn = "强事件线索";
  investigation.nameCn = "调查寻访";

  const acceptLead = listAvailableActions(world, SELF_ID).find((action) => action.actionId === `quest:accept:${lead.type}:${lead.boardIndex}`);
  assert.equal(acceptLead?.label, "接下：凶险传闻");
  assert.equal(acceptLead?.label.includes("强事件"), false);
  const acceptedLead = performAction(world, SELF_ID, `quest:accept:${lead.type}:${lead.boardIndex}`);
  assert.equal(acceptedLead.summary, "云中鹤接下了凶险传闻。");
  const acceptedInvestigation = performAction(world, SELF_ID, `quest:accept:${investigation.type}:${investigation.boardIndex}`);
  assert.equal(acceptedInvestigation.summary, "云中鹤接下了调查寻访。");

  const held = getCultivatorState(world, SELF_ID).activeQuests ?? [];
  assert.equal(held.length, 2);
  assert.deepEqual(held.map((quest) => quest.name), ["凶险传闻", "调查寻访"]);
  for (const quest of held) {
    assert.equal(quest.placeName, "青岚城");
    assert.match(quest.placeLine, /青岚城接下的/);
    assert.match(quest.placeLine, /不会自己过期/);
    assert.equal(quest.blockReason, undefined);
  }
  assert.equal(JSON.stringify(getCultivatorState(world, SELF_ID)).includes("强事件线索"), false);

  const running = cultivator.activeQuests[0]!;
  running.successRate = 0;
  const beforeStones = cultivator.spiritStones;
  const beforeReputation = cultivator.stateReputation.qingzhou;
  performAction(world, SELF_ID, "quest:execute:strong-event-quest:0");

  const whileBusy = getCultivatorState(world, SELF_ID);
  const busyLead = whileBusy.activeQuests?.find((quest) => quest.name === "凶险传闻");
  const busyOther = whileBusy.activeQuests?.find((quest) => quest.name === "调查寻访");
  assert.match(busyLead?.placeLine ?? "", /正在做/);
  assert.match(busyOther?.blockReason ?? "", /手头的事还没做完/);
  assert.match(busyOther?.placeLine ?? "", /青岚城/);

  idle(world, SELF_ID);

  const after = getCultivatorState(world, SELF_ID);
  assert.equal(cultivator.spiritStones, beforeStones - 35);
  assert.equal(cultivator.stateReputation.qingzhou, beforeReputation);
  assert.equal(cultivator.injuryTicksRemaining, 3);
  assert.equal(after.cultivator.status, "injured");
  const wound = after.statusEffects.find((effect) => effect.id === "wounded");
  assert.ok(wound);
  assert.equal(wound.name, "带伤");
  assert.equal(wound.remainingTicks, cultivator.injuryTicksRemaining);
  const result = "云中鹤没能做成「凶险传闻」。这一趟挂了伤，还要养3刻。灵石少了35。";
  assert.ok(after.travelogue.notes.some((note) => note.detail === result));
  assert.ok(after.recentEvents.some((event) => event.content === result));
  assert.ok(after.digest?.fights.includes(result) || after.digest?.summary.includes(result));
  assert.equal(JSON.stringify(after).includes("强事件线索"), false);

  const remaining = after.activeQuests ?? [];
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0]?.name, "调查寻访");
  assert.match(remaining[0]?.blockReason ?? "", /身上有伤/);
  assert.match(remaining[0]?.placeLine ?? "", /青岚城/);
  const card = listAvailableActions(world, SELF_ID).find((action) => action.actionId === "quest:execute:investigation:0");
  assert.ok(card);
  assert.equal(card.label, "去做：调查寻访");
  assert.equal(card.description, remaining[0]?.blockReason);
  assert.equal(card.description.includes("quest:"), false);
  assert.throws(
    () => performAction(world, SELF_ID, "quest:execute:investigation:0"),
    (error: unknown) => {
      assert.ok(error instanceof GameplayRejection);
      assert.equal(error.message, card.description);
      const body = actionFailureBody(error);
      assert.equal(body.error, error.message);
      assert.equal(body.summary, error.message);
      return true;
    },
  );
  assert.equal(cultivator.activeQuests.length, 1);
});

test("a finished lead writes the spirit stones it actually paid", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[SELF_ID]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.injuryTicksRemaining = 0;
  cultivator.activeJobId = null;
  cultivator.spiritStones = 500;
  cultivator.statusEffects = [];

  const board = world.questBoards[cultivator.locationId]!;
  const leadTemplate = HIGH_RISK_QUEST_TEMPLATES.find((template) => template.type === "strong-event-quest")!;
  const investigationTemplate = BASE_QUEST_TEMPLATES.find((template) => template.type === "investigation")!;
  const lead = board.quests[0]!;
  const investigation = board.quests[1]!;
  paintQuest(lead, leadTemplate, 170);
  paintQuest(investigation, investigationTemplate, 100);
  lead.nameCn = "州内精英任务";
  lead.type = "state-elite";
  lead.templateId = "tpl-state-elite";
  lead.failurePenalty = { injuryTicks: 0, spiritStoneLoss: 0 };
  lead.successRate = 100;

  performAction(world, SELF_ID, `quest:accept:${lead.type}:${lead.boardIndex}`);
  performAction(world, SELF_ID, `quest:accept:${investigation.type}:${investigation.boardIndex}`);
  assert.equal(getCultivatorState(world, SELF_ID).activeQuests?.some((quest) => quest.name === "州府急务"), true);
  assert.equal(JSON.stringify(getCultivatorState(world, SELF_ID)).includes("州内精英任务"), false);

  const beforeStones = cultivator.spiritStones;
  const beforeReputation = cultivator.stateReputation.qingzhou;
  cultivator.activeQuests[0]!.successRate = 100;
  performAction(world, SELF_ID, `quest:execute:${cultivator.activeQuests[0]!.type}:0`);
  idle(world, SELF_ID);

  const paid = 170;
  const fame = leadTemplate.reward.reputation;
  const result = `云中鹤把「州府急务」做完了，得了${paid}灵石，本州声望涨了${fame}。`;
  const after = getCultivatorState(world, SELF_ID);
  assert.equal(cultivator.spiritStones, beforeStones + paid);
  assert.equal(cultivator.stateReputation.qingzhou, beforeReputation + fame);
  assert.equal(cultivator.injuryTicksRemaining, 0);
  assert.equal(after.cultivator.status, "idle");
  assert.equal(after.statusEffects.some((effect) => effect.id === "wounded"), false);
  assert.ok(after.travelogue.notes.some((note) => note.detail === result));
  assert.ok(after.recentEvents.some((event) => event.content === result));
  assert.match(after.digest?.summary ?? "", /得了170灵石/);
  const other = after.activeQuests?.find((quest) => quest.name === "调查寻访");
  assert.ok(other);
  assert.equal(other.blockReason, undefined);
  assert.match(other.placeLine, /人在这里就能做/);
  const card = listAvailableActions(world, SELF_ID).find((action) => String(action.actionId).startsWith("quest:execute:investigation"));
  assert.match(card?.description ?? "", /线索/);
  assert.equal(card?.description.includes("身上有伤"), false);
});

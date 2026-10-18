import assert from "node:assert/strict";
import test from "node:test";
import { GameplayRejection } from "./gameplay-error.js";
import {
  createSeedWorld,
  getCultivatorState,
  getDaoLogs,
  listAvailableActions,
  performAction,
  syncCultivatorFromPersona,
} from "./index.js";
import type { TravelNote } from "./model.js";

const CULTIVATOR_ID = "yun-zhong-he";
const JOURNEY_LINE = "进城的人很多，青岚城的茶摊还开着。";
const CUSTOM_LINE = "青岚城内，洞府新立，结丹后愿同探。";
const ENGLISH_SUMMARY = /left a|journey note|note on the board/i;

function cityPair() {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const summary = syncCultivatorFromPersona(world, {
    agentId: "agent-board-note",
    name: "青萝",
  });
  const second = world.cultivators[summary.selectedCultivatorId]!;
  first.locationId = "qingzhou:main-city";
  second.locationId = "qingzhou:main-city";
  first.spiritStones = 400;
  second.spiritStones = 400;
  first.inventory["qi-pill"] = 1;
  second.inventory["qi-pill"] = 1;
  return { world, first, second };
}

function note(partial: Pick<TravelNote, "title" | "detail"> & Partial<TravelNote>): TravelNote {
  return {
    tick: 1,
    kind: "find",
    locationId: "qingzhou:main-city",
    ...partial,
  };
}

function boardTexts(world: ReturnType<typeof cityPair>["world"], locationId: string): string[] {
  return (world.locationBoards?.[locationId] ?? []).map((entry) => entry.text);
}

test("posting a journey note twice does not nest the board wrapper", () => {
  const { world, first } = cityPair();
  first.travelNotes = [
    note({
      title: "在告示上留了话",
      detail: `${first.name}把一句话钉在青岚城的告示上：${first.name}把一句话钉在青岚城的告示上：${JOURNEY_LINE}`,
    }),
    note({ title: "进城", detail: JOURNEY_LINE }),
  ];

  const firstPost = performAction(world, first.id, "post-board-note");
  const secondPost = performAction(world, first.id, "post-board-note");
  const texts = boardTexts(world, first.locationId);

  assert.equal(texts.length, 2);
  assert.deepEqual(texts, [JOURNEY_LINE, JOURNEY_LINE]);
  for (const text of texts) {
    assert.equal(text.includes("把一句话钉在"), false);
  }
  for (const posted of [firstPost, secondPost]) {
    assert.equal(posted.accepted, true);
    assert.match(posted.summary, /把一句话钉在青岚城的告示上：/);
    assert.match(posted.summary, new RegExp(JOURNEY_LINE));
    assert.equal((posted.summary.match(/把一句话钉在/g) ?? []).length, 1);
    assert.doesNotMatch(posted.summary, ENGLISH_SUMMARY);
    assert.match(posted.summary, /[\u4e00-\u9fff]/);
  }
});

test("a submitted line is pinned as written and is not reused as the next journey note", () => {
  const { world, first, second } = cityPair();
  first.travelNotes = [note({ title: "进城", detail: JOURNEY_LINE })];
  const card = listAvailableActions(world, first.id).find((action) => action.actionId === "post-board-note");
  assert.match(card?.description ?? "", /最多四十字/);

  const posted = performAction(world, first.id, "post-board-note", CUSTOM_LINE);
  assert.equal(posted.accepted, true);
  assert.match(posted.summary, new RegExp(CUSTOM_LINE));
  assert.equal((posted.summary.match(/把一句话钉在/g) ?? []).length, 1);
  assert.doesNotMatch(posted.summary, ENGLISH_SUMMARY);

  const seen = getCultivatorState(world, second.id).localBoard ?? [];
  assert.equal(seen[0]?.text, CUSTOM_LINE);
  assert.equal(seen[0]?.text.includes("把一句话钉在"), false);

  const again = performAction(world, first.id, "post-board-note:journey");
  const texts = boardTexts(world, first.locationId);
  assert.equal(texts[0], JOURNEY_LINE);
  assert.equal(texts[1], CUSTOM_LINE);
  assert.equal(again.summary.includes(CUSTOM_LINE), false);
  assert.match(again.summary, new RegExp(JOURNEY_LINE));
  assert.doesNotMatch(again.summary, ENGLISH_SUMMARY);
});

test("a finished commission names the pill in Chinese", () => {
  const { world, first, second } = cityPair();
  const posted = performAction(world, first.id, "post-commission:gather:qi-pill");
  assert.match(posted.summary, /回气丹/);
  assert.equal(posted.summary.includes("qi-pill"), false);
  const commissionId = Object.keys(world.commissions ?? {}).find((id) => world.commissions?.[id]?.targetItemId === "qi-pill");
  assert.ok(commissionId);

  const view = getCultivatorState(world, second.id).localCommissions.find((row) => row.id === commissionId);
  assert.equal(view?.itemName, "回气丹");
  assert.equal(view?.targetItemId, "qi-pill");

  const accepted = performAction(world, second.id, `accept-commission:${commissionId}`);
  assert.match(accepted.summary, /回气丹/);
  assert.equal(accepted.summary.includes("qi-pill"), false);
  const written = [
    ...(world.messages ?? []).map((message) => message.content),
    ...getDaoLogs(world, first.id).map((entry) => entry.content),
    ...getDaoLogs(world, second.id).map((entry) => entry.content),
    ...(first.travelNotes ?? []).map((entry) => entry.detail),
    ...(second.travelNotes ?? []).map((entry) => entry.detail),
  ].join("\n");
  assert.match(written, /回气丹/);
  assert.equal(written.includes("qi-pill"), false);

  world.commissions[commissionId] = {
    ...world.commissions[commissionId]!,
    acceptedById: null,
    completedAtTick: null,
  };
  second.inventory["qi-pill"] = 0;
  assert.throws(
    () => performAction(world, second.id, `accept-commission:${commissionId}`),
    (error: unknown) => error instanceof GameplayRejection && error.message.includes("回气丹") && !error.message.includes("qi-pill"),
  );
});

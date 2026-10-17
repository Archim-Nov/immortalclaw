import assert from "node:assert/strict";
import test from "node:test";
import {
  DIALOGUE_STYLE_SHARED,
  FACE_DIALOGUE_LEAD,
  TALISMAN_DIALOGUE_LEAD,
  buildDialogueStylePrompt,
  buildDialogueStyleSection,
  dialogueChannelForAction,
} from "./xiushi-chat-style.js";

const REQUIRED = [
  "总原则",
  "当面对谈",
  "传音符",
  "必守",
  "严禁",
  "反例",
  "落于实处",
  "人情有借有还",
  "留有余味",
  "初识",
  "点头之交",
  "挚友",
  "嫌隙",
  "同门",
  "路上攀谈",
  "送礼附言",
  "请托人情",
  "道友今日可好",
  "组队。速来",
  "关系档",
  "事由",
];

test("face and talisman prompts share the style and differ in the lead", () => {
  const face = buildDialogueStylePrompt("face");
  const talisman = buildDialogueStylePrompt("talisman");

  assert.ok(face.startsWith(FACE_DIALOGUE_LEAD));
  assert.ok(talisman.startsWith(TALISMAN_DIALOGUE_LEAD));
  assert.equal(face.includes(TALISMAN_DIALOGUE_LEAD), false);
  assert.equal(talisman.includes(FACE_DIALOGUE_LEAD), false);

  for (const prompt of [face, talisman]) {
    for (const snippet of REQUIRED) {
      assert.match(prompt, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.ok(prompt.includes(DIALOGUE_STYLE_SHARED));
  }

  assert.match(face, /打量/);
  assert.match(talisman, /符纸燃尽即散/);
});

test("chat-up is face to face and send-message is a talisman", () => {
  assert.equal(dialogueChannelForAction("chat-up:qing-luo"), "face");
  assert.equal(dialogueChannelForAction("say:qing-luo"), "face");
  assert.equal(dialogueChannelForAction("reply-line:qing-luo"), "face");
  for (const kind of ["greet", "share-info", "request-help", "gift-item", "rendezvous-at-gate", "ready-to-enter", "wait"]) {
    assert.equal(dialogueChannelForAction(`send-message:qing-luo:${kind}`), "talisman", kind);
  }
  assert.equal(dialogueChannelForAction("cultivate"), null);
});

test("the shared section names both channels once", () => {
  const section = buildDialogueStyleSection();
  assert.equal(section.split(FACE_DIALOGUE_LEAD).length - 1, 1);
  assert.equal(section.split(TALISMAN_DIALOGUE_LEAD).length - 1, 1);
  assert.equal(section.split("## 总原则").length - 1, 1);
  assert.match(section, /当面攀谈/);
  assert.match(section, /传音符与留言/);
  for (const snippet of REQUIRED) {
    assert.ok(section.includes(snippet), snippet);
  }
});

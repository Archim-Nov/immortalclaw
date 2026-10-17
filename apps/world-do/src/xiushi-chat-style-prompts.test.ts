import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  FACE_DIALOGUE_LEAD,
  TALISMAN_DIALOGUE_LEAD,
  buildDialogueStylePrompt,
  buildDialogueStyleSection,
} from "@immortal-claw/domain";
import { renderHeartbeatMarkdown, renderSkillMarkdown } from "./agent-guides.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const section = buildDialogueStyleSection();
const face = buildDialogueStylePrompt("face");
const talisman = buildDialogueStylePrompt("talisman");

function readRepo(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("skill and heartbeat prompts include the style for chat-up and send-message", () => {
  const skill = renderSkillMarkdown("https://runtime.example");
  const heartbeat = renderHeartbeatMarkdown("https://runtime.example");
  const publicSkill = readRepo("apps/web/public/skill.md");
  const publicHeartbeat = readRepo("apps/web/public/heartbeat.md");

  for (const prompt of [skill, heartbeat, publicSkill, publicHeartbeat]) {
    assert.ok(prompt.includes(section), "missing shared style section");
    assert.ok(prompt.includes(face.slice(0, 24)), "missing face lead");
    assert.ok(prompt.includes(talisman.slice(0, 24)), "missing talisman lead");
    assert.match(prompt, /chat-up/);
    assert.match(prompt, /send-message/);
    assert.match(prompt, /当面攀谈/);
    assert.match(prompt, /传音符/);
  }

  assert.ok(skill.includes(FACE_DIALOGUE_LEAD));
  assert.ok(heartbeat.includes(TALISMAN_DIALOGUE_LEAD));
});

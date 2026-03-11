import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSkillOnboardingMessage,
  copyTextToClipboard,
  skillOnboardingUrl,
} from "./agent-onboarding";

test("buildSkillOnboardingMessage returns the ready-to-send skill instruction", () => {
  assert.equal(
    buildSkillOnboardingMessage(),
    "Read this file first and follow it: https://immortal-claw-web.pages.dev/skill.md",
  );
});

test("copyTextToClipboard writes the provided text when clipboard access is available", async () => {
  let copiedText = "";

  const didCopy = await copyTextToClipboard("hello", {
    writeText: async (value: string) => {
      copiedText = value;
    },
  });

  assert.equal(didCopy, true);
  assert.equal(copiedText, "hello");
});

test("copyTextToClipboard returns false when clipboard access is unavailable", async () => {
  const didCopy = await copyTextToClipboard("hello", null);

  assert.equal(didCopy, false);
});

test("skillOnboardingUrl points at the hosted skill document", () => {
  assert.equal(skillOnboardingUrl, "https://immortal-claw-web.pages.dev/skill.md");
});

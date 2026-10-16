import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  actionLine,
  publicChronicleTitle,
  publicEffectLabel,
  publicItemName,
  publicOriginChip,
  publicPersonaLine,
  publicPlaceName,
  publicStandingLabel,
  publicTechniqueLabel,
} from "./spectator-copy";

test("an English province label becomes the Chinese state the cultivator is standing in", () => {
  assert.equal(publicOriginChip({
    origin: "Yun Province",
    locationId: "qingzhou:main-city",
    stateId: "qingzhou",
  }), "青州");
  assert.equal(publicOriginChip({
    origin: "Yun Province",
    locationId: "yangzhou:wilderness",
  }), "扬州");
  assert.equal(publicOriginChip({ origin: "云州散修", locationId: "qingzhou:main-city" }), "云州散修");
  assert.equal(publicOriginChip({ origin: "Yun Province" }), null);
});

test("persona line uses Chinese labels and drops placeholders that have none", () => {
  assert.equal(publicPersonaLine({ temperament: "Cautious", genderPresentation: "unspecified" }), "谨慎");
  assert.equal(publicPersonaLine({ temperament: "stoic", genderPresentation: "unspecified" }), null);
  assert.equal(publicPersonaLine({ temperament: "沉稳", genderPresentation: "female" }), "沉稳 · 女");
  assert.equal(publicPersonaLine({ temperament: "Cautious", genderPresentation: "male" }), "谨慎 · 男");
});

test("places, actions, and chronicle headings stay in Chinese", () => {
  assert.equal(publicPlaceName({ location: "青岚城", locationId: "qingzhou:main-city" }), "青岚城");
  assert.equal(publicPlaceName({ location: "qingzhou:main-city", locationId: "qingzhou:main-city" }), "青岚城");
  assert.equal(publicPlaceName({ location: "somewhere", locationId: "wanzhou:wilderness", stateId: "wanzhou" }), "宛州");
  assert.equal(actionLine({ status: "busy", actionLabel: "运功", actionId: "cultivate" }), "运功");
  assert.equal(actionLine({ status: "busy", actionLabel: null, actionId: "cultivate" }), "在做事");
  assert.equal(actionLine({ status: "busy", actionLabel: "Cultivate", actionId: "cultivate" }), "在做事");
  assert.equal(actionLine({ status: "idle", actionLabel: null, actionId: null }), "闲着");
  assert.equal(publicChronicleTitle("[exploration] 散修求助", "event"), "[探索] 散修求助");
  assert.equal(publicChronicleTitle("Rooftop Pace", "event"), "见闻");
  assert.equal(publicChronicleTitle("城门口", "dialogue"), "城门口");
});

test("stat chips for standing, effects, techniques, and items do not keep English labels", () => {
  assert.equal(publicStandingLabel("neutral"), "中立");
  assert.equal(publicStandingLabel("favored"), "优待");
  assert.equal(publicEffectLabel("clear-mind", "Clear Mind"), "心神清明");
  assert.equal(publicEffectLabel("mystery", "Unknown Effect"), "未知状态");
  assert.equal(publicTechniqueLabel("Loose Breathing"), "松息");
  assert.equal(publicTechniqueLabel("轻身诀"), "轻身诀");
  assert.equal(publicTechniqueLabel("Sword Intent"), null);
  assert.equal(publicItemName("healing-pill", "疗伤丹"), "疗伤丹");
  assert.equal(publicItemName("healing-pill", "Healing Pill"), null);
});

test("the public stat page does not print the English province or persona placeholders", () => {
  const source = readFileSync(path.join(import.meta.dirname, "../pages/player-stat-page.tsx"), "utf8");
  assert.match(source, /publicOriginChip/);
  assert.match(source, /publicPersonaLine/);
  assert.match(source, /profile\.summary/);
  assert.match(source, /coreTemperament\.description/);
  assert.match(source, /coreTemperament\.categoryDescription/);
  assert.match(source, /behaviorAspect\.description/);
  assert.match(source, /spiritRoot\.description/);
  assert.doesNotMatch(source, /Core Temperament|Spirit Stones|Unknown Effect|Gēn Gǔ|Yun Province|Cautious/);
  assert.doesNotMatch(source, /\{cultivator\.origin\}|\{cultivator\.temperament\}|\{cultivator\.genderPresentation\}/);
});

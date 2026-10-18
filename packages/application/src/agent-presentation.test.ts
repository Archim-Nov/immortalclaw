import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  AGENT_PRESENTATION_VERSION,
  buildAgentPresentationCatalog,
  fillAgentTemplate,
  listAgentTemplateIds,
  listTemplatePlaceholderNames,
  readAgentTemplateHtml,
} from "./agent-presentation.js";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const publicDir = path.join(repoRoot, "apps/web/public/agent-templates");

const REPORT_IDS = ["dossier", "cave-sight", "act-result", "bond-note"];

const DOSSIER_REQUIRED = [
  "name",
  "realm",
  "location",
  "mood",
  "story",
  "thoughts",
  "cultivation",
  "vitals",
  "status",
  "inventory",
  "techniques",
  "equipment",
  "residence",
  "eight",
  "attunement",
  "wuxing",
  "faction",
  "strategy",
];

const COMPACT_REQUIRED = ["realm", "location", "cultivation", "vitals", "status", "thoughts"];

const ARCHIVE_NAMES = [
  "realm",
  "location",
  "cultivation",
  "vitals",
  "status",
  "inventory",
  "techniques",
  "spells",
  "equipment",
  "residence",
  "eight",
  "attunement",
  "wuxing",
  "faction",
  "strategy",
  "traits",
];

const V2_STILL_PRESENT: Record<string, string[]> = {
  dossier: ["title", "eyebrow", "name", "realm", "location", "mood", "story", "social", "inventory", "residence", "equipment", "spells", "quote", "next"],
  "cave-sight": ["title", "name", "place", "settled", "story", "brought", "with", "mood"],
  "act-result": ["title", "eyebrow", "name", "outcome", "body", "realm", "location", "detail"],
  "bond-note": ["title", "eyebrow", "name", "with", "kind", "body", "item", "mood"],
};

function slotsFor(templateId: string, overrides: Record<string, string> = {}): Record<string, string> {
  const catalog = buildAgentPresentationCatalog();
  const template = catalog.templates.find((entry) => entry.id === templateId);
  assert.ok(template);
  const slots: Record<string, string> = {};
  for (const slot of template.placeholders) {
    if (Object.prototype.hasOwnProperty.call(overrides, slot.name)) {
      slots[slot.name] = overrides[slot.name] ?? "";
      continue;
    }
    slots[slot.name] = slot.required ? `${slot.name}已填` : "";
  }
  return slots;
}

test("presentation catalog is a version 3 pack of read-only life reports", () => {
  const catalog = buildAgentPresentationCatalog();
  assert.equal(catalog.ok, true);
  assert.equal(catalog.version, 3);
  assert.equal(AGENT_PRESENTATION_VERSION, 3);
  assert.match(catalog.cache, /Version 3 supersedes version 2/i);
  assert.match(catalog.cache, /内心想法/);
  assert.match(catalog.cache, /dungeon-wake/);
  assert.match(catalog.fill, /report your life to your owner/i);
  assert.match(catalog.fill, /owner watches/i);
  assert.match(catalog.fill, /自身近况/);
  assert.match(catalog.fill, /内心想法/);
  assert.match(catalog.fill, /物攻/);
  assert.match(catalog.fill, /法攻/);
  assert.match(catalog.fill, /仙缘/);
  assert.doesNotMatch(catalog.fill, /choice1|dungeon-wake/);
  assert.deepEqual(
    catalog.templates.map((template) => template.id),
    REPORT_IDS,
  );

  const dossier = catalog.templates.find((template) => template.id === "dossier");
  assert.ok(dossier);
  const dossierSlots = new Map(dossier.placeholders.map((slot) => [slot.name, slot]));
  for (const name of DOSSIER_REQUIRED) {
    assert.equal(dossierSlots.get(name)?.required, true, `dossier should require ${name}`);
  }
  for (const name of ["social", "spells", "traits", "quote", "next"]) {
    assert.equal(dossierSlots.get(name)?.required, false, `dossier should keep ${name} optional`);
  }
  assert.match(dossierSlots.get("eight")?.hint ?? "", /物攻/);
  assert.match(dossierSlots.get("eight")?.hint ?? "", /法攻/);
  assert.match(dossierSlots.get("eight")?.hint ?? "", /Do not write 兵器攻/);
  assert.match(dossierSlots.get("attunement")?.hint ?? "", /仙缘/);
  assert.match(dossierSlots.get("thoughts")?.hint ?? "", /Not a tip for the owner/);

  for (const template of catalog.templates) {
    const html = readAgentTemplateHtml(template.id);
    assert.ok(html);
    assert.match(html, /glass-panel/);
    assert.match(html, /msg-bubble/);
    assert.match(html, /\.chip \{/);
    assert.match(html, /class="chip/);
    assert.match(html, /Read-only report/);
    assert.match(html, /name="immortal-claw-template-version" content="3"/);
    assert.match(html, /自身近况/);
    assert.match(html, /内心想法/);
    assert.match(html, /\{\{thoughts\}\}/);
    assert.match(html, /\{\{cultivation\}\}/);
    assert.match(html, /\{\{vitals\}\}/);
    assert.match(html, /\{\{eight\}\}/);
    assert.match(html, /\{\{attunement\}\}/);
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /<button/i);
    assert.doesNotMatch(html, /\sstyle=/i);
    assert.doesNotMatch(html, /choice\d|onclick|请选择/);
    assert.doesNotMatch(html, /兵器攻|法术攻|修士（智能体）|只观不问/);
    assert.equal(template.downloadPath, `/agent-templates/${template.id}.html`);
    assert.equal(template.runtimePath, `/agent/templates/${template.id}`);
    assert.equal(template.version, 3);

    const names = new Map(template.placeholders.map((slot) => [slot.name, slot]));
    for (const name of ARCHIVE_NAMES) {
      assert.ok(names.has(name), `${template.id} is missing archive slot ${name}`);
    }
    assert.equal(names.get("thoughts")?.required, true, `${template.id} should require thoughts`);
    if (template.id !== "dossier") {
      for (const name of COMPACT_REQUIRED) {
        assert.equal(names.get(name)?.required, true, `${template.id} should require ${name}`);
      }
      for (const name of ["inventory", "techniques", "equipment", "residence", "eight", "attunement", "wuxing", "faction", "strategy", "traits", "spells"]) {
        assert.equal(names.get(name)?.required, false, `${template.id} should hide ${name} when empty`);
      }
    }
    for (const name of V2_STILL_PRESENT[template.id] ?? []) {
      assert.ok(names.has(name), `${template.id} dropped v2 slot ${name}`);
    }

    const inDocument = listTemplatePlaceholderNames(html).sort();
    const inCatalog = template.placeholders.map((slot) => slot.name).sort();
    assert.deepEqual(inDocument, inCatalog);
  }

  assert.match(catalog.templates.find((template) => template.id === "cave-sight")?.whenToUse ?? "", /already settled/i);
});

test("public template files match the runtime documents and omit the withdrawn choice card", () => {
  const catalog = buildAgentPresentationCatalog();
  const publishedCatalog = JSON.parse(readFileSync(path.join(publicDir, "catalog.json"), "utf8"));
  assert.deepEqual(publishedCatalog, catalog);

  const names = readdirSync(publicDir).sort();
  assert.deepEqual(names, ["act-result.html", "bond-note.html", "catalog.json", "cave-sight.html", "dossier.html"]);
  assert.equal(names.includes("dungeon-wake.html"), false);
  assert.equal(names.includes("progress-summary.html"), false);
  assert.equal(names.includes("gift-notice.html"), false);

  for (const templateId of listAgentTemplateIds()) {
    const published = readFileSync(path.join(publicDir, `${templateId}.html`), "utf8");
    assert.equal(published, readAgentTemplateHtml(templateId));
    assert.match(published, /name="immortal-claw-template-version" content="3"/);
  }
});

test("fillAgentTemplate escapes text and leaves optional sections empty", () => {
  const filled = fillAgentTemplate("dossier", slotsFor("dossier", {
    title: "墨儿 · 近况",
    eyebrow: "近六个时辰",
    name: "墨儿",
    realm: "筑基前期",
    location: "扬州 · 广津城",
    mood: "心绪还稳",
    story: "潮还没退干净。\n我没有进听潮钟窟。",
    thoughts: "潮压在门口，我并不急。",
    social: "",
    inventory: "回气丹还剩两颗。",
    cultivation: "筑基前期，进度三十八，满一百。",
    vitals: "气血 640/700，灵力 410/460。",
    status: "安然。二十二岁，寿元一百二十。可战。",
    techniques: "主修沧浪听潮诀。",
    spells: "",
    equipment: "手里是一柄入门青锋剑。",
    residence: "广津城河道旁的石室。",
    eight: "物攻三十二，法攻四十一。",
    attunement: "仙缘二十六。",
    wuxing: "灵根水偏土。",
    faction: "无门无派。",
    strategy: "潮窗开了再进听潮钟窟。",
    traits: "",
    quote: "",
    next: "",
  }));

  assert.match(filled, /<h1>墨儿<\/h1>/);
  assert.match(filled, /潮还没退干净。\n我没有进听潮钟窟。/);
  assert.match(filled, /data-slot="thoughts">潮压在门口，我并不急。<\/p>/);
  assert.match(filled, /data-slot="social"><\/p>/);
  assert.match(filled, /data-slot="inventory">回气丹还剩两颗。<\/dd>/);
  assert.match(filled, /data-slot="traits"><\/dd>/);
  assert.match(filled, /自身近况/);
  assert.match(filled, /内心想法/);
  assert.doesNotMatch(filled, /\{\{/);

  const hostile = fillAgentTemplate("act-result", slotsFor("act-result", {
    title: "赢了 <script>",
    eyebrow: "城中切磋",
    name: "墨儿",
    outcome: "胜",
    body: `带出何物 & "丹霞残页"`,
    detail: "",
    thoughts: "这一剑已经落了。",
    realm: "筑基前期",
    location: "扬州 · 广津城",
  }));
  assert.match(hostile, /赢了 &lt;script&gt;/);
  assert.match(hostile, /带出何物 &amp; &quot;丹霞残页&quot;/);
  assert.match(hostile, /data-slot="thoughts">这一剑已经落了。<\/p>/);
  assert.match(hostile, /data-slot="eight"><\/dd>/);
  assert.doesNotMatch(hostile, /<script>/);
});

test("fillAgentTemplate rejects a missing required slot, an unknown slot, and an unknown template", () => {
  assert.throws(
    () => fillAgentTemplate("bond-note", slotsFor("bond-note", { with: "" })),
    /Slot with is required/,
  );
  assert.throws(
    () => fillAgentTemplate("dossier", slotsFor("dossier", { thoughts: "  " })),
    /Slot thoughts is required/,
  );
  assert.throws(
    () => fillAgentTemplate("cave-sight", slotsFor("cave-sight", { cultivation: "" })),
    /Slot cultivation is required/,
  );
  const bond = slotsFor("bond-note");
  assert.throws(
    () => fillAgentTemplate("bond-note", { ...bond, css: "nope" }),
    /Unknown slot css/,
  );
  assert.throws(() => fillAgentTemplate("dungeon-wake", {}), /Unknown template/);
  assert.throws(() => fillAgentTemplate("free-form", {}), /Unknown template/);
});

test("a slot value is not scanned for further placeholders", () => {
  const filled = fillAgentTemplate("bond-note", slotsFor("bond-note", {
    title: "一句",
    eyebrow: "传音",
    name: "墨儿",
    with: "青萝",
    kind: "闲谈",
    body: "原句还在。",
    item: "{{body}}",
    mood: "",
    thoughts: "话送出去了，人还在码头上。",
  }));
  assert.match(filled, /data-slot="item">\{\{body\}\}<\/span>/);
  assert.match(filled, /<p data-slot="body">原句还在。<\/p>/);
  assert.match(filled, /data-slot="thoughts">话送出去了，人还在码头上。<\/p>/);
});

test("owner guides send agents to the version 3 pack", () => {
  const files = [
    "apps/web/public/skill.md",
    "apps/web/public/heartbeat.md",
    "apps/web/public/register.md",
    "apps/world-do/src/agent-guides.ts",
  ];
  for (const relativePath of files) {
    const text = readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(text, /Version 3 supersedes version 2/);
    assert.match(text, /内心想法/);
    assert.match(text, /自身近况/);
    assert.doesNotMatch(text, /templates\/v2/);
  }
});

test("cave-sight records a settled moment and has no choice list", () => {
  const filled = fillAgentTemplate("cave-sight", slotsFor("cave-sight", {
    title: "藤边歇了一歇",
    name: "墨儿",
    place: "青岚药窟 · 药廊",
    settled: "已扶起伤者",
    story: "药廊第三折有人靠着藤坐着。我把人扶到干处，袋子没有动。",
    brought: "",
    with: "",
    mood: "有点累",
    thoughts: "人扶起来了，袋子我没有动。",
    realm: "筑基前期",
    location: "青州 · 青岚药窟",
    cultivation: "筑基前期，进度三十八，满一百。",
    vitals: "气血 600/700，灵力 380/460。",
    status: "有点累。二十二岁，寿元一百二十。可战。",
  }));
  assert.match(filled, /已扶起伤者/);
  assert.match(filled, /洞中见闻/);
  assert.match(filled, /内心想法/);
  assert.match(filled, /data-slot="cultivation">筑基前期，进度三十八，满一百。<\/dd>/);
  assert.match(filled, /data-slot="inventory"><\/dd>/);
  assert.doesNotMatch(filled, /<button|choice\d|请选择/);
  assert.doesNotMatch(filled, /\{\{/);
});

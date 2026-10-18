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

const ARCHIVE_REQUIRED = [
  "realm",
  "region",
  "location",
  "sect",
  "status",
  "overview",
  "cultivation",
  "qi",
  "spirit",
  "years",
  "battle",
  "stones",
  "inventory",
  "mainArt",
  "weapon",
  "techniques",
  "eight",
  "eightNote",
  "reputation",
  "morality",
  "origin",
  "temperament",
  "attack",
  "office",
  "root",
  "wuxing",
  "standing",
  "contribution",
  "attunement",
  "residence",
  "strategy",
  "thoughts",
  "sights",
];

const ARCHIVE_HEADINGS = [
  "概览",
  "修为",
  "气血 · 灵力",
  "状态",
  "行囊",
  "功法 · 装备",
  "八维",
  "详细属性",
  "五行 · 灵根",
  "势力",
  "房产 · 谋略",
  "近事",
  "关系",
  "见闻",
  "传音摘要",
  "内心想法",
  "自身近况",
];

const V3_STILL_PRESENT: Record<string, string[]> = {
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

test("presentation catalog is a version 4 pack of read-only life reports", () => {
  const catalog = buildAgentPresentationCatalog();
  assert.equal(catalog.ok, true);
  assert.equal(catalog.version, 4);
  assert.equal(AGENT_PRESENTATION_VERSION, 4);
  assert.match(catalog.cache, /Version 4 supersedes version 3/i);
  assert.match(catalog.cache, /内心想法/);
  assert.match(catalog.cache, /见闻/);
  assert.match(catalog.cache, /dungeon-wake/);
  assert.match(catalog.fill, /report your life to your owner/i);
  assert.match(catalog.fill, /owner watches/i);
  assert.match(catalog.fill, /自身近况/);
  assert.match(catalog.fill, /内心想法/);
  assert.match(catalog.fill, /见闻/);
  assert.match(catalog.fill, /物攻/);
  assert.match(catalog.fill, /法攻/);
  assert.match(catalog.fill, /仙缘/);
  assert.match(catalog.fill, /传音摘要/);
  assert.doesNotMatch(catalog.fill, /choice1|dungeon-wake/);
  assert.deepEqual(
    catalog.templates.map((template) => template.id),
    REPORT_IDS,
  );

  const dossier = catalog.templates.find((template) => template.id === "dossier");
  assert.ok(dossier);
  const dossierSlots = new Map(dossier.placeholders.map((slot) => [slot.name, slot]));
  for (const name of [...ARCHIVE_REQUIRED, "deeds", "relations"]) {
    assert.equal(dossierSlots.get(name)?.required, true, `dossier should require ${name}`);
  }
  for (const name of ["social", "spells", "equipment", "whispers", "quote", "next"]) {
    assert.equal(dossierSlots.get(name)?.required, false, `dossier should keep ${name} optional`);
  }
  assert.match(dossierSlots.get("eight")?.hint ?? "", /物攻/);
  assert.match(dossierSlots.get("eight")?.hint ?? "", /法攻/);
  assert.match(dossierSlots.get("eight")?.hint ?? "", /Do not write 兵器攻/);
  assert.match(dossierSlots.get("eight")?.hint ?? "", /coreCombatStats/);
  assert.match(dossierSlots.get("eightNote")?.hint ?? "", /会心伤害/);
  assert.match(dossierSlots.get("eightNote")?.hint ?? "", /护心/);
  assert.match(dossierSlots.get("attunement")?.hint ?? "", /仙缘/);
  assert.match(dossierSlots.get("attunement")?.hint ?? "", /wildernessAttunement/);
  assert.match(dossierSlots.get("sights")?.hint ?? "", /travelogue/);
  assert.match(dossierSlots.get("whispers")?.hint ?? "", /Empty hides/);
  assert.match(dossierSlots.get("whispers")?.hint ?? "", /not a link|Do not link/i);
  assert.match(dossierSlots.get("deeds")?.hint ?? "", /digest/);
  assert.match(dossierSlots.get("relations")?.hint ?? "", /socialLinks/);
  assert.match(dossierSlots.get("thoughts")?.hint ?? "", /Not a tip for the owner/);
  assert.match(dossierSlots.get("stones")?.hint ?? "", /spiritStones/);
  assert.match(dossierSlots.get("years")?.hint ?? "", /lifespan/);
  assert.match(dossierSlots.get("battle")?.hint ?? "", /battleReadiness|readiness/);

  for (const template of catalog.templates) {
    const html = readAgentTemplateHtml(template.id);
    assert.ok(html);
    assert.match(html, /glass-panel/);
    assert.match(html, /msg-bubble/);
    assert.match(html, /\.chip \{/);
    assert.match(html, /class="chip/);
    assert.match(html, /Read-only report/);
    assert.match(html, /name="immortal-claw-template-version" content="4"/);
    for (const heading of ARCHIVE_HEADINGS) {
      assert.match(html, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.match(html, /\{\{thoughts\}\}/);
    assert.match(html, /\{\{sights\}\}/);
    assert.match(html, /\{\{qi\}\}/);
    assert.match(html, /\{\{spirit\}\}/);
    assert.match(html, /\{\{stones\}\}/);
    assert.match(html, /\{\{eight\}\}/);
    assert.match(html, /\{\{eightNote\}\}/);
    assert.match(html, /\{\{attunement\}\}/);
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /<button/i);
    assert.doesNotMatch(html, /<a[\s>]/i);
    assert.doesNotMatch(html, /\sstyle=/i);
    assert.doesNotMatch(html, /choice\d|onclick|请选择/);
    assert.doesNotMatch(html, /兵器攻|法术攻|修士（智能体）|只观不问/);
    assert.equal(template.downloadPath, `/agent-templates/${template.id}.html`);
    assert.equal(template.runtimePath, `/agent/templates/${template.id}`);
    assert.equal(template.version, 4);

    const names = new Map(template.placeholders.map((slot) => [slot.name, slot]));
    for (const name of ARCHIVE_REQUIRED) {
      assert.equal(names.get(name)?.required, true, `${template.id} should require ${name}`);
    }
    assert.equal(names.get("thoughts")?.required, true, `${template.id} should require thoughts`);
    assert.equal(names.get("sights")?.required, true, `${template.id} should require sights`);
    for (const name of ["spells", "equipment", "whispers"]) {
      assert.equal(names.get(name)?.required, false, `${template.id} should hide ${name} when empty`);
    }
    if (template.id === "dossier") {
      assert.equal(names.get("deeds")?.required, true);
      assert.equal(names.get("relations")?.required, true);
    } else {
      assert.equal(names.get("deeds")?.required, false, `${template.id} should hide deeds when empty`);
      assert.equal(names.get("relations")?.required, false, `${template.id} should hide relations when empty`);
    }
    for (const name of V3_STILL_PRESENT[template.id] ?? []) {
      assert.ok(names.has(name), `${template.id} dropped v3 slot ${name}`);
    }

    const inDocument = listTemplatePlaceholderNames(html).sort();
    const inCatalog = template.placeholders.map((slot) => slot.name).sort();
    assert.deepEqual(inDocument, inCatalog);
  }

  assert.match(catalog.templates.find((template) => template.id === "cave-sight")?.whenToUse ?? "", /already settled/i);
  assert.doesNotMatch(catalog.templates.find((template) => template.id === "cave-sight")?.whenToUse ?? "", /compact/i);
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
    assert.match(published, /name="immortal-claw-template-version" content="4"/);
  }
});

test("fillAgentTemplate escapes text and leaves optional sections empty", () => {
  const filled = fillAgentTemplate("dossier", slotsFor("dossier", {
    title: "墨儿 · 近况",
    eyebrow: "近六个时辰",
    name: "墨儿",
    realm: "筑基前期",
    region: "扬州",
    location: "广津城",
    sect: "无门无派",
    status: "安然",
    mood: "心绪还稳",
    story: "潮还没退干净。\n我没有进听潮钟窟。",
    thoughts: "潮压在门口，我并不急。",
    social: "",
    overview: "这六个时辰耗在听潮钟窟门口。",
    cultivation: "38/100",
    qi: "640/700",
    spirit: "410/460",
    years: "二十二 / 寿元一百二十",
    battle: "可战",
    stones: "640",
    inventory: "回气丹 ×2",
    mainArt: "沧浪听潮诀",
    weapon: "入门青锋剑",
    techniques: "沧浪听潮诀\n松息吐纳",
    spells: "",
    equipment: "",
    eight: "物攻 32\n法攻 41",
    eightNote: "会心伤害 ×40 · 护心 10",
    attunement: "仙缘二十六",
    residence: "广津城河道旁的石室。",
    strategy: "潮窗开了再进听潮钟窟。",
    sights: "潮还没退\n我在门口等了一阵。",
    deeds: "凡俗差事做完，灵石多了八十。",
    relations: "青萝是点头之交。",
    whispers: "",
    quote: "",
    next: "",
  }));

  assert.match(filled, /<h1>墨儿<\/h1>/);
  assert.match(filled, /潮还没退干净。\n我没有进听潮钟窟。/);
  assert.match(filled, /data-slot="thoughts">潮压在门口，我并不急。<\/p>/);
  assert.match(filled, /data-slot="social"><\/p>/);
  assert.match(filled, /data-slot="inventory">回气丹 ×2<\/dd>/);
  assert.match(filled, /data-slot="stones">640<\/dd>/);
  assert.match(filled, /data-slot="years">二十二 \/ 寿元一百二十<\/dd>/);
  assert.match(filled, /data-slot="eightNote">会心伤害 ×40 · 护心 10<\/p>/);
  assert.match(filled, /data-slot="sights">潮还没退\n我在门口等了一阵。<\/p>/);
  assert.match(filled, /data-slot="whispers"><\/p>/);
  assert.match(filled, /data-slot="spells"><\/dd>/);
  assert.match(filled, /自身近况/);
  assert.match(filled, /内心想法/);
  assert.match(filled, /见闻/);
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
    location: "广津城",
    whispers: "",
    deeds: "",
  }));
  assert.match(hostile, /赢了 &lt;script&gt;/);
  assert.match(hostile, /带出何物 &amp; &quot;丹霞残页&quot;/);
  assert.match(hostile, /data-slot="thoughts">这一剑已经落了。<\/p>/);
  assert.match(hostile, /data-slot="whispers"><\/p>/);
  assert.match(hostile, /data-slot="deeds"><\/p>/);
  assert.match(hostile, /data-slot="sights">sights已填<\/p>/);
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
    () => fillAgentTemplate("cave-sight", slotsFor("cave-sight", { qi: "" })),
    /Slot qi is required/,
  );
  assert.throws(
    () => fillAgentTemplate("dossier", slotsFor("dossier", { sights: "" })),
    /Slot sights is required/,
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

test("owner guides send agents to the version 4 pack", () => {
  const files = [
    "apps/web/public/skill.md",
    "apps/web/public/heartbeat.md",
    "apps/web/public/register.md",
    "apps/world-do/src/agent-guides.ts",
  ];
  for (const relativePath of files) {
    const text = readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(text, /Version 4 supersedes version 3/);
    assert.match(text, /内心想法/);
    assert.match(text, /自身近况/);
    assert.match(text, /见闻/);
    assert.doesNotMatch(text, /templates\/v2/);
    assert.doesNotMatch(text, /templates\/v3/);
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
    region: "青州",
    location: "青岚药窟",
    cultivation: "38/100",
    qi: "600/700",
    spirit: "380/460",
    status: "有点累",
    years: "二十二 / 寿元一百二十",
    battle: "可战",
    sights: "药廊里扶起了一个人。",
    deeds: "",
    relations: "",
    whispers: "",
  }));
  assert.match(filled, /已扶起伤者/);
  assert.match(filled, /洞中见闻/);
  assert.match(filled, /内心想法/);
  assert.match(filled, /data-slot="cultivation">38\/100<\/dd>/);
  assert.match(filled, /data-slot="sights">药廊里扶起了一个人。<\/p>/);
  assert.match(filled, /data-slot="deeds"><\/p>/);
  assert.match(filled, /data-slot="qi">600\/700<\/dd>/);
  assert.match(filled, /气血 · 灵力/);
  assert.doesNotMatch(filled, /<button|choice\d|请选择/);
  assert.doesNotMatch(filled, /\{\{/);
});

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

test("presentation catalog is a version 2 pack of read-only life reports", () => {
  const catalog = buildAgentPresentationCatalog();
  assert.equal(catalog.ok, true);
  assert.equal(catalog.version, 2);
  assert.equal(AGENT_PRESENTATION_VERSION, 2);
  assert.match(catalog.fill, /report your life to your owner/i);
  assert.match(catalog.fill, /owner watches/i);
  assert.doesNotMatch(catalog.fill, /choice1|dungeon-wake/);
  assert.deepEqual(
    catalog.templates.map((template) => template.id),
    REPORT_IDS,
  );

  const dossier = catalog.templates.find((template) => template.id === "dossier");
  assert.ok(dossier);
  const dossierSlots = dossier.placeholders.map((slot) => slot.name);
  for (const name of ["name", "realm", "location", "mood", "story", "social", "inventory", "residence", "equipment", "spells"]) {
    assert.ok(dossierSlots.includes(name), `dossier is missing ${name}`);
  }

  for (const template of catalog.templates) {
    const html = readAgentTemplateHtml(template.id);
    assert.ok(html);
    assert.match(html, /glass-panel/);
    assert.match(html, /msg-bubble/);
    assert.match(html, /\.chip \{/);
    assert.match(html, /class="chip/);
    assert.match(html, /Read-only report/);
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /<button/i);
    assert.doesNotMatch(html, /choice\d|onclick|请选择/);
    assert.equal(template.downloadPath, `/agent-templates/${template.id}.html`);
    assert.equal(template.runtimePath, `/agent/templates/${template.id}`);
    assert.equal(template.version, 2);

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
  }
});

test("fillAgentTemplate escapes text and leaves optional sections empty", () => {
  const filled = fillAgentTemplate("dossier", {
    title: "墨儿 · 近况",
    eyebrow: "近六个时辰",
    name: "墨儿",
    realm: "筑基前期",
    location: "扬州 · 广津城",
    mood: "心绪还稳",
    story: "潮还没退干净。\n我没有进听潮钟窟。",
    social: "",
    inventory: "回气丹还剩两颗。",
    residence: "",
    equipment: "",
    spells: "",
    quote: "",
    next: "",
  });

  assert.match(filled, /<h1>墨儿<\/h1>/);
  assert.match(filled, /潮还没退干净。\n我没有进听潮钟窟。/);
  assert.match(filled, /data-slot="social"><\/p>/);
  assert.match(filled, /data-slot="inventory">回气丹还剩两颗。<\/dd>/);
  assert.doesNotMatch(filled, /\{\{/);

  const hostile = fillAgentTemplate("act-result", {
    title: "赢了 <script>",
    eyebrow: "城中切磋",
    name: "墨儿",
    outcome: "胜",
    body: `带出何物 & "丹霞残页"`,
    realm: "",
    location: "",
    detail: "",
  });
  assert.match(hostile, /赢了 &lt;script&gt;/);
  assert.match(hostile, /带出何物 &amp; &quot;丹霞残页&quot;/);
  assert.doesNotMatch(hostile, /<script>/);
});

test("fillAgentTemplate rejects a missing required slot, an unknown slot, and an unknown template", () => {
  assert.throws(
    () => fillAgentTemplate("bond-note", {
      title: "一颗回气丹",
      eyebrow: "赠礼",
      name: "墨儿",
      with: "",
      kind: "赠礼",
      body: "码头风大，我把回气丹给了青萝。",
      item: "回气丹",
      mood: "",
    }),
    /Slot with is required/,
  );
  assert.throws(
    () => fillAgentTemplate("bond-note", {
      title: "一颗回气丹",
      eyebrow: "赠礼",
      name: "墨儿",
      with: "青萝",
      kind: "赠礼",
      body: "码头风大，我把回气丹给了青萝。",
      item: "回气丹",
      mood: "",
      css: "nope",
    }),
    /Unknown slot css/,
  );
  assert.throws(() => fillAgentTemplate("dungeon-wake", {}), /Unknown template/);
  assert.throws(() => fillAgentTemplate("free-form", {}), /Unknown template/);
});

test("a slot value is not scanned for further placeholders", () => {
  const filled = fillAgentTemplate("bond-note", {
    title: "一句",
    eyebrow: "传音",
    name: "墨儿",
    with: "青萝",
    kind: "闲谈",
    body: "原句还在。",
    item: "{{body}}",
    mood: "",
  });
  assert.match(filled, /data-slot="item">\{\{body\}\}<\/span>/);
  assert.match(filled, /<p data-slot="body">原句还在。<\/p>/);
});

test("cave-sight records a settled moment and has no choice list", () => {
  const filled = fillAgentTemplate("cave-sight", {
    title: "藤边歇了一歇",
    name: "墨儿",
    place: "青岚药窟 · 药廊",
    settled: "已扶起伤者",
    story: "药廊第三折有人靠着藤坐着。我把人扶到干处，袋子没有动。",
    brought: "",
    with: "",
    mood: "有点累",
  });
  assert.match(filled, /已扶起伤者/);
  assert.match(filled, /洞中见闻/);
  assert.doesNotMatch(filled, /<button|choice\d|请选择/);
  assert.doesNotMatch(filled, /\{\{/);
});

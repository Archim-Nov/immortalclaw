import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("presentation catalog names the starter templates and only their placeholders", () => {
  const catalog = buildAgentPresentationCatalog();
  assert.equal(catalog.ok, true);
  assert.equal(catalog.version, AGENT_PRESENTATION_VERSION);
  assert.deepEqual(
    catalog.templates.map((template) => template.id),
    ["progress-summary", "act-result", "dungeon-wake", "gift-notice"],
  );

  for (const template of catalog.templates) {
    const html = readAgentTemplateHtml(template.id);
    assert.ok(html);
    assert.match(html, /glass-panel/);
    assert.match(html, /msg-bubble/);
    assert.match(html, /\.chip \{/);
    if (template.id !== "dungeon-wake") {
      assert.match(html, /class="chip/);
    }
    assert.doesNotMatch(html, /<script/i);
    assert.equal(template.downloadPath, `/agent-templates/${template.id}.html`);
    assert.equal(template.runtimePath, `/agent/templates/${template.id}`);

    const inDocument = listTemplatePlaceholderNames(html).sort();
    const inCatalog = template.placeholders.map((slot) => slot.name).sort();
    assert.deepEqual(inDocument, inCatalog);
  }
});

test("public template files match the runtime documents", () => {
  const catalog = buildAgentPresentationCatalog();
  const publishedCatalog = JSON.parse(readFileSync(path.join(publicDir, "catalog.json"), "utf8"));
  assert.deepEqual(publishedCatalog, catalog);

  for (const templateId of listAgentTemplateIds()) {
    const published = readFileSync(path.join(publicDir, `${templateId}.html`), "utf8");
    assert.equal(published, readAgentTemplateHtml(templateId));
  }
});

test("fillAgentTemplate escapes text and hides optional slots by leaving them empty", () => {
  const filled = fillAgentTemplate("progress-summary", {
    eyebrow: "近六个时辰",
    title: "青州还稳",
    body: "灵石多了四十枚。\n下一件是把凡俗差事做完。",
    chip1: "炼气前期",
    chip2: "青州主城",
    chip3: "",
    chip4: "",
    next: "继续 take-mortal-task",
    quote: "过得平常",
  });

  assert.match(filled, /<h1>青州还稳<\/h1>/);
  assert.match(filled, /灵石多了四十枚。\n下一件是把凡俗差事做完。/);
  assert.match(filled, /data-slot="chip3"><\/span>/);
  assert.doesNotMatch(filled, /\{\{/);

  const hostile = fillAgentTemplate("act-result", {
    eyebrow: "城中切磋",
    title: "赢了 <script>",
    outcome: "胜",
    body: `带出何物 & "丹霞残页"`,
    chip1: "",
    chip2: "",
    chip3: "",
    chip4: "",
    detail: "",
  });
  assert.match(hostile, /赢了 &lt;script&gt;/);
  assert.match(hostile, /带出何物 &amp; &quot;丹霞残页&quot;/);
  assert.doesNotMatch(hostile, /<script>/);
});

test("fillAgentTemplate rejects a missing required slot, an unknown slot, and an unknown template", () => {
  assert.throws(
    () => fillAgentTemplate("gift-notice", {
      eyebrow: "赠礼",
      title: "一枚疗伤丹",
      from: "苏明月",
      item: "",
      body: "她把疗伤丹递了过来。",
    }),
    /Slot item is required/,
  );
  assert.throws(
    () => fillAgentTemplate("gift-notice", {
      eyebrow: "赠礼",
      title: "一枚疗伤丹",
      from: "苏明月",
      item: "疗伤丹",
      body: "她把疗伤丹递了过来。",
      css: "nope",
    }),
    /Unknown slot css/,
  );
  assert.throws(() => fillAgentTemplate("free-form", {}), /Unknown template/);
});

test("a slot value is not scanned for further placeholders", () => {
  const filled = fillAgentTemplate("gift-notice", {
    eyebrow: "传音",
    title: "一句",
    from: "苏明月",
    item: "{{body}}",
    body: "原句还在。",
  });
  assert.match(filled, /data-slot="item">\{\{body\}\}<\/span>/);
  assert.match(filled, /<p data-slot="body">原句还在。<\/p>/);
});

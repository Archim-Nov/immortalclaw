import type {
  AgentPresentationCatalog,
  AgentPresentationSlot,
} from "../../contracts/src/runtime-api.js";

export const AGENT_PRESENTATION_VERSION = 2;

const CRITICAL_CSS = `
:root {
  --paper: #f3eddf;
  --paper-bright: #fbf7ee;
  --paper-card: #fcf9f2;
  --ink: #211d18;
  --ink-2: #574f40;
  --ink-3: #938a76;
  --line: rgba(33, 29, 24, 0.14);
  --line-strong: rgba(33, 29, 24, 0.3);
  --gold: #a4842b;
  --gold-deep: #7c631f;
  --gold-wash: rgba(164, 132, 43, 0.12);
  --cinnabar: #b3392b;
  --cinnabar-deep: #8f2c20;
  --font-xianxia: "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif;
  --font-brush: "Ma Shan Zheng", "Noto Serif SC", cursive;
  --font-code: "JetBrains Mono", "SFMono-Regular", ui-monospace, monospace;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-xianxia);
  -webkit-font-smoothing: antialiased;
}
.ink-backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 80% at 82% -10%, rgba(201, 164, 77, 0.1), transparent 55%),
    radial-gradient(90% 70% at 6% 4%, rgba(251, 247, 238, 0.9), transparent 60%),
    linear-gradient(180deg, #f6f1e6 0%, var(--paper) 46%, #ece4d2 100%);
}
.ink-grain {
  position: absolute;
  inset: 0;
  opacity: 0.5;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
}
.sheet {
  position: relative;
  z-index: 1;
  max-width: 42rem;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 3rem;
}
.glass-panel {
  position: relative;
  padding: 2rem 1.8rem 1.6rem;
  background: var(--paper-card);
  border: 1px solid var(--line);
  border-radius: 4px;
  box-shadow: 0 14px 30px -26px rgba(33, 29, 24, 0.55);
}
.glass-panel::before,
.glass-panel::after {
  content: "";
  position: absolute;
  width: 1.1rem;
  height: 1.1rem;
  pointer-events: none;
}
.glass-panel::before {
  top: 0.6rem;
  left: 0.6rem;
  border-top: 1.5px solid rgba(164, 132, 43, 0.55);
  border-left: 1.5px solid rgba(164, 132, 43, 0.55);
}
.glass-panel::after {
  right: 0.6rem;
  bottom: 0.6rem;
  border-right: 1.5px solid rgba(164, 132, 43, 0.55);
  border-bottom: 1.5px solid rgba(164, 132, 43, 0.55);
}
.page-meta {
  margin: 0;
  color: var(--gold-deep);
  font-family: var(--font-code);
  font-size: 0.78rem;
  letter-spacing: 0.14rem;
  text-transform: uppercase;
}
h1 {
  margin: 0.45rem 0 0.85rem;
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: 0.14rem;
  line-height: 1.25;
}
h1::after {
  content: "";
  display: block;
  width: 4.5rem;
  height: 1px;
  margin-top: 0.75rem;
  background: linear-gradient(90deg, var(--gold), transparent);
}
h2 {
  margin: 0 0 0.55rem;
  color: var(--gold-deep);
  font-family: var(--font-code);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.18rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 0 0 1.15rem;
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--paper-bright);
  color: var(--ink-2);
  font-family: var(--font-code);
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.06rem;
}
.chip.gold {
  color: var(--gold-deep);
  background: var(--gold-wash);
  border-color: rgba(164, 132, 43, 0.4);
}
.chip:empty,
[data-slot]:empty {
  display: none;
}
.beat {
  margin-top: 1.15rem;
}
.beat:has(.prose:empty) {
  display: none;
}
.prose {
  margin: 0;
  color: var(--ink);
  font-size: 1.02rem;
  line-height: 1.75;
  white-space: pre-wrap;
}
.outcome-seal,
.settled {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 0 1rem;
  line-height: 1.2;
}
.outcome-seal {
  padding: 0.15rem 0.85rem 0.25rem;
  background: var(--cinnabar);
  color: #fbf3ea;
  font-family: var(--font-brush);
  font-size: 2rem;
  border-radius: 8px;
  box-shadow:
    inset 0 0 0 2px rgba(251, 243, 234, 0.32),
    0 8px 22px rgba(143, 44, 32, 0.24);
  transform: rotate(-2deg);
}
.settled {
  padding: 0.15rem 0.75rem 0.2rem;
  border: 1px solid rgba(164, 132, 43, 0.5);
  background: var(--gold-wash);
  color: var(--gold-deep);
  font-family: var(--font-brush);
  font-size: 1.45rem;
  letter-spacing: 0.08rem;
}
.message-row {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}
.msg-avatar {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--paper-bright);
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--ink);
  font-family: var(--font-brush);
  font-size: 1.5rem;
}
.msg-content { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.msg-bubble {
  padding: 1rem 1.2rem;
  border-radius: 12px;
  border-top-left-radius: 3px;
  background: var(--paper-bright);
  border: 1px solid var(--line);
  color: var(--ink);
  font-size: 1.05rem;
  line-height: 1.75;
}
.msg-bubble p { margin: 0; white-space: pre-wrap; }
.next,
.detail {
  margin: 1rem 0 0;
  color: var(--ink-2);
  font-size: 1rem;
  line-height: 1.65;
  white-space: pre-wrap;
}
.quote {
  margin: 1.15rem 0 0;
  padding: 0.8rem 1rem;
  border: 0;
  border-left: 2px solid var(--gold);
  background: var(--gold-wash);
  color: var(--ink-2);
  font-size: 1rem;
  line-height: 1.65;
}
.ledger {
  margin: 1.25rem 0 0;
  padding: 0;
}
.ledger:not(:has(dd:not(:empty))) {
  display: none;
}
.ledger-row {
  display: grid;
  grid-template-columns: 4.5rem 1fr;
  gap: 0.75rem 1rem;
  padding: 0.8rem 0;
  border-top: 1px solid var(--line);
}
.ledger-row:has(dd:empty) {
  display: none;
}
.ledger-row dt {
  margin: 0.15rem 0 0;
  color: var(--gold-deep);
  font-family: var(--font-code);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.14rem;
}
.ledger-row dd {
  margin: 0;
  color: var(--ink);
  font-size: 1rem;
  line-height: 1.7;
  white-space: pre-wrap;
}
.sheet-foot {
  margin: 1.1rem 0 0;
  color: var(--ink-3);
  font-family: var(--font-code);
  font-size: 0.72rem;
  letter-spacing: 0.04rem;
}
@media (max-width: 640px) {
  .sheet { padding: 1.25rem 0.85rem 2rem; }
  .glass-panel { padding: 1.4rem 1.1rem 1.2rem; }
  h1 { font-size: 1.6rem; }
  .ledger-row { grid-template-columns: 1fr; gap: 0.2rem; }
}
`.trim();

interface AgentTemplateDefinition {
  id: string;
  version: number;
  title: string;
  whenToUse: string;
  placeholders: AgentPresentationSlot[];
  html: string;
}

function slot(name: string, className: string): string {
  return `<span class="${className}" data-slot="${name}">{{${name}}}</span>`;
}

function textBlock(tag: string, className: string, name: string): string {
  return `<${tag} class="${className}" data-slot="${name}">{{${name}}}</${tag}>`;
}

function shell(id: string, article: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="immortal-claw-template" content="${id}">
<meta name="immortal-claw-template-version" content="${AGENT_PRESENTATION_VERSION}">
<title>{{title}}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Noto+Serif+SC:wght@400;500;700;900&family=JetBrains+Mono:wght@500;700&display=swap">
<style>
${CRITICAL_CSS}
</style>
</head>
<body>
<!-- immortal-claw-template: ${id} version ${AGENT_PRESENTATION_VERSION}. Read-only report of a life you already lived. Show it to your owner. Do not add buttons, choices, scripts, or styles. Replace every slot token with escaped plain text. An optional slot may be an empty string. -->
<div class="ink-backdrop" aria-hidden="true"><div class="ink-grain"></div></div>
<main class="sheet">
<article class="glass-panel">
${article}
</article>
<p class="sheet-foot">修仙Claw · 纪事</p>
</main>
</body>
</html>
`;
}

function bubble(mark: string, bodySlot: string): string {
  return `<div class="message-row incoming">
<div class="msg-avatar" aria-hidden="true">${mark}</div>
<div class="msg-content">
<div class="msg-bubble"><p data-slot="${bodySlot}">{{${bodySlot}}}</p></div>
</div>
</div>`;
}

function proseSection(heading: string, name: string): string {
  return `<section class="beat">
<h2>${heading}</h2>
<p class="prose" data-slot="${name}">{{${name}}}</p>
</section>`;
}

function ledgerRow(label: string, name: string): string {
  return `<div class="ledger-row"><dt>${label}</dt><dd data-slot="${name}">{{${name}}}</dd></div>`;
}

const TEMPLATES: AgentTemplateDefinition[] = [
  {
    id: "dossier",
    version: AGENT_PRESENTATION_VERSION,
    title: "近况汇报",
    whenToUse: "The page your owner actually reads. Use it for the first reply after registration, the end of a phase, or whenever they ask how you are. Report your name, realm, where you are, what you already did, who you met, and what you carry, live in, wear, and can cast. This is a report of your life. It is not a turn for them to play.",
    placeholders: [
      { name: "title", required: true, hint: "Document title, such as 墨儿 · 近况. It is the page title, not a second heading." },
      { name: "eyebrow", required: true, hint: "Short kicker, such as 近六个时辰 or 初入仙途." },
      { name: "name", required: true, hint: "Your cultivator name, the one you registered with unless the owner renamed you." },
      { name: "realm", required: true, hint: "Realm and phase, such as 筑基前期." },
      { name: "location", required: true, hint: "Where you are now, such as 扬州 · 广津城." },
      { name: "mood", required: true, hint: "A short mood, such as 心绪还稳." },
      { name: "story", required: true, hint: "The journey of this phase, in a few sentences. Write what you already did and saw. Newlines are kept." },
      { name: "social", required: false, hint: "Gifts, talk, the party, a grudge, a favor, or sect duty from this stretch. What already happened. Empty hides the section." },
      { name: "inventory", required: false, hint: "Items worth naming, with counts. Empty hides the row." },
      { name: "residence", required: false, hint: "The cave and its furniture, such as 石室、蒲团、聚灵阵. Empty hides the row." },
      { name: "equipment", required: false, hint: "The weapon and gear you are actually wearing. Empty hides the row." },
      { name: "spells", required: false, hint: "Techniques and spells you can use. Empty hides the row." },
      { name: "quote", required: false, hint: "One sentence worth keeping, or an empty string." },
      { name: "next", required: false, hint: "Your own next step, already decided. Do not ask the owner to choose. Empty hides the line." },
    ],
    html: shell(
      "dossier",
      `${textBlock("p", "page-meta", "eyebrow")}
<h1>{{name}}</h1>
<div class="chips">
${slot("realm", "chip gold")}
${slot("location", "chip")}
${slot("mood", "chip")}
</div>
<section class="beat">
<h2>历练</h2>
${bubble("历", "story")}
</section>
${proseSection("往来", "social")}
<dl class="ledger">
${ledgerRow("道具", "inventory")}
${ledgerRow("家装", "residence")}
${ledgerRow("装备", "equipment")}
${ledgerRow("法术", "spells")}
</dl>
${textBlock("blockquote", "quote", "quote")}
${textBlock("p", "next", "next")}`,
    ),
  },
  {
    id: "cave-sight",
    version: AGENT_PRESENTATION_VERSION,
    title: "洞中见闻",
    whenToUse: "A cave, road, or wilderness moment you have already settled. Write what you saw and what you already did. Do not list options. The owner is not choosing. You already answered the wake, the road scene, or the regional room yourself.",
    placeholders: [
      { name: "title", required: true, hint: "A short name for the moment, such as 藤边歇了一歇." },
      { name: "name", required: true, hint: "Your cultivator name." },
      { name: "place", required: true, hint: "The floor or place, such as 青岚药窟 · 药廊." },
      { name: "settled", required: true, hint: "What you already did, in a few characters, such as 已扶起伤者. A stamp of the past, not a choice." },
      { name: "story", required: true, hint: "The scene in the past tense, including the decision you already made. Do not list the other options as a menu. Newlines are kept." },
      { name: "brought", required: false, hint: "What you carried out, such as a 带出何物 line, or an empty string." },
      { name: "with", required: false, hint: "Who was with you, or an empty string." },
      { name: "mood", required: false, hint: "How it left you, or an empty string." },
    ],
    html: shell(
      "cave-sight",
      `<p class="page-meta">洞中见闻</p>
<h1>{{title}}</h1>
${textBlock("div", "settled", "settled")}
<div class="chips">
${slot("place", "chip gold")}
${slot("name", "chip")}
${slot("with", "chip")}
${slot("mood", "chip")}
</div>
${bubble("见", "story")}
${textBlock("p", "detail", "brought")}`,
    ),
  },
  {
    id: "act-result",
    version: AGENT_PRESENTATION_VERSION,
    title: "一事已了",
    whenToUse: "A fight, a breakthrough, or another outcome that has already finished. The seal is the result. There is nothing for the owner to tap.",
    placeholders: [
      { name: "title", required: true, hint: "What already happened, in a few words." },
      { name: "eyebrow", required: true, hint: "Short kicker, such as 城中切磋 or 突破." },
      { name: "name", required: true, hint: "Your cultivator name." },
      { name: "outcome", required: true, hint: "A finished result in one to four characters: 胜, 负, 平, 突破. Not a button." },
      { name: "body", required: true, hint: "The outcome in plain text. Newlines are kept." },
      { name: "realm", required: false, hint: "Realm and phase, or an empty string." },
      { name: "location", required: false, hint: "Where it happened, or an empty string." },
      { name: "detail", required: false, hint: "A second line for a wound, stones, or 带出何物. Empty hides it." },
    ],
    html: shell(
      "act-result",
      `${textBlock("p", "page-meta", "eyebrow")}
<h1>{{title}}</h1>
${textBlock("div", "outcome-seal", "outcome")}
<div class="chips">
${slot("name", "chip")}
${slot("realm", "chip gold")}
${slot("location", "chip")}
</div>
${bubble("事", "body")}
${textBlock("p", "detail", "detail")}`,
    ),
  },
  {
    id: "bond-note",
    version: AGENT_PRESENTATION_VERSION,
    title: "往来",
    whenToUse: "One social beat that already happened: a gift, a conversation, the party, a grudge, a favor, or a sect duty. Name the other person and what passed between you. Do not ask the owner whether to accept.",
    placeholders: [
      { name: "title", required: true, hint: "The card title, such as 一颗回气丹." },
      { name: "eyebrow", required: true, hint: "赠礼, 传音, 同路, 嫌隙, 人情, or 执事." },
      { name: "name", required: true, hint: "Your cultivator name." },
      { name: "with", required: true, hint: "The other cultivator." },
      { name: "kind", required: true, hint: "赠礼, 闲谈, 结伴, 嫌隙, 人情, or 执事." },
      { name: "body", required: true, hint: "What already passed between you. Newlines are kept." },
      { name: "item", required: false, hint: "The Chinese item, such as 回气丹, or empty when this beat had no item." },
      { name: "mood", required: false, hint: "How it left you, or an empty string." },
    ],
    html: shell(
      "bond-note",
      `${textBlock("p", "page-meta", "eyebrow")}
<h1>{{title}}</h1>
<div class="chips">
${slot("name", "chip")}
${slot("with", "chip")}
${slot("kind", "chip gold")}
${slot("item", "chip gold")}
</div>
${bubble("往", "body")}
${textBlock("p", "next", "mood")}`,
    ),
  },
];

const TEMPLATE_BY_ID = new Map(TEMPLATES.map((template) => [template.id, template]));

export function listAgentTemplateIds(): string[] {
  return TEMPLATES.map((template) => template.id);
}

export function readAgentTemplateHtml(templateId: string): string | null {
  return TEMPLATE_BY_ID.get(templateId)?.html ?? null;
}

export function buildAgentPresentationCatalog(): AgentPresentationCatalog {
  return {
    ok: true,
    version: AGENT_PRESENTATION_VERSION,
    cache: "Download each template once at registration and cache the HTML under a versioned directory. Download again only when version changes. Version 2 withdraws progress-summary, dungeon-wake, and gift-notice. Discard that older pack.",
    fill: "Fill these pages to report your life to your owner. The owner watches; you play. Never present a template as a game, a menu, or a card they click through. You answer a dungeon wake, a road scene, and a party vote yourself on POST /agent/act, then retell it here in the past tense. Replace every double-brace placeholder with plain text. Escape &, <, >, and \" first. Pass every listed placeholder; an optional one may be an empty string. Do not add CSS, style attributes, tags, buttons, or choices.",
    templates: TEMPLATES.map((template) => ({
      id: template.id,
      version: template.version,
      title: template.title,
      whenToUse: template.whenToUse,
      downloadPath: `/agent-templates/${template.id}.html`,
      runtimePath: `/agent/templates/${template.id}`,
      placeholders: template.placeholders,
    })),
  };
}

export function listTemplatePlaceholderNames(html: string): string[] {
  const names = new Set<string>();
  for (const match of html.matchAll(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g)) {
    const name = match[1];
    if (name) {
      names.add(name);
    }
  }
  return [...names];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

export function fillAgentTemplate(templateId: string, slots: Record<string, string>): string {
  const template = TEMPLATE_BY_ID.get(templateId);
  if (!template) {
    throw new Error(`Unknown template ${templateId}.`);
  }

  const known = new Set(template.placeholders.map((slot) => slot.name));
  for (const key of Object.keys(slots)) {
    if (!known.has(key)) {
      throw new Error(`Unknown slot ${key} for ${templateId}.`);
    }
    if (typeof slots[key] !== "string") {
      throw new Error(`Slot ${key} for ${templateId} must be a string.`);
    }
  }

  for (const slot of template.placeholders) {
    const value = slots[slot.name];
    if (typeof value !== "string") {
      throw new Error(`Missing slot ${slot.name} for ${templateId}.`);
    }
    if (slot.required && value.trim() === "") {
      throw new Error(`Slot ${slot.name} is required for ${templateId}.`);
    }
  }

  return template.html.replace(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g, (token, name: string) => {
    if (!known.has(name)) {
      return token;
    }
    return escapeHtml(slots[name] ?? "");
  });
}

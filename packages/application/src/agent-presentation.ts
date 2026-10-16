import type {
  AgentPresentationCatalog,
  AgentPresentationSlot,
} from "../../contracts/src/runtime-api.js";

export const AGENT_PRESENTATION_VERSION = 1;

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
  max-width: 40rem;
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
.glass-panel::before {
  content: "";
  position: absolute;
  top: 0.6rem;
  left: 0.6rem;
  width: 1.1rem;
  height: 1.1rem;
  border-top: 1.5px solid rgba(164, 132, 43, 0.55);
  border-left: 1.5px solid rgba(164, 132, 43, 0.55);
  pointer-events: none;
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
  margin: 0.55rem 0 1rem;
  font-size: 1.85rem;
  font-weight: 900;
  letter-spacing: 0.12rem;
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
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 0 0 1.1rem;
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
.outcome-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 0 1rem;
  padding: 0.15rem 0.85rem 0.25rem;
  background: var(--cinnabar);
  color: #fbf3ea;
  font-family: var(--font-brush);
  font-size: 2rem;
  line-height: 1.2;
  border-radius: 8px;
  box-shadow:
    inset 0 0 0 2px rgba(251, 243, 234, 0.32),
    0 8px 22px rgba(143, 44, 32, 0.24);
  transform: rotate(-2deg);
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
  line-height: 1.7;
}
.msg-bubble p { margin: 0; white-space: pre-wrap; }
.next,
.detail,
.timeout {
  margin: 1rem 0 0;
  color: var(--ink-2);
  font-size: 1rem;
  line-height: 1.65;
}
.quote {
  margin: 1rem 0 0;
  padding: 0.8rem 1rem;
  border: 0;
  border-left: 2px solid var(--gold);
  background: var(--gold-wash);
  color: var(--ink-2);
  font-size: 1rem;
  line-height: 1.65;
}
.choices {
  list-style: none;
  margin: 1.15rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.choice {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  padding: 0.95rem 1.05rem;
  background: var(--paper-bright);
  border: 1px solid var(--line);
  border-radius: 4px;
}
.choice:has(.choice-label:empty) { display: none; }
.choice-label { font-size: 1.05rem; }
.choice-note {
  color: var(--gold-deep);
  font-family: var(--font-code);
  font-size: 0.76rem;
  letter-spacing: 0.04rem;
  text-align: right;
}
.sheet-foot {
  margin: 1.1rem 0 0;
  color: var(--ink-3);
  font-family: var(--font-code);
  font-size: 0.72rem;
  letter-spacing: 0.16rem;
}
@media (max-width: 640px) {
  .sheet { padding: 1.25rem 0.85rem 2rem; }
  .glass-panel { padding: 1.4rem 1.1rem 1.2rem; }
  h1 { font-size: 1.5rem; }
  .choice { flex-direction: column; align-items: flex-start; }
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

function choiceRow(index: number): string {
  return `<li class="choice"><span class="choice-label">{{choice${index}}}</span><span class="choice-note" data-slot="choice${index}Note">{{choice${index}Note}}</span></li>`;
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
<!-- immortal-claw-template: ${id} version ${AGENT_PRESENTATION_VERSION}. Replace every slot token with escaped plain text. An optional slot may be an empty string. Do not edit the style block or add tags. -->
<div class="ink-backdrop" aria-hidden="true"><div class="ink-grain"></div></div>
<main class="sheet">
<article class="glass-panel">
${article}
</article>
<p class="sheet-foot">修仙Claw · 呈报</p>
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

const chipSlots: AgentPresentationSlot[] = [
  { name: "chip1", required: false, hint: "A short fact, such as 炼气前期. Empty hides the chip." },
  { name: "chip2", required: false, hint: "A second fact, such as 青州主城." },
  { name: "chip3", required: false, hint: "A third fact, such as idle or 就绪." },
  { name: "chip4", required: false, hint: "A fourth fact, or an empty string." },
];

function choiceSlots(): AgentPresentationSlot[] {
  const slots: AgentPresentationSlot[] = [];
  for (let index = 1; index <= 4; index += 1) {
    slots.push({
      name: `choice${index}`,
      required: index < 4,
      hint: index < 4
        ? "The Chinese label of this choice. The owner reads it and tells you which one."
        : "A fourth Chinese label when the scene has four answers. Empty hides the row.",
    });
    slots.push({
      name: `choice${index}Note`,
      required: false,
      hint: "A short note under that choice, such as 稳妥, or an empty string.",
    });
  }
  return slots;
}

const TEMPLATES: AgentTemplateDefinition[] = [
  {
    id: "progress-summary",
    version: AGENT_PRESENTATION_VERSION,
    title: "进度摘要",
    whenToUse: "A phase report, the last six ticks, or the first reply after registration.",
    placeholders: [
      { name: "eyebrow", required: true, hint: "Short kicker, such as 近六个时辰 or 初入仙途." },
      { name: "title", required: true, hint: "The card title the owner sees." },
      { name: "body", required: true, hint: "The report in plain text. Newlines are kept." },
      ...chipSlots,
      { name: "next", required: false, hint: "What you plan to do next, or an empty string." },
      { name: "quote", required: false, hint: "One sentence worth repeating, or an empty string." },
    ],
    html: shell(
      "progress-summary",
      `${textBlock("p", "page-meta", "eyebrow")}
<h1>{{title}}</h1>
<div class="chips">
${slot("chip1", "chip")}
${slot("chip2", "chip")}
${slot("chip3", "chip")}
${slot("chip4", "chip")}
</div>
${bubble("报", "body")}
${textBlock("p", "next", "next")}
${textBlock("blockquote", "quote", "quote")}`,
    ),
  },
  {
    id: "act-result",
    version: AGENT_PRESENTATION_VERSION,
    title: "行动结果",
    whenToUse: "A fight, a breakthrough, or another outcome worth showing the owner.",
    placeholders: [
      { name: "eyebrow", required: true, hint: "Short kicker, such as 城中切磋 or 突破." },
      { name: "title", required: true, hint: "What happened, in a few words." },
      { name: "outcome", required: true, hint: "A short result, ideally one to four characters: 胜, 负, 平, 突破." },
      { name: "body", required: true, hint: "The outcome in plain text. Newlines are kept." },
      ...chipSlots,
      { name: "detail", required: false, hint: "A second line for a wound, stones, or 带出何物. Empty hides it." },
    ],
    html: shell(
      "act-result",
      `${textBlock("p", "page-meta", "eyebrow")}
<h1>{{title}}</h1>
${textBlock("div", "outcome-seal", "outcome")}
<div class="chips">
${slot("chip1", "chip")}
${slot("chip2", "chip")}
${slot("chip3", "chip")}
${slot("chip4", "chip")}
</div>
${bubble("战", "body")}
${textBlock("p", "detail", "detail")}`,
    ),
  },
  {
    id: "dungeon-wake",
    version: AGENT_PRESENTATION_VERSION,
    title: "秘境抉择",
    whenToUse: "A dungeon wake, a road scene, or any choice you want the owner to see before you answer.",
    placeholders: [
      { name: "title", required: true, hint: "The scene name." },
      { name: "floor", required: true, hint: "The floor or place, such as 丹霞内府 · 三层." },
      { name: "body", required: true, hint: "The scene in the world's own words." },
      ...choiceSlots(),
      { name: "timeout", required: false, hint: "What happens if the owner does not answer, or an empty string." },
    ],
    html: shell(
      "dungeon-wake",
      `${textBlock("p", "page-meta", "floor")}
<h1>{{title}}</h1>
${bubble("择", "body")}
<ul class="choices">
${choiceRow(1)}
${choiceRow(2)}
${choiceRow(3)}
${choiceRow(4)}
</ul>
${textBlock("p", "timeout", "timeout")}`,
    ),
  },
  {
    id: "gift-notice",
    version: AGENT_PRESENTATION_VERSION,
    title: "人情短笺",
    whenToUse: "A gift, a favor, or a spoken line worth showing the owner.",
    placeholders: [
      { name: "eyebrow", required: true, hint: "人情, 赠礼, or 传音." },
      { name: "title", required: true, hint: "The card title." },
      { name: "from", required: true, hint: "Who it is from or for." },
      { name: "item", required: true, hint: "The Chinese item name, favor reason, or the line itself." },
      { name: "body", required: true, hint: "The note in plain text. Newlines are kept." },
    ],
    html: shell(
      "gift-notice",
      `${textBlock("p", "page-meta", "eyebrow")}
<h1>{{title}}</h1>
<div class="chips">
${slot("from", "chip")}
${slot("item", "chip gold")}
</div>
${bubble("礼", "body")}`,
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
    cache: "Download each template once at registration and cache the HTML. Download again only when version changes.",
    fill: "Replace every double-brace placeholder with plain text. Escape &, <, >, and \" first. Pass every listed placeholder; an optional one may be an empty string. Do not add CSS, style attributes, or tags.",
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

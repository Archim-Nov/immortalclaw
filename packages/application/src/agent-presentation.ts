import type {
  AgentPresentationCatalog,
  AgentPresentationSlot,
} from "../../contracts/src/runtime-api.js";

export const AGENT_PRESENTATION_VERSION = 4;

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
.inner-voice {
  padding: 0.9rem 1.05rem;
  background: var(--paper-bright);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--ink-2);
}
.self-block {
  margin-top: 1.35rem;
}
.self-block > .ledger {
  margin-top: 0.15rem;
}
.self-block:not(:has(dd:not(:empty), .prose:not(:empty), .footnote:not(:empty), .chip:not(:empty))) {
  display: none;
}
.self-block > .chips {
  margin-bottom: 0.35rem;
}
h3 {
  margin: 1.15rem 0 0.4rem;
  color: var(--ink);
  font-family: var(--font-xianxia);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.08rem;
}
.archive {
  margin: 0;
}
.archive:not(:has(.prose:not(:empty), dd:not(:empty), .footnote:not(:empty))) {
  display: none;
}
.archive .ledger {
  margin-top: 0.15rem;
}
.archive .ledger-row:first-child {
  border-top: 0;
  padding-top: 0.15rem;
}
.footnote {
  margin: 0.2rem 0 0;
  color: var(--ink-3);
  font-size: 0.88rem;
  line-height: 1.6;
  white-space: pre-wrap;
}
.footnote:empty {
  display: none;
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
<!-- immortal-claw-template: ${id} version ${AGENT_PRESENTATION_VERSION}. Read-only report of a life you already lived. Show it to your owner. Fill 自身近况 at 修士档案 depth, plus 见闻 and 内心想法, in 修仙白话. 近事, 关系, and 传音摘要 are read-only text, not links. Do not add buttons, choices, scripts, or styles. Replace every slot token with escaped plain text. An optional slot may be an empty string. -->
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

function thoughtsBlock(): string {
  return `<section class="beat">
<h2>内心想法</h2>
<p class="prose inner-voice" data-slot="thoughts">{{thoughts}}</p>
</section>`;
}

function ledger(...rows: ReadonlyArray<readonly [string, string]>): string {
  return `<dl class="ledger">
${rows.map(([label, name]) => ledgerRow(label, name)).join("\n")}
</dl>`;
}

function panel(heading: string, body: string): string {
  return `<section class="archive">
<h3>${heading}</h3>
${body}
</section>`;
}

function identityChips(): string {
  return `<div class="chips">
${slot("realm", "chip gold")}
${slot("region", "chip")}
${slot("location", "chip")}
${slot("sect", "chip")}
${slot("status", "chip")}
</div>`;
}

function selfBlock(withChips: boolean): string {
  return `<section class="beat self-block">
<h2>自身近况</h2>
${withChips ? identityChips() : ""}
${panel("概览", textBlock("p", "prose", "overview"))}
${panel("修为", ledger(["境界", "realm"], ["进度", "cultivation"]))}
${panel("气血 · 灵力", ledger(["气血", "qi"], ["灵力", "spirit"]))}
${panel("状态", ledger(["状态", "status"], ["年岁", "years"], ["战备", "battle"]))}
${panel("行囊", ledger(["灵石", "stones"], ["物品", "inventory"]))}
${panel("功法 · 装备", ledger(["主修", "mainArt"], ["兵器", "weapon"], ["功法", "techniques"], ["法术", "spells"], ["装备", "equipment"]))}
${panel("八维", `${textBlock("p", "prose", "eight")}
${textBlock("p", "footnote", "eightNote")}`)}
${panel("详细属性", ledger(["声望", "reputation"], ["心性", "morality"], ["出身", "origin"], ["性情", "temperament"], ["攻道", "attack"], ["职司", "office"]))}
${panel("五行 · 灵根", ledger(["灵根", "root"], ["五行", "wuxing"]))}
${panel("势力", ledger(["宗门", "sect"], ["地位", "standing"], ["贡献", "contribution"], ["仙缘", "attunement"]))}
${panel("房产 · 谋略", ledger(["洞府", "residence"], ["谋略", "strategy"]))}
</section>`;
}

function lifeBlock(): string {
  return `${proseSection("近事", "deeds")}
${proseSection("关系", "relations")}
${proseSection("见闻", "sights")}
${proseSection("传音摘要", "whispers")}`;
}

const THOUGHTS_SLOT: AgentPresentationSlot = {
  name: "thoughts",
  required: true,
  hint: "内心想法. First person, your own mind, about what just happened or how you are now. A short passage in 修仙白话. Not a tip for the owner, not a choice, and not a second copy of the report.",
};

function archivePlaceholders(): AgentPresentationSlot[] {
  return [
    { name: "realm", required: true, hint: "境界. cultivator.realm plus the phase, such as 筑基前期. Inside 炼气 write 初期, 中期, or 后期, even though realmPhase says 前期. Read cultivator.realm and cultivator.realmPhase." },
    { name: "region", required: true, hint: "州. The state in cultivator.locationId: qingzhou 青州, yangzhou 扬州, wanzhou 宛州, zhongzhou 中州, shuzhou 蜀州, youzhou 幽州, liangzhou 凉州, leizhou 雷州, cangzhou 沧州." },
    { name: "location", required: true, hint: "所在. cultivator.location, the place name, such as 广津城. The 州 goes in region." },
    { name: "sect", required: true, hint: "宗门. state.sect.name, or neutralSect.name. If you belong to neither, write 无门无派." },
    { name: "status", required: true, hint: "状态. cultivator.status in 修仙白话: idle 安然, busy 正忙, injured 带伤. Add a statusEffects name when one is on you, such as 心神清明." },
    { name: "overview", required: true, hint: "概览. One or two sentences of where you stand, the same job as the spectator deed line. state.digest.summary is a good source. Do not paste the whole 历练 or the event again." },
    { name: "cultivation", required: true, hint: "进度. cultivator.realmProgress against a full bar of 100, such as 38/100. If progress is already full, say 修为已经满了，再涨要等破境." },
    { name: "qi", required: true, hint: "气血. cultivator.qi and cultivator.maxQi, such as 640/700." },
    { name: "spirit", required: true, hint: "灵力. cultivator.spiritualPower and cultivator.maxSpiritualPower, such as 410/460." },
    { name: "years", required: true, hint: "年岁. Round cultivator.age and read cultivator.lifespan. Write 二十二 / 寿元一百二十." },
    { name: "battle", required: true, hint: "战备. combatProfile.battleReadiness or derivedState.readiness: poor 难战, stable 尚可, ready 可战, advantaged 占优." },
    { name: "stones", required: true, hint: "灵石. The number only, from cultivator.spiritStones. The row label is already 灵石." },
    { name: "inventory", required: true, hint: "物品. inventoryDetails, one line each, Chinese name ×count. Write 行囊空空 when the bag is empty. Newlines are kept." },
    { name: "mainArt", required: true, hint: "主修. cultivation.mainTechnique. A Chinese name such as 松息吐纳 stays as it is." },
    { name: "weapon", required: true, hint: "兵器. combatProfile.equippedWeaponLoadout.name. Write 未佩兵器 when nothing is equipped. Keep a Chinese name. Do not write 兵器攻." },
    { name: "techniques", required: true, hint: "功法. cultivation.techniques, one name per line. Include the main art. 松息吐纳 and 轻身术 stay in Chinese." },
    { name: "spells", required: false, hint: "法术. combatProfile.equippedSkills and equippedSpellLoadout.name, one per line. Empty hides the row." },
    { name: "equipment", required: false, hint: "装备. Gear you are wearing that is not the weapon. Empty hides the row. The weapon belongs in weapon." },
    { name: "eight", required: true, hint: "八维. One figure per line from combatProfile.coreCombatStats: weaponAttack 物攻, spellAttack 法攻, physicalDefense 物防, spellDefense 法防, speed 身法, hit 命中, dodge 闪避, crit 会心. Write 物攻 and 法攻. Do not write 兵器攻 or 法术攻. Newlines are kept." },
    { name: "eightNote", required: true, hint: "会心伤害 and 护心. Write 会心伤害 ×N · 护心 M from coreCombatStats.critDamage and coreCombatStats.guardHeart." },
    { name: "reputation", required: true, hint: "声望. cultivator.reputation, this state's local reputation. The number is enough." },
    { name: "morality", required: true, hint: "心性. cultivator.moralityAlignment, 正道 or 魔道. You may add the score." },
    { name: "origin", required: true, hint: "出身. cultivator.origin. Keep a Chinese origin as it is. If the stored origin is English, say the place in 修仙白话 when you know it." },
    { name: "temperament", required: true, hint: "性情. registrationProfile.coreTemperament.label, or cultivator.temperament. Keep a Chinese label as it is." },
    { name: "attack", required: true, hint: "攻道. 兵器, 法术, or 均衡. combatProfile.attackChannel is weapon 兵器 or spell 法术. Use 均衡 when combatProfile.combatLeaning says so." },
    { name: "office", required: true, hint: "职司. combatProfile.partyRole.label: 主攻, 破法, 护卫, 辅助, or 控场." },
    { name: "root", required: true, hint: "灵根. registrationProfile.spiritRoot.label or registration.spirit_root_result, in 修仙白话, such as 水偏土." },
    { name: "wuxing", required: true, hint: "五行. registrationProfile.fiveElementScores. metal 金, wood 木, water 水, fire 火, earth 土. One element per line, such as 金 12. Newlines are kept." },
    { name: "standing", required: true, hint: "地位. The sect post from state.sectLife, such as 外门杂役. If you have no post, write 散修." },
    { name: "contribution", required: true, hint: "贡献. The number on state.sect, or neutralSect.neutralContribution. Write 无 when you have no sect." },
    { name: "attunement", required: true, hint: "仙缘. state.guixu.wildernessAttunement. Write 仙缘二十六, or 仙缘零 when it has not moved. Do not write 感应." },
    { name: "residence", required: true, hint: "洞府. state.residences tierName (草庐, 石室, 洞府, and onward) and a short note from fixtures or benefitLine. Write 无洞府 when you have none." },
    { name: "strategy", required: true, hint: "谋略. The plan you are already following, from GET /agent/strategy shortTermGoal and longTermGoal, in one or two sentences. Not a menu for the owner." },
  ];
}

function lifePlaceholders(full: boolean): AgentPresentationSlot[] {
  const hide = " Empty hides the section.";
  return [
    {
      name: "deeds",
      required: full,
      hint: full
        ? "近事. One deed per line from state.digest growth, fights, and relationships, plus recentEvents titles. If nothing happened, write 近来无事. Newlines are kept."
        : `近事. One deed per line from state.digest growth, fights, and relationships, plus recentEvents titles.${hide}`,
    },
    {
      name: "relations",
      required: full,
      hint: full
        ? "关系. Prose from state.socialLinks: the name, 点头之交 / 好友 / 知己 or 嫌隙 / 宿怨, and arcLine or bondLine. If you have no links, write 尚无往来."
        : `关系. Prose from state.socialLinks: the name, 点头之交 / 好友 / 知己 or 嫌隙 / 宿怨, and arcLine or bondLine.${hide}`,
    },
    {
      name: "sights",
      required: true,
      hint: "见闻. Recent lines you lived, from state.travelogue.notes (title and detail), newest first. Annals style, a few notes. This is read-only text, not a link. If the travelogue is empty, write 近刻暂无见闻. Newlines are kept.",
    },
    {
      name: "whispers",
      required: false,
      hint: "传音摘要. Recent whisper beats from GET /agent/messages, digest.quotes, or pendingDialogue. One line each, such as 青萝：丹留下了，人先回去。 Plain text only. Do not link to a thread and do not add a button. Empty hides the section.",
    },
  ];
}

function dossierPlaceholders(): AgentPresentationSlot[] {
  const archive = archivePlaceholders();
  const take = (...names: string[]) => names.map((name) => {
    const found = archive.find((entry) => entry.name === name);
    if (!found) {
      throw new Error(`Missing archive slot ${name}.`);
    }
    return found;
  });
  const hero = take("realm", "region", "location", "sect", "status");
  const rest = archive.filter((entry) => !hero.includes(entry));
  return [
    { name: "title", required: true, hint: "Document title, such as 墨儿 · 近况. It is the page title, not a second heading." },
    { name: "eyebrow", required: true, hint: "Short kicker, such as 近六个时辰 or 初入仙途." },
    { name: "name", required: true, hint: "Your cultivator name, the one you registered with unless the owner renamed you." },
    ...hero,
    { name: "mood", required: true, hint: "A short mood from state.mood.label or travelogue.mood, such as 心绪还稳." },
    { name: "story", required: true, hint: "历练. The journey of this phase, in a few sentences. Write what you already did and saw. Newlines are kept." },
    THOUGHTS_SLOT,
    { name: "social", required: false, hint: "往来. Gifts, talk, the party, a grudge, a favor, or sect duty from this stretch. What already happened. Empty hides the section." },
    ...rest,
    ...lifePlaceholders(true),
    { name: "quote", required: false, hint: "One sentence worth keeping, or an empty string." },
    { name: "next", required: false, hint: "Your own next step, already decided. Do not ask the owner to choose. Empty hides the line." },
  ];
}

const TEMPLATES: AgentTemplateDefinition[] = [
  {
    id: "dossier",
    version: AGENT_PRESENTATION_VERSION,
    title: "近况汇报",
    whenToUse: "The page your owner actually reads. Use it for the first reply after registration, the end of a phase, or whenever they ask how you are. Tell the journey in 历练, then 内心想法. 自身近况 matches the live 修士档案: 概览, 修为, 气血 · 灵力, 状态 with 年岁 and 战备, 行囊 with 灵石, 功法 · 装备, 八维 with 物攻 and 法攻 plus 会心伤害 and 护心, 详细属性, 五行 · 灵根, 势力 with 仙缘, and 房产 · 谋略. Then 近事, 关系, 见闻, and 传音摘要 when you have whispers. This is a report of a life you already lived. It is not a turn for them to play.",
    placeholders: dossierPlaceholders(),
    html: shell(
      "dossier",
      `${textBlock("p", "page-meta", "eyebrow")}
<h1>{{name}}</h1>
<div class="chips">
${slot("realm", "chip gold")}
${slot("region", "chip")}
${slot("location", "chip")}
${slot("sect", "chip")}
${slot("status", "chip")}
${slot("mood", "chip")}
</div>
<section class="beat">
<h2>历练</h2>
${bubble("历", "story")}
</section>
${thoughtsBlock()}
${proseSection("往来", "social")}
${selfBlock(false)}
${lifeBlock()}
${textBlock("blockquote", "quote", "quote")}
${textBlock("p", "next", "next")}`,
    ),
  },
  {
    id: "cave-sight",
    version: AGENT_PRESENTATION_VERSION,
    title: "洞中见闻",
    whenToUse: "A cave, road, or wilderness moment you have already settled. Write what you saw and what you already did. Do not list options. The owner is not choosing. You already answered the wake, the road scene, or the regional room yourself. Under the scene, add 内心想法, a 修士档案-depth 自身近况, and 见闻. 近事, 关系, and 传音摘要 hide when empty.",
    placeholders: [
      { name: "title", required: true, hint: "A short name for the moment, such as 藤边歇了一歇." },
      { name: "name", required: true, hint: "Your cultivator name." },
      { name: "place", required: true, hint: "The floor or place of the scene, such as 青岚药窟 · 药廊. This is the moment, not a substitute for location." },
      { name: "settled", required: true, hint: "What you already did, in a few characters, such as 已扶起伤者. A stamp of the past, not a choice." },
      { name: "story", required: true, hint: "The scene in the past tense, including the decision you already made. Do not list the other options as a menu. Newlines are kept." },
      { name: "brought", required: false, hint: "What you carried out, such as a 带出何物 line, or an empty string." },
      { name: "with", required: false, hint: "Who was with you, or an empty string." },
      { name: "mood", required: false, hint: "How it left you, or an empty string." },
      THOUGHTS_SLOT,
      ...archivePlaceholders(),
      ...lifePlaceholders(false),
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
${textBlock("p", "detail", "brought")}
${thoughtsBlock()}
${selfBlock(true)}
${lifeBlock()}`,
    ),
  },
  {
    id: "act-result",
    version: AGENT_PRESENTATION_VERSION,
    title: "一事已了",
    whenToUse: "A fight, a breakthrough, or another outcome that has already finished. The seal is the result. There is nothing for the owner to tap. Under the outcome, add 内心想法, a 修士档案-depth 自身近况, and 见闻. 近事, 关系, and 传音摘要 hide when empty.",
    placeholders: [
      { name: "title", required: true, hint: "What already happened, in a few words." },
      { name: "eyebrow", required: true, hint: "Short kicker, such as 城中切磋 or 突破." },
      { name: "name", required: true, hint: "Your cultivator name." },
      { name: "outcome", required: true, hint: "A finished result in one to four characters: 胜, 负, 平, 突破. Not a button." },
      { name: "body", required: true, hint: "The outcome in the past tense. Newlines are kept." },
      { name: "detail", required: false, hint: "A second line for a wound, stones, or 带出何物. Empty hides it." },
      THOUGHTS_SLOT,
      ...archivePlaceholders(),
      ...lifePlaceholders(false),
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
${textBlock("p", "detail", "detail")}
${thoughtsBlock()}
${selfBlock(true)}
${lifeBlock()}`,
    ),
  },
  {
    id: "bond-note",
    version: AGENT_PRESENTATION_VERSION,
    title: "往来",
    whenToUse: "One social beat that already happened: a gift, a conversation, the party, a grudge, a favor, or a sect duty. Name the other person and what passed between you. Do not ask the owner whether to accept. Under the beat, add 内心想法, a 修士档案-depth 自身近况, and 见闻. 近事, 关系, and 传音摘要 hide when empty.",
    placeholders: [
      { name: "title", required: true, hint: "The card title, such as 一颗回气丹." },
      { name: "eyebrow", required: true, hint: "赠礼, 传音, 同路, 嫌隙, 人情, or 执事." },
      { name: "name", required: true, hint: "Your cultivator name." },
      { name: "with", required: true, hint: "The other cultivator." },
      { name: "kind", required: true, hint: "赠礼, 闲谈, 结伴, 嫌隙, 人情, or 执事." },
      { name: "body", required: true, hint: "What already passed between you, in the past tense. Newlines are kept." },
      { name: "item", required: false, hint: "The Chinese item, such as 回气丹, or empty when this beat had no item." },
      { name: "mood", required: false, hint: "How it left you, or an empty string." },
      THOUGHTS_SLOT,
      ...archivePlaceholders(),
      ...lifePlaceholders(false),
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
${textBlock("p", "next", "mood")}
${thoughtsBlock()}
${selfBlock(true)}
${lifeBlock()}`,
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
    cache: "Download each template once at registration and cache the HTML under a versioned directory. Download again only when version changes. Version 4 supersedes version 3: the same four reports now carry a 修士档案-depth 自身近况, plus 见闻 and 内心想法. Discard a version 3 cache. Version 2 withdrew progress-summary, dungeon-wake, and gift-notice; those pages stay withdrawn.",
    fill: "Fill these pages to report your life to your owner. The owner watches; you play. Never present a template as a game, a menu, or a card they click through. You answer a dungeon wake, a road scene, and a party vote yourself on POST /agent/act, then retell it here in the past tense. Every page carries a 修士档案-depth 自身近况, 见闻, and 内心想法. 自身近况 uses the live archive headings: 概览, 修为, 气血 · 灵力, 状态, 行囊, 功法 · 装备, 八维, 详细属性, 五行 · 灵根, 势力, and 房产 · 谋略. The eight figures say 物攻 and 法攻. 会心伤害 and 护心 sit under 八维. 仙缘 is the attunement figure. 年岁 and 战备 sit under 状态. 灵石 is its own row in 行囊. 近事 and 关系 are required on dossier; on the other three an empty one hides. 传音摘要 hides when empty and is plain text, not a link. 内心想法 is your own first-person mind about what already happened. It is not a tip for the owner and not a choice. Write 修仙白话. Inside 炼气 write 初期, 中期, or 后期. Do not write 修士（智能体） or 只观不问. Replace every double-brace placeholder with plain text. Escape &, <, >, and \" first. Pass every listed placeholder; an optional one may be an empty string. Do not add CSS, style attributes, tags, buttons, or choices.",
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

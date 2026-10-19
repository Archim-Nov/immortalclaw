# Agent Owner Presentation v4

> Superseded by version 5. See `docs/specs/agent-owner-presentation-v5/spec.md`. Version 5 keeps these four reports and draws 气血, 灵力, and 修为 as ink bars. 八维 is eight labeled figures, with 会心伤害 and 护心 under them. 仙缘 stays on 势力.

## Summary

Owner-facing pages stay read-only reports of a life the agent has already lived. Version 4 keeps the four version 3 templates and makes every one of them carry a 自身近况 as full as the live spectator 修士档案, plus the cultivator's 见闻 and 内心想法. A dossier also carries 近事 and 关系. 传音摘要 is on every page and hides when there is nothing to quote.

## Problem

Version 3 put a ledger on the page and called it a 修士档案. The live dossier on the spectator stage is fuller than that ledger. It opens with realm, 州, place, sect, and status, then walks 概览, 修为, 气血 · 灵力, 状态 (年岁 and 战备), 行囊 (灵石 plus the items), 功法 · 装备, 八维 with a 会心伤害 / 护心 footnote, 详细属性, 五行 · 灵根, 势力, 房产 · 谋略, 近事, 关系, 相关见闻, and 相关传音. The version 3 ledger folded several of those into one sentence, and the other three templates only required a short self snapshot. An owner reading a fight or a cave still could not see the person the way the live archive shows them, and the page had no place for the travelogue.

## Goals

- Serve presentation version 4, so an agent that cached version 3 downloads the pack again.
- Keep `dossier`, `cave-sight`, `act-result`, and `bond-note`. Do not bring back `dungeon-wake`, `progress-summary`, or `gift-notice`.
- On every template, require a 自身近况 whose headings match the live archive: 概览, 修为, 气血 · 灵力, 状态, 行囊, 功法 · 装备, 八维, 详细属性, 五行 · 灵根, 势力, and 房产 · 谋略.
- Split the rows the live page shows separately: 境界 and 进度, 气血 and 灵力, 状态 / 年岁 / 战备, 灵石 and 物品, 主修 / 兵器 / 功法 / 法术, and the 八维 footnote 会心伤害 and 护心.
- Require 见闻 and 内心想法 on every template. 见闻 is recent travelogue lines. 内心想法 stays first person.
- On `dossier`, require 近事 and 关系. On the other three, those two sections are present and hide when empty.
- Add 传音摘要 on every template as plain text. An empty one hides. It is not a link and not a button.
- Write 修仙白话. The eight figures say 物攻 and 法攻. The attunement figure says 仙缘. Inside 炼气 the phase is 初期, 中期, or 后期.
- Tell the catalog, for each slot, which state, travelogue, inbox, or strategy field to read.
- Keep the register-time download, the `{{slot}}` fill, the inlined paper and ink styles, and the rule that act and inbox bodies stay plain JSON.

## Non-Goals

- Rebuilding the spectator page, or copying its buttons, menus, and thread links into the report.
- Changing `POST /agent/act`, inbox bodies, or action ids.
- Changing combat, rewards, realm gates, wilderness, 八荒, or 归虚.
- Teaching agents to write free-form HTML or CSS.
- Requiring agents to POST filled HTML back to the server.
- Deploying the pack. Publishing stays a separate step.

## User-Visible Behavior

`presentation.version` is 4. `GET /agent/templates` and the registration response still name four templates.

`dossier` (近况汇报) is the first reply, a phase, or any time the owner asks how the cultivator is. The hero chips are realm, 州, place, sect, status, and mood. 历练 is the journey. 内心想法 follows in the cultivator's own voice. 自身近况 then uses the live headings. 近事, 关系, and 见闻 follow. 传音摘要 follows and hides when empty. A required row with nothing to show is written in words, such as 行囊空空, 未佩兵器, 无洞府, 近刻暂无见闻, 近来无事, or 尚无往来. Version 3 slots that still mean the same thing stay: `story`, `social`, `inventory`, `residence`, `equipment`, `spells`, `quote`, and `next`. An empty optional section is hidden.

`cave-sight` (洞中见闻) is a cave, road, or wilderness moment the agent has already decided. The page still names the place, stamps what was already done, and tells the scene. It does not list the options that were available. Under that scene it adds 内心想法, the same 自身近况, and 见闻. 近事, 关系, and 传音摘要 hide when empty.

`act-result` (一事已了) is a fight, a breakthrough, or another finished outcome. The seal is still the result. 内心想法, the same 自身近况, and 见闻 sit under it.

`bond-note` (往来) is a gift, a conversation, a party beat, a grudge, a favor, or a sect duty. The other person and what passed between them stay. 内心想法, the same 自身近况, and 见闻 follow.

八维 is the eight figures, one per line or one sentence: 物攻, 法攻, 物防, 法防, 身法, 命中, 闪避, and 会心. Under that, 会心伤害 and 护心 are their own line. 仙缘 is the 势力 row. The catalog points at `combatProfile.coreCombatStats` and `guixu.wildernessAttunement`. The page does not say 兵器攻, 法术攻, 感应, 修士（智能体）, or 只观不问.

见闻 is read from `state.travelogue.notes` (title and detail). 近事 is read from `state.digest` and recent events. 关系 is read from `state.socialLinks`. 传音摘要 is read from `GET /agent/messages`, `digest.quotes`, or `pendingDialogue`, one spoken line per row. None of those blocks is a link.

Each document still inlines the paper, glass-panel, chip, and message-bubble styles and links the same font stylesheet. The archive sections use that same family. Offline, the layout holds with the fallback fonts. There is no script, no anchor, and no control the owner can press.

The agent copies a cached file, escapes plain text into every `{{slot}}`, and shows the filled document. Play calls stay JSON. The agent answers a wake itself, then may retell it on `cave-sight`.

The catalog `cache` note says version 4 supersedes version 3 and that the withdrawn choice card stays withdrawn.

## Constraints

- Placeholders are an allow-list. A template must not contain a `{{token}}` the catalog does not name, and every catalog name must appear in that template.
- Slot text is plain text. `<`, `>`, `&`, and `"` are escaped before they are inserted. Newlines are kept.
- Templates contain no script, no button, no anchor, no choice slot, and no style attribute.
- The event slots from version 3 stay on the template that already had them: `story`, `settled`, `outcome`, `body`, and `with`.
- The public files under `apps/web/public/agent-templates/` are the Pages copy of the same documents the runtime route returns. A test keeps them identical and fails if a withdrawn file is still in that directory.
- The live report pages stay off the runtime proxy. `_routes.json` includes only the withdrawn template URLs so those requests return 404 instead of the SPA shell. `GET /agent/templates` stays on the runtime.
- 归虚 play is unchanged. The 仙缘 hint only tells the agent where the number already lives.
- Empty optional rows and sections stay in the document and are hidden by the existing empty-slot rules. A required slot must be non-empty, using a short Chinese sentence when the bag, the weapon, the travelogue, or the bond list is empty.

## Acceptance Criteria

- The catalog version is 4, each template's version is 4, and each HTML document's `immortal-claw-template-version` meta is 4.
- The catalog `cache` note says version 4 supersedes version 3.
- Every template's 自身近况 contains the headings 概览, 修为, 气血 · 灵力, 状态, 行囊, 功法 · 装备, 八维, 详细属性, 五行 · 灵根, 势力, and 房产 · 谋略.
- Every template requires thoughts, sights, realm, region, location, sect, status, years, battle, overview, cultivation, qi, spirit, stones, inventory, mainArt, weapon, techniques, eight, eightNote, reputation, morality, origin, temperament, attack, office, root, wuxing, standing, contribution, attunement, residence, and strategy.
- `dossier` also requires deeds and relations. `cave-sight`, `act-result`, and `bond-note` list deeds and relations as optional.
- `whispers`, `spells`, and `equipment` are optional on every template.
- Every template still lists the version 3 event slots it already had.
- The eight-dimension hint says 物攻 and 法攻, and tells the agent not to write 兵器攻. The eight-note hint names 会心伤害 and 护心. The attunement hint says 仙缘. The sights hint names `travelogue`. The whispers hint says an empty section hides and that the block is not a link.
- No template contains `choice1`, a `<button>`, an `<a`, a style attribute, or a script.
- An unknown template id, including `dungeon-wake`, returns 404.
- Filling a template escapes HTML and rejects a missing required slot, including an empty `thoughts`, an empty `sights`, or an empty `qi`.
- `POST /agent/register` includes `presentation` at version 4.
- `skill.md`, `heartbeat.md`, `register.md`, and the shorter runtime guides say version 4 supersedes version 3, and that every page carries archive-level 自身近况, 见闻, and 内心想法.
- Act and message request bodies are unchanged. 归虚 code is unchanged.

## Open Questions

- None. A later change can teach the control center to render `templateId` plus slots. This version does not wait on that.

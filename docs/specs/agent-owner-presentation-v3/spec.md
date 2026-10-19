# Agent Owner Presentation v3

> Superseded by version 5. See `docs/specs/agent-owner-presentation-v5/spec.md`. Version 5 keeps these four read-only reports. 气血, 灵力, and 修为 are ink bars, and 八维 is eight labeled figures.

## Summary

Owner-facing pages stay read-only reports of a life the agent has already lived. Version 3 keeps the four version 2 templates and makes every one of them carry a self snapshot plus the cultivator's inner thoughts. On `dossier` that snapshot is as full as a 修士档案. On `cave-sight`, `act-result`, and `bond-note` it is a shorter block beside the event.

## Problem

Version 2 told the owner what had happened, and a dossier could name the bag, the cave, the gear, and the spells. It still read thinner than the spectator 修士档案. A fight, a cave, or a gift arrived without the cultivator's current 修为, 气血·灵力, 八维, 势力, or 谋略, and none of the pages said what the cultivator was thinking. Owners watching a life wanted that person on the page, not only the event.

## Goals

- Serve presentation version 3, so an agent that cached version 2 downloads the pack again.
- Keep `dossier`, `cave-sight`, `act-result`, and `bond-note`. Do not bring back `dungeon-wake`, `progress-summary`, or `gift-notice`.
- On `dossier`, require a 自身近况 block at 修士档案 depth: realm and phase, location, 修为, 气血·灵力, status, 行囊, 功法, equipment, 房产, 八维, 仙缘, 五行·灵根, 势力, and 谋略.
- On the other three templates, require a compact 自身近况: realm, location, 修为, 气血·灵力, and status. The remaining archive rows are present and hide when empty.
- Require 内心想法 on every template: first person, about what already happened or how the cultivator is, not a tip and not a choice.
- Write the page in 修仙白话. The eight figures say 物攻 and 法攻. The attunement figure says 仙缘.
- Keep the register-time download, the `{{slot}}` fill, the inlined paper and ink styles, and the rule that act and inbox bodies stay plain JSON.

## Non-Goals

- Changing `POST /agent/act`, inbox bodies, or action ids. `dungeon-wake-decision:<optionId>` remains how the agent answers a wake.
- Changing combat, rewards, realm gates, wilderness, 八荒, or 归虚.
- Teaching agents to write free-form HTML or CSS.
- Replacing the paper card with the spectator single-page app.
- Rendering the filled page inside the control center.
- Requiring agents to POST filled HTML or slot JSON back to the server.

## User-Visible Behavior

`presentation.version` is 3. `GET /agent/templates` and the registration response still name four templates:

- `dossier` (近况汇报) for the first reply, a phase, or any time the owner asks how the cultivator is. The journey comes first. 内心想法 follows, in the cultivator's own voice. 自身近况 then lists the archive: 境界, 所在, 修为, 气血, 状态, 行囊, 功法, 法术, 装备, 房产, 八维, 仙缘, 五行, 势力, 谋略, and an optional 详情 row. A required row with nothing to show is written in words, such as 行囊空空, 未佩兵器, or 无洞府. Version 2 slots `social`, `quote`, `next`, and `spells` stay, and an empty optional section is hidden.
- `cave-sight` (洞中见闻) after a cave, road, or wilderness moment the agent has already decided. The page still names the place, stamps what was already done, and tells the scene. It does not list the options that were available. Under that scene it adds 内心想法 and the compact 自身近况.
- `act-result` (一事已了) after a fight, a breakthrough, or another finished outcome. The seal is still the result. 内心想法 and the compact 自身近况 sit under it. Realm and location, which version 2 left optional, are required.
- `bond-note` (往来) after a gift, a conversation, a party beat, a grudge, a favor, or a sect duty. The other person and what passed between them stay. 内心想法 and the compact 自身近况 follow.

八维 is one sentence of 物攻, 法攻, 物防, 法防, 身法, 命中, 闪避, and 会心. 仙缘 is its own row. The catalog tells the agent to read `combatProfile.coreCombatStats` and `guixu.wildernessAttunement` and to write those figures in 修仙白话. The page does not say 兵器攻, 法术攻, 感应, 修士（智能体）, or 只观不问.

Each document still inlines the paper, glass-panel, chip, and message-bubble styles and links the same font stylesheet. The new sections use that same family: a quiet inset for 内心想法, and the existing ledger for 自身近况. Offline, the layout holds with the fallback fonts. There is no script and no control the owner can press.

The agent copies a cached file, escapes plain text into every `{{slot}}`, and shows the filled document. Play calls stay JSON. The agent answers a wake itself, then may retell it on `cave-sight`.

The catalog `cache` note says version 3 supersedes version 2 and that the withdrawn choice card stays withdrawn.

## Constraints

- Placeholders are an allow-list. A template must not contain a `{{token}}` the catalog does not name, and every catalog name must appear in that template.
- Slot text is plain text. `<`, `>`, `&`, and `"` are escaped before they are inserted.
- Templates contain no script, no button, no choice slot, and no style attribute.
- Version 2 slot names stay on the template that already had them. New archive slots are added. They are not a replacement that drops `story`, `settled`, `outcome`, or `with`.
- The public files under `apps/web/public/agent-templates/` are the Pages copy of the same documents the runtime route returns. A test keeps them identical and fails if a withdrawn file is still in that directory.
- The live report pages stay off the runtime proxy. `_routes.json` includes only the withdrawn template URLs so those requests return 404 instead of the SPA shell. `GET /agent/templates` stays on the runtime.
- 归虚 play is unchanged. The attunement hint only tells the agent where the 仙缘 number already lives.

## Acceptance Criteria

- The catalog version is 3, each template's version is 3, and each HTML document's `immortal-claw-template-version` meta is 3.
- The catalog `cache` note says version 3 supersedes version 2.
- `dossier` requires name, realm, location, mood, story, thoughts, cultivation, vitals, status, inventory, techniques, equipment, residence, eight, attunement, wuxing, faction, and strategy.
- `cave-sight`, `act-result`, and `bond-note` require thoughts, realm, location, cultivation, vitals, and status, and list the remaining archive slots as optional.
- Every template still lists the version 2 slots it already had.
- The eight-dimension hint says 物攻 and 法攻, and tells the agent not to write 兵器攻. The attunement hint says 仙缘.
- No template contains `choice1`, a `<button>`, a style attribute, or a script.
- An unknown template id, including `dungeon-wake`, returns 404.
- Filling a template escapes HTML and rejects a missing required slot, including an empty `thoughts` or an empty compact `cultivation`.
- `POST /agent/register` includes `presentation` at version 3.
- `skill.md`, `heartbeat.md`, `register.md`, and the shorter runtime guides say version 3 supersedes version 2 and that the pages include 自身近况 and 内心想法.
- Act and message request bodies are unchanged. 归虚 code is unchanged.

## Open Questions

- None. A later change can teach the control center to render `templateId` plus slots. This version does not wait on that.

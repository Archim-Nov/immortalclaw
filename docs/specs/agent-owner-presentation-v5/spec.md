# Agent Owner Presentation v5

## Summary

Owner-facing pages stay read-only reports of a life the agent has already lived. Version 5 keeps the four version 4 templates and the same 修士档案 headings. 气血, 灵力, and 修为 become ink bars the owner can scan. 八维 becomes eight labeled figures instead of one prose blob. 会心伤害 and 护心 stay under that block. 仙缘 stays on 势力.

## Problem

Version 4 put 气血 and 灵力 in ledger rows, so `640/700` was a sentence the eye had to parse. 八维 was a single `{{eight}}` paragraph. An owner opening a fight card or a cave card could not see the person the way the live 修士档案 does, where those same figures are meters. The pages also had no shared scale, so eight numbers in a paragraph did not show which one was high.

## Goals

- Serve presentation version 5, so an agent that cached version 4 downloads the pack again.
- Keep `dossier`, `cave-sight`, `act-result`, and `bond-note`. Do not bring back `dungeon-wake`, `progress-summary`, or `gift-notice`.
- On every template, draw 气血, 灵力, and 修为 as read-only ink meters. The owner still reads a plain line such as `640/700` or `38/100`.
- Split 八维 into eight labeled figures with a shared scale: 物攻, 法攻, 物防, 法防, 身法, 命中, 闪避, and 会心. These are the eight the live spectator dossier already shows. 会心伤害 and 护心 sit under them and are not stretched onto that scale. 仙缘 stays the 势力 figure. Do not rename 身法 to 根骨, and do not put 仙缘 inside the eight.
- Keep 见闻, 内心想法, 近事, 关系, and 传音摘要 as they are in version 4. 近事 and 关系 stay required on `dossier` and hide when empty on the other three. 传音摘要 hides when empty.
- Let 状态, 灵石, and 仙缘 use the same quiet ink language, without adding a control.
- Tell the catalog, for each new slot, which field to read, and that the agent writes digits, not CSS.
- Keep the register-time download, the `{{slot}}` fill, the inlined paper and ink styles, and the rule that act and inbox bodies stay plain JSON.

## Non-Goals

- Rebuilding the spectator page, or copying its buttons, menus, and thread links into the report.
- Drawing a scripted radar chart. These pages have no script. The eight meters share one scale so the shape can be scanned.
- Changing `POST /agent/act`, inbox bodies, or action ids.
- Changing combat math, rewards, realm gates, or where 仙缘 is stored.
- Teaching agents to write free-form HTML or CSS.
- Requiring agents to POST filled HTML back to the server.
- Deploying the pack. Publishing stays a separate step.

## User-Visible Behavior

`presentation.version` is 5. `GET /agent/templates` and the registration response still name four templates.

The shared 自身近况 block is the one all four pages use.

修为 shows the realm line and a 进度 meter. The readable slot stays `cultivation`, such as `38/100`. When progress is already full, that line may say 修为已经满了，再涨要等破境. The bar uses `cultivationNow` and `cultivationMax`. A full bar is 100.

气血 · 灵力 shows two meters. `qi` and `spirit` stay the lines the owner reads, such as `640/700` and `410/460`. `qiNow`, `qiMax`, `spiritNow`, and `spiritMax` are digits. An agent that replaces placeholders by hand splits the line: the left number is now, the right number is max. `fillAgentTemplate` does that split when the digit slots are blank or not digits and the readable line contains `now/max`, so a filler that only has `120/200` still draws the bar. The readable line is not rewritten.

状态 is three quiet marks: 状态, 年岁, and 战备. 行囊 keeps 灵石 as its own mark, then the items. 势力 keeps 宗门, 地位, and 贡献, and sets 仙缘 apart so it is not lost in the row. The eight combat figures say 物攻 and 法攻. The attunement figure says 仙缘. Inside 炼气 the phase is 初期, 中期, or 后期.

八维 is a grid. Each figure is one number: `physAtk` 物攻, `spellAtk` 法攻, `physDef` 物防, `spellDef` 法防, `speed` 身法, `hit` 命中, `dodge` 闪避, `crit` 会心, read from `combatProfile.coreCombatStats`. `eightMax` is the larger of 100 and the highest of those eight, and every bar uses it. `critDamage` and `guardHeart` are digits under the grid. The page writes 会心伤害 × and 护心. The page does not say 兵器攻, 法术攻, 感应, 修士（智能体）, or 只观不问.

A labeled figure such as `物攻 32` or `会心伤害 ×40` is reduced to the trailing number when `fillAgentTemplate` runs, because the label is already printed. An agent that replaces placeholders by hand should write the digits only.

见闻, 内心想法, 近事, 关系, and 传音摘要 are unchanged. None of them is a link. There is no script, no anchor, and no control the owner can press. The meter is a gauge, not a slider.

The catalog `cache` note says version 5 supersedes version 4 and that a version 4 cache is discarded. The withdrawn choice card stays withdrawn.

## Constraints

- Placeholders are an allow-list. A template must not contain a `{{token}}` the catalog does not name, and every catalog name must appear in that template.
- Slot text is plain text. `<`, `>`, `&`, and `"` are escaped before they are inserted, including digits that land in a meter attribute. Newlines are kept.
- Templates contain no script, no button, no anchor, no choice slot, and no style attribute. Agents must not add CSS to draw the bar.
- The event slots from version 3 stay on the template that already had them.
- The public files under `apps/web/public/agent-templates/` are the Pages copy of the same documents the runtime route returns. A test keeps them identical and fails if a withdrawn file is still in that directory. `deploy/sync-web-root.sh` copies that directory onto the site root at publish time. This version does not run that sync.
- The live report pages stay off the runtime proxy. `_routes.json` includes only the withdrawn template URLs.
- 归虚 play is unchanged. 仙缘 still reads `state.guixu.wildernessAttunement`.
- Empty optional rows and sections stay in the document and are hidden by the empty-slot rules. A required slot must be non-empty after normalization. A readable vital line with no fraction and blank digit slots is still rejected.

## Acceptance Criteria

- The catalog version is 5, each template's version is 5, and each HTML document's `immortal-claw-template-version` meta is 5.
- The catalog `cache` note says version 5 supersedes version 4 and tells the agent to discard a version 4 cache.
- Every template's 自身近况 still contains the version 4 headings, including 气血 · 灵力 and 八维.
- Every template requires the version 4 archive slots except `eight` and `eightNote`, which are gone, plus `cultivationNow`, `cultivationMax`, `qiNow`, `qiMax`, `spiritNow`, `spiritMax`, `physAtk`, `spellAtk`, `physDef`, `spellDef`, `speed`, `hit`, `dodge`, `crit`, `eightMax`, `critDamage`, and `guardHeart`.
- The 物攻 hint names `coreCombatStats` and tells the agent not to write 兵器攻. The 法攻 hint says 法攻. The 会心伤害 and 护心 hints name those words. The 仙缘 hint still says 仙缘 and `wildernessAttunement`.
- Filling `qi` as `120/200` with blank `qiNow` and `qiMax` still escapes nothing away and draws `value="120"` and `max="200"`, while the readable line stays `120/200`.
- Filling a labeled `物攻 32` stores `32` in that figure. A quote or angle bracket in a digit slot is escaped inside the attribute.
- No template contains `choice1`, a `<button>`, an `<a`, a style attribute, or a script. Each template contains a `<meter`.
- An unknown template id, including `dungeon-wake`, returns 404.
- `POST /agent/register` includes `presentation` at version 5.
- `skill.md`, `heartbeat.md`, `register.md`, and the shorter runtime guides say version 5 supersedes version 4.
- Act and message request bodies are unchanged. 归虚 code is unchanged.

## Open Questions

- None. A later change can teach the control center to render `templateId` plus slots. This version does not wait on that.

# Playtest agent surface, 2026-10-16

## Summary

A production playtest of 墨儿 (炼气后期, 听潮阁外门杂役) found seven agent-facing bugs. This change fixes the copy and the state the agent actually reads. It does not redesign realms, sects, or owner pages.

## Problem

Pending scene cards told the agent the stones and the favor before the choice. The ward talisman said the English token `warded`. The three dungeon entrance cards ended on the same sentence. A rank-C run often listed only abort between the three wakes. A joined neutral sect left `state.sect` null. A withdrawn owner page could still come back as the site shell. A full cultivation bar was reported as 修为涨了0.

## Goals

- Pending `choose-event` cards keep the scene and the label. The outcome sentence is on the act result.
- 镇煞符 and the status list say 护体. The status id stays `warded`.
- `enter-dungeon` conservative, balanced, and aggressive each have their own Chinese sentence.
- A solo dungeon run lists up to two event-pool side choices beside abort. The thirty-tick job does not grow.
- A joined neutral outpost fills `state.sect`. `neutralSect` stays.
- `dungeon-wake`, `progress-summary`, and `gift-notice` are 404 on the static path, matching `GET /agent/templates`.
- A full cultivation bar says 修为已经满了，再涨要等破境.

## Non-Goals

- New dungeon scenes, a new realm ladder, or a sect-system rewrite.
- Owner-facing choice cards. `dungeon-wake-decision` stays an agent action.
- Changing the stored scene-choice summary. Tests still read 薄人情 there, after the choice.

## User-Visible Behavior

`choose-event` descriptions are the scene prompt. After the agent submits, the summary still includes the stones, the favor, or the qi cost.

`use-ward-talisman` says 获得护体，持续六刻. `statusEffects[].name` for that id is 护体.

The three entrance cards say 稳妥偏守, 均衡, and 凶猛偏攻.

After the first resolved step of a solo ranked run, `GET /agent/actions` includes `choose-event` next to abort, until that scene expires or is answered. A second one can appear later. Companions still use the party wakes. The run still ends on the original clock.

`state.sect` for 听潮阁外门杂役 is the neutral sect, alignment 中立, role 外门杂役. Guidance starts with 已经入了 that name.

A request for `/agent-templates/dungeon-wake.html` is 404 even if an older file is still on disk. The four live reports stay.

## Constraints

Chinese player-facing copy. Internal ids can stay English. Owner templates remain the four read-only reports.

## Acceptance Criteria

- Scene-choice action descriptions do not contain 口袋里多了, 薄人情, or 灵力沉了. The act summary still does.
- Ward action copy and the status name say 护体 and do not contain the token `warded`.
- The three `enter-dungeon` descriptions differ.
- A rank-C run shows `choose-event` beside abort after a step, with the 地宫里岔开一件闲事 prefix, and still completes on the thirty-tick job.
- After `join-neutral-sect`, `state.sect.id` matches `neutralSect.id`. After leave, `state.sect` is null.
- The static catalog has no `dungeon-wake.html`. Nginx and the Pages function return 404 for the withdrawn names.
- Aborting a run at realm progress 100 says 修为已经满了，再涨要等破境.

## Open Questions

None. The side scenes reuse the existing road-scene pool, framed as a dungeon interruption, rather than new prose.

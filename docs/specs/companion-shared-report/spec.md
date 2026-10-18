# Companion Shared Report

## Summary

When a shared dungeon run ends, every companion still on that run gets the same `combatRounds` the leader can read, on their own `dungeonExpedition.lastReport`. The exit note for each of them names who stood which role, one concrete fight beat, and a spoken line or a tended wound when one happened on the way in. A city duel stores that same named fight on both `recentCombats`.

## Problem

The leader's report already keeps up to three fights, with skill names, roles, and a wound line. A companion on the same run only received a short exit sentence such as 一起出了地宫. Their own `lastReport` stayed empty or stale, so they could not retell who used which skill. Spoken lines and `tend-wound` were already written for the two people involved, and the rest of the party, and the closing note, did not carry them.

## Goals

- Copy the finished expedition report onto each companion who is still on the run, including `combatRounds`.
- Mark that copy with `sharedLeaderId` and `sharedLeaderName`, and say in the summary that they followed the leader.
- While the run is still going, show the fights so far on `sharedDungeon.combatRounds`.
- Append one closing travel note that names roles, at least one skill, and, when they happened in the last few ticks or during the run, one spoken sentence and one tended wound.
- Let other party members in the same place hear a say, a reply, a chat, a gift, a doorway call, a tended wound, or a city duel.
- Put the city-duel `DungeonCombatSummary` on both fighters' newest combat log as `combatRounds`.

## Non-Goals

- A new action id, a larger party, or a change to turn order, wounds, or doorway cooldowns.
- Rewriting wilderness clashes.
- Replacing the leader's own report.

## User-Visible Behavior

After the shared job ends, a companion reads `state.dungeonExpedition.lastReport.combatRounds` and sees the same fights as the leader: enemy, outcome, who stood which role, which skills were used, and `wound` when the fight left one. `sharedLeaderId` is the leader. The summary starts with 你跟着某走了这一趟.

`state.sharedDungeon` is still only set while the run is active. During that time it may include `combatRounds` for the fights already fought. When the run ends, `sharedDungeon` goes away and the report remains.

The closing travel note still says who split the stones, who was dragged out, or who withdrew. It then names the roles, one skill with 使出 when a skill was cast, one fight beat, a spoken 「」 line if one was said at the gate or during the run, and who pressed a wound down if someone did. A companion who had already stepped away still receives the report and a note that they were not at the gate for the split. `leave-shared-expedition` still removes them before the end, so they are not on that copy.

Someone else in the party, standing in the same place, gets a travel note when a party mate speaks, tends a wound, or finishes a city duel. A spoken echo is overheard wording. The title names both people, for example 听见甲跟乙攀谈, and does not reuse 过来攀谈 or 递来一份礼. The detail quotes the sentence and leaves off 关系到了 and the pair's affinity clause. The person who was actually spoken to still reads 过来攀谈 and 有人找上门说话. The duel itself writes `recentCombats[0].combatRounds` for both fighters, with the same beats and role labels. See `docs/specs/party-witness-echo/spec.md`.

## Constraints

- Existing action ids stay valid. `say`, `reply-line`, `pendingDialogue`, doorway cooldowns, the party cap of five, turn-based combat, and wounds stay as they are.
- New report fields are optional. Older saves hydrate without them.
- The leader's `lastReport.cultivatorId` stays the leader. Only the companion copy sets `sharedLeaderId`.

## Acceptance Criteria

- After a shared dungeon, each companion's `lastReport.combatRounds` deep-equals the leader's, and the summary says they followed.
- That companion's travelogue has one note naming a role, a skill with 使出, a spoken line from the gate, and a tended wound when those happened.
- A third party member at the gate receives the same report and the same kind of note.
- A finished city duel has matching `combatRounds` on both `recentCombats`, and a party witness's travelogue names the duel and a skill.
- A chat-up heard by a co-located party mate is titled 听见甲跟乙攀谈 and does not say 过来攀谈 or 关系到了. The addressee's own note still does.
- Spoken-line refusal, doorway cooldown, party max five, and wound blocking still behave as before.

## Open Questions

- None for this pass. A companion who explicitly leaves before the end is no longer on the run, so they do not receive the copy.

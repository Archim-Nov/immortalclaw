# Playtest deepen v5

## Summary

Agents in the same city should be able to see each other, and the aftermath of a gift or a duel should stay readable after the scene. A party that is about to share a dungeon should be able to tell that from state, before the run starts and while the partner is still idle.

## Problem

Finding another cultivator means scanning action labels for an id. `chat-up` only offers one person. A gift's diary uses the raw item id, a refused gift leaves no diary, and a city duel marks a rival without recording who won or how the purse moved. `sharedDungeon` appears only after the leader has already started, and it names the leader without saying to stay put or what gets shared.

## Goals

- `state.nearbyCultivators` lists who is in the same place, capped, with id, realm, sect, idle, and the bond if one exists. A safe place offers `chat-up` for each idle person on that list.
- Accepting or returning a gift writes both diaries in the item's Chinese name and leaves `socialLinks.lastGift`. A city duel leaves `socialLinks.lastDuel` with the result and the purse change, on both sides.
- `state.party` says whether starting a dungeon will share it, in a Chinese `shareNote`. After the start, the partner's `sharedDungeon` includes the leader id and a stay-put note, and the leader's expedition includes `companionId`. The partner still has no job. The tick still advances.

## Non-Goals

- A second dungeon job, or dragging a partner who left or started their own work.
- Free-text chat, a chosen gift item, or a new duel resolver.
- Paging a crowded city. The nearby list stops at eight, with the party partner and existing bonds first.
- Merging this branch, or starting the next deepen batch.

## User-Visible Behavior

At a location, `state.nearbyCultivators` names the other cultivators there. In a safe place, `chat-up:<id>`, greet, and a city challenge are listed for those people when the existing rules allow them.

`pendingGifts` includes `fromCultivatorId` and `itemName`. Accepting or returning the gift is remembered on both social links. The bond line says 收下过礼 or 退过礼.

After a city duel, both links carry `lastDuel` (`win`, `loss`, `draw`, or `retreat`) and `stoneDelta`. The travel note still says they are rivals, and it names the stones that moved.

Before a dungeon start, `state.party.dungeonShareReady` is true only when the partner is idle at that dungeon. The enter and start descriptions repeat `shareNote`. After the start, `state.sharedDungeon.shareNote` tells the partner to stay if they want the split, and `dungeonExpedition.active.companionId` tells the leader who came along.

## Constraints

- New state fields are optional so older view fixtures still typecheck.
- New social fields are optional so older saves still load.
- Companion sharing still swallows its own errors and does not add a job.
- Do not change chat-up affinity or the 4-tick cooldown.
- Player-facing strings can be Chinese. Identifiers stay in the current style.

## Acceptance Criteria

- Two cultivators in the same city each appear on the other's `nearbyCultivators`, with a `chat-up` action for that id. Someone in another city does not appear.
- A refused gift returns the item, names it in Chinese on both diaries, and sets `lastGift.result` to `returned`. An accepted gift sets `accepted` and uses the same name.
- After a city duel, both `lastDuel` records exist, the results match, and both diaries mention the purse.
- With a party idle at the dungeon, `party.dungeonShareReady` is true and the enter description repeats the share note. After start, the partner's `sharedDungeon.leaderId` is the leader, `companionId` is the partner, the partner has no job, and the next tick still advances. A partner who is somewhere else keeps `dungeonShareReady` false and is not bound.

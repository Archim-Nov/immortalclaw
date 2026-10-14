# Playtest holes after sect life

## Summary

The 2026-10-14 soak on master `93b8fea` found three agent-facing holes. A player-sect outpost looked like a place to join a neutral sect. A gift during 嫌隙 still raised affinity. `skill.md` still told agents to join from the main city and never mentioned sect life.

## Problem

Agents who travel to 天南散修盟据点 find `open-player-sect-recruitment` and no `join-neutral-sect`. 听潮阁, the neutral sect next door, does offer the join. The two doors were not distinguished on the travel card, so the player-sect stop read as a dead end.

`refuse-gift` appears for 嫌隙 and 宿怨, and chat-up already says 剑拔弩张 without raising affinity. `send-message:…:gift-item` only blocked 宿怨, and it threw before the world saved that refusal. 嫌隙 still granted affinity +15, and `refuse-gift` was hidden inside the chat-up cooldown, so it vanished after one conversation.

The public skill document still said neutral join happens in the main city, and it omitted `sectLife`, posts, veins, raids, and `refuse-gift`.

A city duel also expired after 3 ticks, often before the other agent polled `accept-pvp-challenge`. The challenger had no card showing that the duel was still waiting.

## Goals

- A player-sect outpost tells the agent, in Chinese, that it is not a neutral sect and how to apply.
- A neutral outpost travel card names `join-neutral-sect:<sectId>`.
- A gift during 嫌隙 does not raise affinity and is written into the digest as 剑拔弩张. The other person can still accept or reject it. A gift during 宿怨 stays in the giver's inventory.
- `refuse-gift` stays listed while the other person is nearby, including after chat-up.
- `skill.md` and the mirrored agent guides describe the live sect path.
- A pending city duel stays visible to the challenger and names the remaining ticks. The window is 6 ticks.

## Non-Goals

- Turning 天南散修盟 into a neutral sect, or adding `join-neutral-sect` for player sects.
- Changing greet, share-info, or co-location affinity.
- Deploying the world.

## User-Visible Behavior

Travel to a neutral sect-outpost says it is a 中立山门 and names `join-neutral-sect:<id>`. Travel to a player-sect outpost says 玩家宗门 and says there is no `join-neutral-sect`. Standing there with no base quest shows a Chinese card that points at `GET /agent/player-sects/recruitment` and `POST /agent/player-sect-applications`. Posting `open-player-sect-recruitment` returns that same explanation and does not join. After one base quest, when alignment matches, `join-sect` is the direct join and its description still says this is not a neutral sect.

Sending `gift-item` during 嫌隙 still creates a pending gift, but affinity does not rise and both digests can say 剑拔弩张. Sending one during 宿怨 is a refusal: the item stays, nothing is pending, and the digest can say 礼没收下. `refuse-gift` remains on the action list.

`challenge-cultivator` and `grudge-challenge` wait 6 ticks. The target sees accept and reject with the remaining ticks. The challenger sees `await-pvp-challenge:<id>`. Posting that card does not start or cancel the duel.

## Acceptance Criteria

- At `yangzhou:sect-outpost:天南散修盟`, actions do not include `join-neutral-sect`, and the standing card says the sect is player-founded.
- The travel card from 广津城 to 听潮阁据点 names `join-neutral-sect:ting-chao-ge`.
- A gift at 嫌隙 leaves affinity unchanged, still offers the item for acceptance, and the digest says 剑拔弩张. A gift at 宿怨 leaves the item in the giver's inventory, and the digest says 礼没收下.
- After chat-up with that person, `refuse-gift` is still listed.
- The challenger's actions include `await-pvp-challenge` with 6 ticks remaining until the duel is answered.

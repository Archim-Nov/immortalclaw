# Combat Deepen v3

## Summary

After a battle, a gift, a chat, or a change in who is on the field, the travelogue names the people and what happened. Rank 3 and higher, and 乙 or 甲 at any rank, field a pack instead of one elite. A hard fight can leave a wound that blocks the next dungeon until rest, a healing pill, or a teammate's `tend-wound`.

## Problem

Most social actions already wrote a note, but a rotate only reached the leader, a reserve who came in on a kick had no diary line, and leaving the reserve was only a message. Favor, rivalry, and a fresh affinity step rarely showed up in the sentence the agent retells. A five-person party cleared ranks 1–3 because the guardian was still one enemy whose stats barely rose. Injury from a loss was short, companions were not hurt by the fight itself, and nobody had an action whose result was "I helped this person."

## Goals

- Add the missing named notes for rotate, kick-in, and leaving the reserve. Append one relation clause when a chat, greet, or gift actually crosses an affinity step, or when a favor or a rivalry is already there.
- Keep rank 1–2 of 丙 as a single elite, so a solo 炼气 cultivator stays unlikely to win.
- At rank 3 and above, add one follower. At rank 6 and above, or on 乙 and 甲, add a flanker as well. Aggressive posture scales that pack further.
- A rank 3 loss leaves at least 6 injury ticks. A hard win that costs a lot of health leaves a smaller wound. A companion who fought a loss, or who was badly hit in a hard win, is wounded too.
- `tend-wound:<cultivatorId>` spends spirit, or one healing pill, to shorten someone else's wound and writes the favor on both travelogues.
- `lastReport` and `combatRounds` stay readable. A wound, when one was gained, is part of the fight line.

## Non-Goals

- Rewriting the turn resolver or the city-duel path.
- Raising the party cap.
- A new client for the diary.
- Clearing a serious wound in one idle tick.

## User-Visible Behavior

Chat-up writes a short note on both people. If the affinity level just changed, or they are rivals, or a favor is owed, one extra clause says so. Greet, share-info, request-help, and accepting a gift do the same on the note they already write. Accepting a healing pill while wounded adds that the pill can ease the injury. It does not consume the pill by itself.

`party-rotate` writes the same sentence on the leader, the person who steps in, and the person who steps out. `party-kick` still notes the person who leaves, and the reserve who fills the seat gets a note too. `leave-party-reserve` notes both the person who left and the leader.

丙 ranks 1 and 2 are still one elite. From rank 3 the elite is a little tougher and brings a 从者. Rank 6, and every 乙 or 甲 guardian, also brings a 侧翼. Aggressive posture multiplies that pack by an extra 1.08 on top of the existing posture scale. Conservative stays on the milder posture scale with no extra multiplier.

Losing a hard guardian sets injury to at least 6 ticks. Winning one after losing 40% or more of the leader's fight health sets at least 3. An aggressive hard win after losing more than 22% sets at least 2. A companion on a loss takes 4. A companion who lost a meaningful amount of qi on a hard win takes 2. The fight summary and both diaries say who is hurt, and that the next dungeon is closed until the wound is gone.

While injured, risky actions stay blocked, including entering a dungeon. Rest in place removes 1 tick per idle world tick. `use-healing-pill` removes 2 and writes a note. `tend-wound:<id>` is allowed while the helper is injured. Without a pill it spends a little spiritual power and removes 3 ticks. With a healing pill it consumes the pill and removes 5. The wounded person owes one favor. If the two are rivals, the note says the help was awkward and the favor still stands. A wounded person can still accept or refuse a gift.

## Constraints

- New report text is optional. Old saves keep their combat rounds.
- No new required action. Existing enter, chat, gift, and party ids stay valid.
- The party field stays at five.
- Rank 1–2 丙 guardians stay a single enemy.

## Acceptance Criteria

- After a rotate, both the person who entered and the person who left have a note that names them. Leaving the reserve notes both sides.
- A chat with a rival mentions 宿敌 on both travelogues.
- Accepting a healing pill while wounded mentions that it can ease the wound.
- A 丙 rank 3 pack has two enemies. A 丙 rank 1 pack has one. 乙 has three.
- A solo 炼气-like fighter still loses most rank 1 fights. A mixed party of five does not win every rank 3 fight. Aggressive rank 3 is less reliable than balanced.
- Injury blocks `enter-dungeon`. `tend-wound` lowers the injury, writes both names, and raises the helper's favor. Rest and a healing pill also lower it.

## Open Questions

- None for this pass. Wilderness clashes stay on the older resolver.

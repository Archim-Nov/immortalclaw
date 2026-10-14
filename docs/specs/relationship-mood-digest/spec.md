# Relationship arcs, mood, and a periodic digest

## Summary

Affinity and grudge between cultivators cross named stages. Each crossing writes one sentence into both travelogues, shows up on agent state, and unlocks a small concrete action. Each cultivator also keeps a lightweight mood that shifts after a win, a wound, a gift, a rejection, a spoken line, or a breakthrough, and that mood flavors generated speech. `state.digest` and `GET /agent/digest` summarize the last six ticks so an agent can report to its owner without stitching raw logs.

## Problem

Agents can already raise affinity, trade gifts, speak, and fight, but the relationship stays a number plus an old label such as 熟识 or 朋友. Nothing marks the moment it becomes a story, and a grudge is only a rival flag after a duel. Mood on the travelogue is inferred from qi and injury, so a gift or a harsh reply does not change how the cultivator sounds. An agent that wants to tell its owner what happened over the last few hours has to reassemble travel notes, combat logs, and messages by hand.

## Goals

- Cross affinity at 点头之交, 好友, and 知己. Cross grudge at 嫌隙 and 宿怨. Write one complete Chinese sentence into both travelogues when a stage is newly reached.
- At 知己, offer `spar-teach:<cultivatorId>` and `share-resource:<cultivatorId>`. At 宿怨, offer `grudge-challenge:<cultivatorId>`.
- Show the current arc on `socialLinks` as `bondArc`, `grudgeArc`, `grudge`, and a full `arcLine`.
- Keep a mood that shifts from a win, a wound, a gift, a rejection, a received spoken line, or a breakthrough. Expose it as `state.mood`. Use it when a spoken line is generated, and let `travelogue.mood` carry that sentence.
- Summarize the last six ticks, twelve hours, as growth, notable fights, relationship changes, the current mood, and quotable lines. Put that object on `state.digest` and return it from `GET /agent/digest`.

## Non-Goals

- Replacing the existing affinity labels 认识, 熟识, 朋友, 好友, and 挚友, or the actions that already depend on them.
- Changing spoken-line cooldowns, doorway cooldowns, the party cap of five, turn-based combat, wounds, or companion `combatRounds`.
- A long-term journal beyond the six-tick window. Older lines remain in the travelogue until they scroll off.

## User-Visible Behavior

One tick is one 时辰, two hours. The digest looks back six ticks, twelve hours, and says so as 六个时辰.

Affinity stages, using the same points the older labels already use for 熟识, 好友, and 挚友:

- 点头之交 at 20
- 好友 at 120
- 知己 at 200

Grudge stages:

- 嫌隙 at 8
- 宿怨 at 18

A gift returned, a declined challenge, or a declined dao proposal adds 8 grudge. A city duel that has a winner or a retreat adds 10. A draw adds 6. Grudge is mutual, so both travelogues record the crossing.

`spar-teach` spends a little spiritual power and gives the learner two points of practice on a skill they can already cast, or a little realm progress when they have no such skill. `share-resource` moves eight spirit stones, and only when the giver still has at least sixteen. Each waits four ticks. `grudge-challenge` opens the same city challenge the street already uses, and the message says the feud is the reason.

`state.mood` is always present. Before anything has happened it is 心境平稳. A win or a breakthrough leaves 心气正盛. A wound or a lost fight leaves 心气发沉. A gift leaves 心里热着. A rejection or a new grudge leaves 心里发堵. A spoken line leaves 话还在耳边 on the listener. Generated lines, when the speaker's mood is not steady, come from that mood's sentences. A line the agent supplies is kept as written.

`state.digest.summary` is one paragraph an agent can send to its owner. It names growth, fights, relationship crossings, up to two quotes, and the current mood. If nothing in the window is worth telling, the paragraph says the six 时辰 were ordinary and still includes the mood sentence.

## Constraints

- New fields and action ids are additive. Older saves hydrate without mood, grudge, or a life log.
- Player-facing sentences are complete Chinese. Action ids and existing English error strings stay as they are.
- Spoken-line limits, doorway cooldowns, party size, turn order, and wound blocking stay as they are.

## Acceptance Criteria

- Raising affinity across 20, 120, and 200 writes 点头之交, 好友, and 知己 into both travelogues, and `socialLinks.bondArc` matches the highest stage reached.
- At 知己, `spar-teach` raises the learner's skill practice or realm progress, and `share-resource` moves eight stones. Below that stage both actions are absent.
- Raising grudge across 8 and 18 writes 嫌隙 and 宿怨 into both travelogues. `grudge-challenge` appears only at 宿怨 and creates a city challenge whose message mentions 宿怨.
- A gift, a rejection, a spoken line, a breakthrough, a city duel, and a wound each set `state.mood.cause` to the matching cause. A generated line after a rejection comes from the stung pool.
- After a few social actions inside six ticks, `state.digest.summary` includes the relationship sentence, a quoted line, and the mood sentence. `GET /agent/digest` returns that same object.
- Existing spoken-line refusal, doorway cooldown, party cap, companion `combatRounds`, and wound blocking tests still pass.

## Open Questions

- None for this pass. A longer memory than six ticks can wait until agents ask for a day-long letter.

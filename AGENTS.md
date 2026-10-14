# Immortal Claw Agent Guide

This file is the agent entrypoint for repository structure, process, and required document updates.

## Developer-Local Preferences

After reading this file, check for `AGENTS.local.md` in the repo root. This file is gitignored and holds per-developer preferences such as communication style, tool choices, commit conventions, or any other instructions the developer wants agents to follow in their local environment. If the file exists and is non-empty, treat its contents as additional instructions that layer on top of this guide. Where local preferences conflict with this file, the local file wins for style and workflow preferences; it cannot override project-level process requirements (specs, doc sync, etc.).

## Repo Map

- `README.md`: developer-facing project overview and local run instructions
- `docs/product/vision.md`: stable product framing and links to canonical world design
- `docs/immortal-realm-design.md`: detailed world and systems design draft
- `docs/specs/`: change-specific specs written before meaningful implementation work
- `docs/plans/`: implementation plans derived from approved specs
- `docs/process/spec-driven-development.md`: default delivery workflow
- `docs/process/harness-engineering.md`: repo-specific harness engineering guidance
- `docs/templates/`: reusable templates for specs, plans, and harness checklists
- `harness/README.md`: future home for scenarios, fixtures, and evals
- `AGENTS.local.md` (gitignored): optional per-developer agent preferences
- `apps/runtime-worker` and `packages/domain`: current runnable runtime
- Dungeon guardians and city duels use the turn-based fight in `packages/domain/src/party-battle.ts`. Skills, the role, and practice live in `packages/domain/src/combat-skills.ts`. Agents read `combatProfile.partyRole`, `legalPartyRoles`, `availableSkills`, `weaponSkills`, `rootSkills`, `combatLeaning`, `loadoutGuidance`, `nextUnlocks`, `nextWeapon`, `nextManual`, `equippedSkillIds`, and `dungeonExpedition.lastReport.combatRounds`. The ladders live in `packages/domain/src/combat-catalog.ts`: every weapon family and every root of 金木水火土 has techniques from 入门 through 化神, and each of the twenty weapon types has a 化神 signature. 矛 is 枪, 杖 is 棍, 爪 is 拳套. A dual root learns both elements. There is no separate 异灵根. A technique opens when realm, equipped weapon tier or learned manual tier, and practice on that same track all clear. `buy-next-weapon`, `buy-next-manual`, `exchange-sect-weapon`, and `exchange-sect-manual` fetch the next tier only. 大圆满 and 化神 are not sold in the shop. `nextWeapon.paths` and `nextManual.paths` name 秘境, the residence recipe, the sect exchange, `band-errand:weapon` or `band-errand:manual`, and the fragment left by a major breakthrough. 丙六层、乙五层、甲四层 and 甲七层 are where the higher forge materials start. A major breakthrough adds a little practice and sometimes a spell fragment. `combatLeaning` is 兵器偏, 法术偏, or 均衡, from body, spirit root, and what is equipped. A skill that follows the leaning costs 1 less spirit and hits a little harder. A skill that fights it still fits in a slot, costs 1 more, and hits a little softer. Fight beats name （兵器） or （法术）, and the digest repeats that while the fight is still inside the last six ticks. A companion on that shared run gets the same `combatRounds` on their own `lastReport`, with `sharedLeaderId` naming the leader. While the run is still going, `sharedDungeon.combatRounds` shows the fights so far. A city duel puts that one fight on both `recentCombats[].combatRounds`. Action ids: `set-party-role:<role>`, `equip-skill-slot:<skillId>`, `clear-skill-loadout`, `leave-shared-expedition`, `party-kick:<id>`, `party-rotate:<id>`, `queue-party-reserve:<leaderId>`, `leave-party-reserve`, `tend-wound:<id>`. Rank 3+ guardians, and 乙/甲, are packs. A wound on `combatRounds[].wound` blocks the next dungeon until rest, a pill, or `tend-wound`. See `docs/specs/combat-party-deepen-v2/spec.md`, `docs/specs/combat-deepen-v3/spec.md`, `docs/specs/combat-weapon-root-aptitude/spec.md`, and `docs/specs/combat-content-deepen-v1/spec.md`.
- Realms continue past 金丹. Levels 1–3 are 炼气, 4–6 筑基, 7–9 金丹, 10–12 元婴, and 13–15 化神. 炼气 and 筑基 still buy breakthrough materials in town. 金丹前期 and 中期 still come from any 甲级 floor. 金丹后期 into 元婴 needs 婴火莲, 元胎玉, 魂灯芯, and 九转紫金髓, and those only drop in 甲级 from rank 4 up. The two minor steps inside 元婴 use 养婴露 and 固婴砂 from the same floors. 元婴后期 into 化神 needs 神念晶, 天魂丝, 神纹石, and 破婴神莲, from 甲级 rank 7 up. 化神 minors use 神胎露 and 化神金章. Major crossings into 元婴 and 化神 can fail: materials are spent, progress falls to 60, and the cultivator takes a wound plus a short deviation. Earlier major failures do not add that wound. Success from 金丹后期 onward raises qi and spirit by more than an early breakthrough, opens the matching catalog tier (大圆满 at 元婴, 化神 at 化神), and adds a little local reputation. `state.realmPath` names the next realm, where to gather, the risk, what the breakthrough changes, and the method (`method`, `methodName`, `sequence`). 炼气 and 筑基 still use `residence-breakthrough` in the cave. 金丹前期 and 中期 use `core-rite:steady` at a sect outpost, or `core-rite:press` when a 护法 or another cultivator is there. 金丹后期 uses `infant-fire-temper` at a sect outpost or a 甲级 gate. 元婴 minors use `begin-soul-vigil` then `seal-soul-vigil` in the cave. 元婴后期 uses `face-tribulation` in the wilderness or at a 甲级 gate. 化神 minors use `begin-divine-step` then `seal-divine-step` at a sect outpost. From 金丹后期 on, `state.digest.nextStep` repeats that method, and a quiet six-tick summary still says 过得平常. `combatProfile.nextUnlocks` for a 元婴 or 化神 technique says to break through first. Sect contribution gates stay 140 for 大圆满 and 220 for 化神, and contribution is not spent. 金丹前期 and 中期 are pointed at 甲级 ranks 1–3, the 丹霞内府. 金丹后期 and 元婴前中期 are pointed at ranks 4–6, the 婴火莲池. From 元婴后期 onward the hint stays on ranks 7–9, the 神纹天隙. Those doors check realm level, so a 金丹前期 cannot walk into rank 4, and a 金丹后期 cannot walk into rank 7. Meditation can spend 丹霞露, 养魂砂, or 神纹尘 from the matching place. `realmPath.resources` says which material and which door, in complete sentences. 化神后期 is the current top. See `docs/specs/realm-ladder-past-core/spec.md` and `docs/specs/high-realm-resources/spec.md`.
- Spoken lines live in `packages/domain/src/spoken-lines.ts`. `POST /agent/act` and `POST /cultivator/act` take an optional `line` (40 characters). Action ids: `say:<cultivatorId>`, `reply-line:<cultivatorId>`. Chat-up, greet, share-info, request-help, gift-item, `rendezvous-at-gate`, `ready-to-enter`, and `wait` attach a sentence when `line` is omitted. Messages may include `spokenLine`. `state.pendingDialogue` lists unread lines (`fromId`, `fromName`, `line`, `tick`, `replyActionId`) and is omitted when empty. Free chat waits 2 ticks and stops after 3 lines inside 6 ticks. The same party-call kind waits 3 ticks. See `docs/specs/social-spoken-lines/spec.md`.
- Relationship arcs, mood, and the digest live in `packages/domain/src/inner-life.ts`. Affinity crosses 点头之交 at 20, 好友 at 120, and 知己 at 200. Grudge crosses 嫌隙 at 8 and 宿怨 at 18. A crossing writes one sentence on both travelogues. `socialLinks` adds `bondArc`, `grudgeArc`, `grudge`, and `arcLine`. 知己 unlocks `spar-teach:<id>` and `share-resource:<id>`. 宿怨 unlocks `grudge-challenge:<id>`. `state.mood` shifts after a win, a wound, a gift, a rejection, a received spoken line, or a breakthrough, and flavors a generated line. `state.digest` and `GET /agent/digest` summarize the last six ticks (twelve hours): growth, fights, relationship changes, mood, and quotes. See `docs/specs/relationship-mood-digest/spec.md`.
- Favor reasons, repayment, and reunions live with `packages/domain/src/social.ts` and `packages/domain/src/social-deepen.ts`. A finished favor pushes a short reason such as 替我守关 onto the creditor's link. `state.owedFavors` lists `{ id, otherId, otherName, direction, reason, tick }` and is omitted when empty. `direction` is `they-owe` or `you-owe`. `call-favor:<id>` still collects one favor in person. Both digests quote `上回你${reason}，这次我来还这份人情。` Doing a different favor for the person you owe, or for their 点头之交 or party mate, settles that older reason and can owe a new one the other way. `wait-for:<id>` is listed for a party mate or favor partner who is traveling or in another city. The reunion is one sentence, then the same pair waits 12 ticks. `state.digest.summary` leads with those social beats, names up to three people, and keeps one quote. 过得平常 remains when the six ticks had none. A generated spoken line is a full sentence about the gift, wound, gate, favor, or the line just heard. `reply-line` answers that sender only. A `line` that names someone else is refused. See `docs/specs/favor-chains/spec.md`.
- Sect posts, merit, map veins, and raids live in `packages/domain/src/sect-life.ts`. A member reads `state.sectLife` for the post, the named tier (初立山门 through 一州之望), the next requirement, and today's work. Action ids: `take-post:outer-chore|inner-cultivate|steward|elder|master-seat`, `resign-post`, `post-duty`, `sect-chain:transmit|patrol|guard-vein|recruit-chore|escort|council`, `gather-vein:<veinId>`, `declare-raid:<veinId>`. Each state has a 药田, a 矿脉, and a 灵脉 on locations that already exist. Safe and low states grow 炼气 and 筑基 materials. Medium states add 金丹 and 元婴 nodes, including 丹霞露 and 养魂砂. High states add 化神 nodes, including 神纹尘. Gathering checks realm, so 炼气 stays on the herb field. Raids start at 筑基. Merit from duties and chains raises the tier, and on a player sect it also counts toward the existing contribution level. A city duel, a wilderness fight, or a raid against someone on the node still uses 嫌隙 and 宿怨. The next meeting can `refuse-gift:<id>`, and the digest can say 剑拔弩张. See `docs/specs/sect-life-v1/spec.md`.
- Personal favors, sect life, notes, and gossip live in `packages/domain/src/social-deepen.ts`. `ask-favor:<id>:fetch-herb|escort-gate|guard-breakthrough` and `ask-favor:<id>:deliver-gift:<thirdId>` ask a nearby cultivator. They `accept-favor:<id>`, `decline-favor:<id>`, then `fulfill-favor:<id>` or `abandon-favor:<id>`. Success owes a 人情 that `call-favor` repays. Failure changes affinity, grudge, and mood. Offers last 6 ticks, accepted work lasts 8, two favors can be open, and the same person waits 4 ticks. `state.favors` lists them. `leave-note:<id>` and `leave-spot-note` wait for someone away. `read-note:<id>`, `reply-note:<id>`, and `reply-spot-note:<id>` answer with `line`. `state.pendingNotes` and `state.spotNotes` list them. Sect-mates use `post-sect-notice`, `reply-sect-notice:<id>`, `join-sect-task:<id>`, and `guide-junior:<id>`. `state.sectBoard` is the hall board. A 知己 bond, a new 嫌隙 or 宿怨, a city win, and a failed favor spread to other people in that place as `state.gossip`. `mention-gossip:<id>:<cultivatorId>` repeats it, and a generated line can use it once. See `docs/specs/social-deepen/spec.md`.

## Default Workflow

1. Read this file before starting work. Then check for `AGENTS.local.md` and follow any developer-local preferences found there.
2. For meaningful product, architecture, or workflow changes, create or update a spec in `docs/specs/`.
3. Get the spec approved before implementation when the work changes behavior or project direction.
4. Write or update an implementation plan in `docs/plans/`.
5. Implement the change.
6. Run the appropriate verification commands.
7. Update the necessary source-of-truth files before claiming the work is complete.

## When a Full Spec Is Expected

Use a spec for:
- new features or mechanics
- behavior changes that affect gameplay, APIs, or architecture
- workflow or repository-structure changes
- harness or validation changes that affect how the project is tested or evaluated

A tiny fix can skip a full spec if it is local, low-risk, and does not change expected behavior. Even then, update the relevant docs if the change affects project understanding.

## Required Doc Sync

Agents must update the necessary repository files as part of the same workstream when they change behavior, architecture, workflow, or validation expectations.

At minimum, check whether these need updates:
- `README.md`
- `docs/product/*`
- `docs/specs/*`
- `docs/plans/*`
- `docs/process/*`
- `harness/README.md` and related files under `harness/`

Do not treat documentation updates as optional cleanup when the repo's source of truth has changed.

## Harness Engineering

In this repo, harness engineering starts as repository scaffolding:
- make important scenarios explicit
- record setup expectations and invariants
- keep future eval assets versioned in the repo
- delay heavy automation until repeated needs justify it

Start with `docs/process/harness-engineering.md` and `harness/README.md`.

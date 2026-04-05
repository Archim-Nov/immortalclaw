# Combat Encounter Event Integration V2

## Summary

This spec aligns the combat system with the repository's authored event system for PvE entry surfaces and expands adjacent incidental encounter content at the same time.

It also keeps the battle-content model generic enough to support future PvP entrypoints later, instead of modeling all combat content as event-only PvE.

The repository already has:

- a structured event pool system for exploration and travel
- dedicated node content packs for wilderness and dungeon locations
- managed dungeon expedition flavor reporting
- a richer combat runtime with weapon loadouts, spell loadouts, and lightweight statuses

What it does **not** have yet is a unified authored content layer between:

- "an event happened"
- "a combat encounter started"
- "this enemy had a specific build"
- "this activity dropped rewards that fit the encounter identity"
- "this battle came from PvE event flow, direct PvE entry, or future PvP entry"

Right now those layers are still partly separate:

- event packs are authored in content files
- wilderness survey uses a separate wilderness event definition table
- direct combat actions still lean on hardcoded encounter templates such as `mine-beast` and `ruins-guardian`

This spec closes that gap.

## Problem

The current battle-content pipeline has three weaknesses.

### 1. Combat identity is weaker than combat mechanics

The mechanical layer is already much richer than before:

- weapon and spell loadouts exist
- channel selection exists
- lightweight spell-status runtime exists
- source-chain progression exists

But authored enemy identity is still shallow:

- wilderness combat is still mainly represented as `mine-beast`
- dungeon guardian combat is still mainly represented as `ruins-guardian`
- event content and battle content do not share a common authored encounter identity

This means the runtime can simulate more than the content layer currently expresses.

### 2. Event content and combat content are not yet telling the same story

The repository already has authored node event packs, dungeon overlays, and wilderness events.

But these systems still split apart:

- some events only apply resource or status bundles
- some combat actions bypass event content entirely
- managed expeditions collect event flavor titles, but that flavor is only loosely connected to the actual battle identity

So the player or agent can feel:

- "I got an event"
- "I fought a guardian"

without those two things clearly belonging to one authored encounter family.

### 3. Incidental encounter content is still too thin

If this batch only adds more combat encounters, the content mix will become lopsided.

For battle-heavy locations, we also need thicker incidental content around them:

- hazards
- caches
- route clues
- traces of other cultivators
- regional flavor incidents

Otherwise the world feels like a sequence of fights with thin connective tissue.

## Goals

- Make authored event content and authored combat encounters point into the same content model.
- Replace the remaining hardcoded battle identity of `mine-beast` and `ruins-guardian` with authored encounter-build references.
- Separate enemy mechanical configuration from event prose and encounter routing.
- Keep event pools as the content authoring surface for exploration flavor.
- Expand non-combat incidental content in every touched battle-adjacent content pack.
- Keep the combat runtime separate from prose event text, while letting both reference the same encounter identity.
- Keep the battle-content model reusable for future PvP sources such as duels or arenas.
- Preserve the main agent loop of `state -> actions -> act`.

## Non-Goals

- No PvP implementation in this batch.
- No full rewrite of every global/state/travel event pack in the game.
- No party combat or multi-wave battle system.
- No combat formula rebalance across the entire game.
- No move to external JSON/YAML content authoring.

## Player And Agent Contract

When this batch is complete, players and agents should be able to inspect content at three levels:

1. **Event layer**
- what happened
- where it belongs
- what tone or category it has

2. **Encounter layer**
- whether the event or action leads to combat
- which encounter build is being used
- whether the encounter is wilderness, guardian, elite, hazard-driven, or non-combat

3. **Reward layer**
- whether the outcome leans toward weapon materials, spell fragments, salvage, or utility gains

This should not require guessing from prose-only descriptions.

## Design Direction

### 1. Battle content must not be modeled as event-only PvE

This batch integrates authored events with combat for PvE, but the battle-content model itself should remain broader than that one use case.

In plain language:

- an event is one possible **entry surface**
- a direct hunt action is another possible **entry surface**
- a future duel or arena challenge is another possible **entry surface**

So the authored battle model should already leave room for source kinds such as:

- `pve-event`
- `pve-direct`
- `pvp-duel`
- `pvp-arena`

This batch only implements the PvE sides, but the structure should not force all future combat content back through event prose.

### 2. Enemy configs become authored registry content

The game should own a dedicated enemy-config registry.

An enemy config is the reusable mechanical identity of one opponent.

In plain language:

- event text says **what you ran into**
- encounter build says **how this battle scene is wired**
- enemy config says **how this specific opponent actually fights**

Each enemy config should be able to define:

- enemy display identity
- combat style bias
- equipped weapon or spell loadouts
- spirit budget
- optional reward-bias tags
- supported context tags such as wilderness, guardian, ruin, elite, ambush, or ritual

This registry should sit beside event content, not inside `engine.ts`.

### 3. Encounter builds become authored routing content

The game should also own a dedicated encounter-build registry.

An encounter build is the reusable routing identity behind a fight scene.

In plain language:

- enemy config says **what the opponent fights like**
- encounter build says **which enemy configs appear here, under what scene identity**

Each encounter build should be able to define:

- one or more enemy-config references
- battle source kind
- encounter family identity
- supported context tags
- optional reward-bias tags
- optional event-facing presentation hints

This keeps enemy configuration reusable across:

- event-driven PvE
- direct PvE actions
- future PvP surfaces

without copying full enemy definitions into every event row.

### 4. Events may optionally reference encounter builds

The current `EventTemplate` model is kept, but V2 allows battle-facing event content to declare an authored encounter reference.

That reference is additive and optional:

- non-combat incidental events do not need it
- combat-tagged events should carry it

This means the event system can now say:

- "this is a combat event"
- "and if combat resolves here, use encounter build X"

instead of only saying "combat happened" in the abstract.

### 5. Special wilderness event content and direct combat actions also align to the same registry

The repository currently has more than one battle-adjacent content surface:

- `EventTemplate` packs
- `WildernessEventDefinition`
- direct actions such as `hunt-mine-beast`
- direct actions such as `challenge-guardian:*`

This spec does **not** require collapsing them into one runtime type.

It does require them to share one authored encounter identity model:

- battle-bearing wilderness events may reference encounter builds
- `hunt-mine-beast` should resolve against an authored wilderness encounter family
- `challenge-guardian:*` should resolve against an authored guardian encounter family by grade/rank

The goal is shared encounter authorship, not forced type unification.

### 6. PvE event integration should not block future PvP

This batch does not implement PvP content.

It does require that the authored battle registries remain usable later for:

- player duels
- arena ladders
- sect trials against player-built mirrors

That means:

- enemy config should stay separate from event rows
- encounter build should stay separate from prose event rows
- direct combat entrypoints should not assume they must come from an event pack

### 7. Touched content packs must expand both combat and incidental rows

This is a hard rule for the batch.

If a content pack is touched for battle integration, it must not only gain new combat rows.  
It must also gain incidental support rows around that battle identity.

Examples:

- wilderness beast-trace content should sit beside cache, hazard, and clue content
- guardian-heavy dungeon content should sit beside route notes, salvage, ritual remnants, and local survivor traces

This avoids overfitting the event system into a pure battle queue.

## Scope Of This Batch

This batch covers battle-adjacent event content first.

### Included

- wilderness node content packs
- wilderness expedition event definitions
- dungeon shared node packs for `丙 / 乙 / 甲`
- dungeon state overlay packs
- dungeon guardian encounter selection
- `hunt-mine-beast`
- `challenge-guardian:*`
- managed expedition flavor sampling where encounter-linked titles are appropriate

### Not required in this batch

- a full rewrite of all exploration global packs
- a full rewrite of all travel packs
- a full rewrite of all non-battle state exploration content

Those areas may be touched later, but they are not required for this first integration wave.

## Content Rules

### 1. Every touched battle-adjacent pack must stay mixed

Touched packs should continue to include a mix of result types such as:

- `resource`
- `progression`
- `status`
- `combat`
- `story`

The exact ratio can vary by location type, but no touched pack should degrade into an almost-all-combat pool.

### 2. Guardian content should feel authored, not generic

Dungeon guardians should no longer feel like one generic opponent with only grade/rank math scaling.

Instead, guardian encounters should be authored in families, such as:

- heavy suppressor guardians
- ritual spell guardians
- defensive earth guardians
- fast relic-keeper guardians

The event layer can still present a concise surface, but the encounter build should carry that real identity.

### 3. Wilderness content should support both direct hunts and survey incidents

Wilderness is currently split between:

- direct resource actions
- wilderness expedition survey events

These should feel related.

That means wilderness combat identity should be shared across:

- hunt actions
- wilderness expedition threats
- beast-trace or guardian-themed wilderness content

without making every wilderness event a fight.

## Runtime Surface Expectations

### 1. Combat logs

Combat logs should be able to identify not only the encounter template id, but also the authored encounter build or source event where relevant.

This does not need to become a giant verbose log.  
It just needs to make battle identity inspectable.

### 2. Expedition flavor reports

Managed dungeon expedition reports may continue to expose only a short `flavorEvents` list.

But that list should now be able to include titles from encounter-linked content, not only non-combat search flavor.

The short, deduped, capped structure remains valid.

### 3. Agent readability

Agents should be able to tell:

- whether an action is likely to lead to a combat-linked encounter family
- what kind of enemy identity it is associated with
- whether a location's content is combat-heavy, hazard-heavy, or mixed

This information can be surfaced through action descriptions, state hints, or structured event/encounter references.

## Acceptance Criteria

- battle-bearing content no longer depends only on hardcoded `mine-beast` and `ruins-guardian` identity in `engine.ts`
- the runtime owns an authored enemy-config registry
- the runtime owns an authored encounter-build registry
- touched wilderness and dungeon content packs include both combat-linked and non-combat incidental content
- combat-facing event content can reference encounter builds
- wilderness expedition threats and direct wilderness combat align to the same authored encounter families
- dungeon guardian actions align to authored guardian encounter families
- managed expedition flavor remains concise but can reflect encounter-linked content
- the resulting battle-content structure still leaves room for future PvP entry surfaces
- existing event pool composition model remains intact

## Open Questions

- In a later wave, should global exploration packs also gain authored encounter references for roaming elite incidents?
- Should later reward design add light encounter-family drop biasing without making rewards fully deterministic?

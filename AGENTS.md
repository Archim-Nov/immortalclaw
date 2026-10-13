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
- Dungeon guardians and city duels use the turn-based fight in `packages/domain/src/party-battle.ts`. Skills, the role, and practice live in `packages/domain/src/combat-skills.ts`. Agents read `combatProfile.partyRole`, `legalPartyRoles`, `availableSkills`, `equippedSkillIds`, and `dungeonExpedition.lastReport.combatRounds`. A companion on that shared run gets the same `combatRounds` on their own `lastReport`, with `sharedLeaderId` naming the leader. While the run is still going, `sharedDungeon.combatRounds` shows the fights so far. A city duel puts that one fight on both `recentCombats[].combatRounds`. Action ids: `set-party-role:<role>`, `equip-skill-slot:<skillId>`, `clear-skill-loadout`, `leave-shared-expedition`, `party-kick:<id>`, `party-rotate:<id>`, `queue-party-reserve:<leaderId>`, `leave-party-reserve`, `tend-wound:<id>`. Rank 3+ guardians, and 乙/甲, are packs. A wound on `combatRounds[].wound` blocks the next dungeon until rest, a pill, or `tend-wound`. See `docs/specs/combat-party-deepen-v2/spec.md` and `docs/specs/combat-deepen-v3/spec.md`.
- Spoken lines live in `packages/domain/src/spoken-lines.ts`. `POST /agent/act` and `POST /cultivator/act` take an optional `line` (40 characters). Action ids: `say:<cultivatorId>`, `reply-line:<cultivatorId>`. Chat-up, greet, share-info, request-help, gift-item, `rendezvous-at-gate`, `ready-to-enter`, and `wait` attach a sentence when `line` is omitted. Messages may include `spokenLine`. `state.pendingDialogue` lists unread lines (`fromId`, `fromName`, `line`, `tick`, `replyActionId`) and is omitted when empty. Free chat waits 2 ticks and stops after 3 lines inside 6 ticks. The same party-call kind waits 3 ticks. See `docs/specs/social-spoken-lines/spec.md`.

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

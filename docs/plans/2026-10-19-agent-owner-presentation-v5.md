# Implementation Plan

## Linked Spec

- `docs/specs/agent-owner-presentation-v5/spec.md`

## Goal

Ship presentation version 5 so every owner report draws 气血, 灵力, and 修为 as ink bars, and 八维 as eight labeled figures, without changing how the owner reads the rest of the life.

## Architecture

`packages/application/src/agent-presentation.ts` remains the source the runtime serves. `AGENT_PRESENTATION_VERSION` becomes 5. The same HTML and catalog JSON are written to `apps/web/public/agent-templates/`. The four template ids stay. Withdrawn files stay deleted.

One shared archive block still builds the live headings for all four documents. 气血, 灵力, and 修为 use a read-only `<meter>` whose `value` and `max` are digit slots, with the old readable line kept beside it. 八维 is eight meters on `eightMax`. 会心伤害 and 护心 are digits under that grid. `fillAgentTemplate` splits a `now/max` line into the digit slots when those slots are blank or not digits, and trims a copied label off a figure, so a filler that still has `640/700` or `物攻 32` does not lose the bar. Agents that replace placeholders themselves write the digits. They still do not add CSS.

The public guides and the shorter runtime guides tell agents to discard a version 4 cache.

## Tasks

### Task 1

- Draw the meters, the eight grid, and the quieter 状态, 灵石, and 仙缘 marks in `agent-presentation.ts`.
- Point each new slot's hint at the state field it comes from.
- Publish the matching public HTML and `catalog.json`.
- Lock version 5, the meter markup, the fraction fallback, and the absence of choice UI in tests.

### Task 2

- Point registration and the template route tests at version 5.

### Task 3

- Update `skill.md`, `heartbeat.md`, `register.md`, and the runtime guides, including the worked dossier example.
- Point `AGENTS.md`, `README.md`, and the spec index at version 5. Mark version 4 superseded.

## Verification

- `node --import tsx --test packages/application/src/agent-presentation.test.ts packages/application/src/agent-registration.test.ts apps/world-do/src/routes.test.ts apps/web/src/pages/public-copy-cleanup.test.ts apps/web/deploy-config.test.ts`
- Open a filled dossier in a browser and read the bars, the eight grid, and an empty optional section.

## Doc Updates

- `docs/specs/agent-owner-presentation-v5/spec.md`
- `docs/plans/2026-10-19-agent-owner-presentation-v5.md`
- `docs/specs/agent-owner-presentation-v4/spec.md` (pointer only)
- `docs/specs/agent-owner-presentation-v3/spec.md` (pointer only)
- `docs/specs/agent-owner-presentation-v2/spec.md` (pointer only)
- `docs/specs/agent-owner-presentation-v1/spec.md` (pointer only)
- `docs/specs/README.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
- `apps/web/public/register.md`
- `apps/world-do/src/agent-guides.ts`
- `README.md`
- `AGENTS.md`

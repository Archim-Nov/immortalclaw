# ClawCity Gameplay Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the repository's source-of-truth docs and first-version implementation direction to the new ClawCity-aligned Immortal Claw gameplay baseline.

**Architecture:** This is a docs-first alignment pass. Treat `docs/specs/clawcity-gameplay-alignment/spec.md` as the new baseline, then review older product, scope, and subsystem docs against it. Preserve ClawCity's action/social/economic skeleton, keep OC/attributes/five-elements/realms as the custom combat-growth layer, and downgrade conflicting heavy systems to reference-only or deferred status.

**Tech Stack:** Markdown documentation in `docs/`, existing TypeScript prototype references in `apps/world-api` and `packages/domain`

---

### Task 1: Link the new baseline from top-level product docs

**Files:**
- Modify: `docs/product/vision.md`
- Review: `README.md`
- Review: `docs/specs/README.md`

**Step 1: Update the canonical references in `vision.md`**

- Add `docs/specs/clawcity-gameplay-alignment/spec.md` as the current gameplay-alignment baseline.
- Add one short sentence stating that Immortal Claw keeps the ClawCity gameplay skeleton and adds cultivation-specific combat-growth differentiation.

**Step 2: Review top-level entry docs for stale framing**

- Check whether `README.md` or `docs/specs/README.md` still imply that the repo is inventing a mostly original gameplay loop.
- If they do, patch them so they point readers toward the new alignment spec first.

**Step 3: Verify the top-level doc flow**

Run:

```powershell
Get-Content -Encoding utf8 docs/product/vision.md
```

Expected:

- The new ClawCity-alignment spec appears in canonical references.
- The product framing no longer reads like an unconstrained original-systems project.

### Task 2: Rescope the old gameplay draft around the new baseline

**Files:**
- Modify: `docs/immortal-realm-design.md`
- Modify: `docs/phase-1-first-version-plan.md`
- Modify: `docs/first-version-preview.md`

**Step 1: Patch `docs/immortal-realm-design.md`**

- Keep the ClawCity concept-mapping role of the file.
- Remove or reword any statements that merge unrelated ClawCity responsibilities together, especially:
  - `property` vs `business`
  - `skills` vs `realms`
  - `gang` vs heavy sect management
- Update the mappings so they follow:
  - `property -> 洞府`
  - `business -> 坊铺`
  - `market zone -> 坊市`
  - `journal/reflection -> 日志`

**Step 2: Patch `docs/phase-1-first-version-plan.md`**

- Reframe the first-version scope as:
  - ClawCity-style action/world loop retained
  - cultivation extensions added in combat/growth only
- Keep the first-version intentionally small.
- Explicitly call out that heavy sect-management and heavy onboarding are out of scope.

**Step 3: Patch `docs/first-version-preview.md`**

- Ensure the preview describes the prototype as a ClawCity-aligned loop rather than an original sandbox.
- Align player-facing terminology with the new naming baseline.

**Step 4: Verify doc consistency**

Run:

```powershell
git diff -- docs/immortal-realm-design.md docs/phase-1-first-version-plan.md docs/first-version-preview.md
```

Expected:

- No remaining wording that implies `property`, `business`, and `market zone` are the same thing.
- No wording that treats `realm` as a drop-in replacement for functional skills.

### Task 3: Reclassify subsystem docs into keep / adjust / defer

**Files:**
- Modify: `docs/specs/oc-cultivation-foundation/spec.md`
- Modify: `docs/specs/oc-cultivation-foundation/character-system.md`
- Modify: `docs/specs/oc-cultivation-foundation/five-element-and-spells.md`
- Modify: `docs/specs/oc-cultivation-foundation/player-attributes-and-realms/README.md`
- Modify: `docs/specs/oc-cultivation-foundation/player-attributes-and-realms/player-attributes.md`
- Modify: `docs/specs/oc-cultivation-foundation/player-attributes-and-realms/realms-and-breakthroughs.md`
- Modify: `docs/specs/oc-cultivation-foundation/sects-and-affiliations/README.md`
- Modify: `docs/specs/oc-cultivation-foundation/sects-and-affiliations/sect-foundations.md`

**Step 1: Keep the combat-growth differentiation docs**

- Preserve the docs that support:
  - OC
  - attributes
  - five elements
  - realms
- Reword them so they are explicitly framed as the custom combat-growth layer sitting on top of the ClawCity gameplay skeleton.

**Step 2: Downgrade sect-heavy content**

- Keep `sects-and-affiliations` as reference-only unless it can be cleanly reduced to gang-equivalent duties.
- Remove any implication that first version requires:
  - heavy role ladders
  - heavy inventory permissions
  - long-term sect management loops

**Step 3: Add keep / adjust / defer cues**

- In each relevant doc, clearly label whether the subsystem is:
  - retained for first version
  - retained but needs rewriting
  - deferred

**Step 4: Verify targeted wording**

Run:

```powershell
Select-String -Path docs/specs/oc-cultivation-foundation/**/*.md -Pattern "ClawCity|玩法骨架|参考方案|延后|gang|宗门"
```

Expected:

- The specs consistently describe OC/attributes/five-elements/realms as retained differentiators.
- Sect-heavy content is no longer presented as a first-version baseline.

### Task 4: Define implementation-facing feature entrances before code changes

**Files:**
- Review: `apps/world-api/src/server.ts`
- Review: `packages/domain/src/model.ts`
- Review: `packages/domain/src/engine.ts`
- Review: `packages/domain/src/seed.ts`
- Create: `docs/plans/2026-03-11-clawcity-gameplay-entrypoints.md`

**Step 1: Inventory the current prototype surfaces**

- Review the current API routes and domain entities.
- Record which current surfaces already match the new baseline and which still use old terminology or old assumptions.

**Step 2: Write an entrypoint note**

- Create a short follow-up plan note documenting:
  - state endpoints
  - action endpoints
  - social endpoints
  - sect endpoints
  - 洞府 / 坊铺 endpoints
  - 日志 endpoints
  - combat-growth data reads

**Step 3: Keep the feature families separate**

- Make sure `洞府`, `坊铺`, and `坊市` are treated as separate responsibilities.
- Make sure `skills` and `realms` are treated as separate systems.

**Step 4: Verify the handoff note**

Run:

```powershell
Get-Content -Encoding utf8 docs/plans/2026-03-11-clawcity-gameplay-entrypoints.md
```

Expected:

- The prototype has a clear, implementation-facing checklist before any code refactor begins.

### Task 5: Prepare the first code-alignment pass

**Files:**
- Review: `apps/world-api/src/server.ts`
- Review: `packages/domain/src/index.ts`
- Review: `packages/domain/src/model.ts`
- Review: `packages/domain/src/store.ts`
- Review: `packages/domain/src/seed.ts`

**Step 1: List terminology changes needed in code**

- Identify every place where first-version code or sample data should eventually align terminology with:
  - `洞府`
  - `坊铺`
  - `坊市`
  - `宗门`
  - `日志`

**Step 2: List structural changes needed in code**

- Identify which existing code paths assume:
  - no custom combat-growth layer
  - no distinction between skills and realms
  - no split between property and business equivalents

**Step 3: Record verification commands for the future implementation pass**

Prepare the commands that will be used once code changes begin, such as:

```powershell
pnpm test
pnpm --filter @immortal-claw/domain test
```

Expected:

- A future implementation session can start from a concrete code-alignment checklist instead of reopening product design questions.

## Verification

- `Get-Content -Encoding utf8 docs/product/vision.md`
- `Get-Content -Encoding utf8 docs/specs/clawcity-gameplay-alignment/spec.md`
- `git diff --stat`

## Doc Updates

- `docs/product/vision.md`
- `docs/immortal-realm-design.md`
- `docs/phase-1-first-version-plan.md`
- `docs/first-version-preview.md`
- `docs/specs/oc-cultivation-foundation/*`
- `docs/specs/clawcity-gameplay-alignment/spec.md`

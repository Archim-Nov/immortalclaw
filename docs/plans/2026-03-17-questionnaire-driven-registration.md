# Questionnaire-Driven Registration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make registration questionnaire-driven by exposing the canonical questions, requiring questionnaire completion during registration, and returning a richer registration profile.

**Architecture:** Move the questionnaire scoring logic from `scripts/lib` into a shared domain module, then let the runtime route derive canonical registration data from submitted answers before repository registration completes. Keep the existing canonical-record path for compatibility, but enforce that registration cannot complete without either answers or a full record. Extend the response contract with a richer profile packet built from the saved record and derived gameplay effects.

**Tech Stack:** TypeScript, Hono runtime worker, shared domain/persistence packages, Node test runner with `tsx`

---

### Task 1: Document The New Registration Contract

**Files:**
- Create: `docs/specs/questionnaire-driven-registration/spec.md`
- Create: `docs/plans/2026-03-17-questionnaire-driven-registration.md`

**Step 1: Record the approved behavior change**

Write the spec for:
- public questionnaire endpoint
- mandatory questionnaire completion for registration
- compatibility via canonical `record`
- richer `registrationProfile` response

**Step 2: Save the implementation plan**

Document the tasks below before production edits begin.

### Task 2: Write Runtime Contract Tests First

**Files:**
- Modify: `apps/runtime-worker/src/index.test.ts`
- Modify: `packages/contracts/src/runtime-api.ts`

**Step 1: Write failing tests for the questionnaire endpoint**

Add coverage for:
- `GET /agent/register/questions` returns version + 18 questions
- each question exposes 4 options

**Step 2: Write failing tests for mandatory questionnaire registration**

Add coverage for:
- registration fails when neither `answers` nor `record` is provided
- registration succeeds with questionnaire answers only
- registration response includes `registration`, `registrationEffects`, and `registrationProfile`

**Step 3: Run targeted runtime tests to verify RED**

Run: `node --import tsx --test apps/runtime-worker/src/index.test.ts`

Expected: new tests fail because the endpoint/contract does not exist yet.

### Task 3: Promote Questionnaire Logic Into The Domain Layer

**Files:**
- Create: `packages/domain/src/registration-questionnaire.ts`
- Modify: `packages/domain/src/model.ts`
- Modify: `packages/domain/src/runtime.ts`
- Modify: `packages/domain/src/index.ts` or existing export surface if needed
- Modify: `scripts/lib/questionnaire-registration.mjs`

**Step 1: Write failing domain tests**

Add coverage for:
- fetching the question bank
- deriving a canonical record from answers
- preserving existing fixture behavior

Suggested test file:
- Create or modify `packages/domain/src/registration-questionnaire.test.ts`

**Step 2: Implement the shared questionnaire module**

Move in:
- question ids
- prompts/options
- scoring tables
- answer-to-record derivation

Expose:
- questionnaire metadata getter
- answer derivation helper

**Step 3: Make smoke scripts consume the shared implementation**

Keep `scripts/lib/questionnaire-registration.mjs` as a thin wrapper or compatibility layer so smoke flows stay aligned with production behavior.

**Step 4: Run targeted domain tests to verify GREEN**

Run: `node --import tsx --test packages/domain/src/registration-questionnaire.test.ts packages/domain/src/engine.test.ts`

Expected: tests pass and fixture behavior remains stable.

### Task 4: Wire Questionnaire Registration Through Persistence And Runtime

**Files:**
- Modify: `packages/persistence/src/world-repository.ts`
- Modify: `packages/persistence/src/in-memory-world-repository.ts`
- Modify: `packages/persistence/src/supabase-world-repository.ts`
- Modify: `apps/runtime-worker/src/routes.ts`
- Modify: `apps/runtime-worker/src/agent-guides.ts`

**Step 1: Extend registration input types**

Add questionnaire-answer input to the registration contract while preserving the compatibility `record` path.

**Step 2: Implement runtime route behavior**

Add:
- `GET /agent/register/questions`
- registration validation requiring `answers` or `record`
- server-side derivation from `answers`

**Step 3: Build the richer response payload**

Return:
- `registration`
- `registrationEffects`
- `registrationProfile`

**Step 4: Keep persistence adapters aligned**

Repository registration should persist:
- derived record from answers, or
- supplied canonical record

### Task 5: Add Persistence And Smoke Coverage

**Files:**
- Modify: `packages/persistence/src/in-memory-world-repository.test.ts`
- Modify: `packages/persistence/src/supabase-world-repository.test.ts`
- Modify: `scripts/smoke-onboarding.mjs`
- Modify: `scripts/smoke-questionnaire-to-register.mjs`

**Step 1: Write failing repository tests**

Add coverage for:
- registration via questionnaire answers
- failure when questionnaire is missing

**Step 2: Update smoke scripts**

Make sure the smoke flows:
- can fetch questions if needed
- still derive answers and register successfully
- print the richer registration payload

**Step 3: Run targeted repository tests**

Run: `node --import tsx --test packages/persistence/src/in-memory-world-repository.test.ts packages/persistence/src/supabase-world-repository.test.ts`

Expected: pass with questionnaire-driven registration support.

### Task 6: Update Public Docs And Verify End-To-End

**Files:**
- Modify: `README.md`
- Modify: `docs/specs/unified-agent-registration/spec.md`
- Modify: `docs/plans/2026-03-13-unified-agent-registration.md`
- Modify: `apps/runtime-worker/src/agent-guides.ts`

**Step 1: Update onboarding documentation**

Describe:
- public questionnaire endpoint
- mandatory questionnaire completion
- richer registration response

**Step 2: Run verification**

Run:
- `node --import tsx --test apps/runtime-worker/src/index.test.ts`
- `node --import tsx --test packages/domain/src/registration-questionnaire.test.ts packages/domain/src/engine.test.ts`
- `node --import tsx --test packages/persistence/src/in-memory-world-repository.test.ts packages/persistence/src/supabase-world-repository.test.ts`
- `npm test`

Expected: all relevant tests pass.

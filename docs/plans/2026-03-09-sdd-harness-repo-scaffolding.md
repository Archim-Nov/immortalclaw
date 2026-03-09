# SDD and Harness Repo Scaffolding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add minimal, flexible repository scaffolding for spec-driven development and harness engineering, including agent guidance, process docs, templates, and placeholder harness structure.

**Architecture:** This is a documentation-first change. It introduces a small information architecture across `AGENTS.md`, `docs/`, and `harness/` so humans and agents share the same source-of-truth workflow. Existing roadmap and prototype docs remain intact and are complemented by new process-oriented materials.

**Tech Stack:** Markdown, existing TypeScript monorepo

---

### Task 1: Create repository guidance entrypoint

**Files:**
- Create: `AGENTS.md`
- Modify: `README.md`

**Step 1:** Add a short repo map.
**Step 2:** Describe the lightweight SDD workflow.
**Step 3:** Add the rule that agents must update necessary source-of-truth docs.
**Step 4:** Keep `README.md` developer-facing and link to the new process docs.

### Task 2: Add product and process docs

**Files:**
- Create: `docs/product/vision.md`
- Create: `docs/process/spec-driven-development.md`
- Create: `docs/process/harness-engineering.md`

**Step 1:** Write the stable product framing.
**Step 2:** Document the spec -> plan -> implementation flow.
**Step 3:** Define harness engineering in this repo as lightweight validation scaffolding.

### Task 3: Add reusable templates

**Files:**
- Create: `docs/templates/feature-spec.md`
- Create: `docs/templates/implementation-plan.md`
- Create: `docs/templates/harness-checklist.md`

**Step 1:** Add a spec template.
**Step 2:** Add a plan template.
**Step 3:** Add a harness checklist template.

### Task 4: Add harness directory scaffolding

**Files:**
- Create: `harness/README.md`
- Create: `harness/scenarios/.gitkeep`
- Create: `harness/fixtures/.gitkeep`
- Create: `harness/evals/.gitkeep`

**Step 1:** Document the purpose of the harness directory.
**Step 2:** Add placeholder subdirectories for future assets.

### Task 5: Verify and align repository references

**Files:**
- Review all newly created files and `README.md`

**Step 1:** Run `git diff --check`.
**Step 2:** Run `npm test`.
**Step 3:** Confirm all referenced paths exist.

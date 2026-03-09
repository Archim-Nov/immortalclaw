# Spec-Driven Development and Harness Setup Design

## Goal

Establish a minimal, flexible repository structure and workflow for spec-driven development and early harness engineering, without adding heavy enforcement or automation.

## Context

The repository already contains:

- a working prototype in `apps/world-api` and `packages/domain`
- phased roadmap documents in `docs/`
- a project design draft for the immortal realm setting

The new setup should layer on top of this existing material rather than replace it.

## Design Principles

- Keep process visible, but lightweight.
- Prefer conventions and templates over enforcement.
- Make repository documents the source of truth for product intent and delivery plans.
- Keep harness engineering explicit in the repo, even before adding automation.
- Require agents to keep source-of-truth files in sync with meaningful changes.

## Recommended Approach

Use a lightweight repo operating system:

- stable product context lives in `docs/product/`
- change-specific intent lives in `docs/specs/`
- implementation execution details live in `docs/plans/`
- contributor workflow guidance lives in `docs/process/`
- reusable document starters live in `docs/templates/`
- future validation assets live in `harness/`

This keeps the process understandable for both humans and agents without turning the repository into a high-ceremony system.

## Repository Structure

```text
AGENTS.md
docs/
  product/
  process/
  specs/
  plans/
  templates/
harness/
  scenarios/
  fixtures/
  evals/
```

## Workflow

1. Read `AGENTS.md`.
2. Create or update a spec in `docs/specs/` for meaningful changes.
3. Approve the spec before implementation.
4. Write an implementation plan in `docs/plans/`.
5. Implement the change.
6. Verify behavior.
7. Update all necessary source-of-truth files before considering the work complete.

## Agent Responsibilities

Agents should update the matching source-of-truth files when changes affect behavior, architecture, workflow, or validation expectations.

## Harness Engineering Positioning

Harness engineering in this first pass is process scaffolding, not a full executable framework.

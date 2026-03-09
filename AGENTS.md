# Immortal Claw Agent Guide

This file is the agent entrypoint for repository structure, process, and required document updates.

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
- `apps/world-api` and `packages/domain`: current runnable prototype

## Default Workflow

1. Read this file before starting work.
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

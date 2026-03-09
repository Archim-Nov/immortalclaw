# Spec-Driven Development

This repository uses a minimal, flexible spec-driven workflow.

## Default Flow

1. Start from `AGENTS.md`.
2. Write or update a spec in `docs/specs/` when the change is meaningful.
3. Get approval on the spec before implementation when behavior or direction is changing.
4. Write or update the implementation plan in `docs/plans/`.
5. Implement the change.
6. Run verification.
7. Update any source-of-truth files affected by the work.

## When to Write a Spec

Write a spec when the change affects:
- gameplay or product behavior
- APIs or architecture
- repository structure or contributor workflow
- validation or harness expectations

You can skip a full spec for a very small, local fix that does not change expected behavior. If the repo's understanding changes, the relevant docs still need to be updated.

## What a Spec Should Cover

A lightweight spec should capture:
- the problem being solved
- the goals and non-goals
- the expected behavior
- constraints and risks
- acceptance criteria
- open questions

## Relationship to Plans

Specs describe intent.
Plans describe how to implement approved intent.

Implementation plans belong in `docs/plans/` and should point back to the spec they execute.

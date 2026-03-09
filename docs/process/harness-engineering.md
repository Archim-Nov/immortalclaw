# Harness Engineering

This repository treats harness engineering as the work of making validation explicit, legible, and versioned for both humans and agents.

## What It Means Here

In this repo, harness engineering is not yet a heavy automation project. The first phase is to make these things clear and durable in the repository:

- which scenarios matter
- what setup those scenarios require
- what actions should be run
- what outcomes or invariants should be checked
- where future fixtures and evals should live

## Why Start Light

The project is still validating its core simulation loop. A lightweight harness layer keeps the repository ready for future evaluation work without overcommitting to tooling before the workflows are stable.

## Repository Layout

- `harness/scenarios/`: scenario definitions and walkthroughs
- `harness/fixtures/`: reusable state, payloads, or sample inputs
- `harness/evals/`: future automated evaluation assets
- `docs/templates/harness-checklist.md`: the lightweight starting point for capturing validation intent

## Relationship to Specs

Specs define the behavior we want.
Harness materials define how we will exercise and check that behavior.

Start with a checklist. Promote repeated manual checks into fixtures or evals only when that investment becomes worthwhile.

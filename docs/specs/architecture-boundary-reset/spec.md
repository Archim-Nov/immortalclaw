# Architecture Boundary Reset

## Summary

Re-establish clean responsibilities across the runtime stack so the repository has one official production architecture and clear boundaries between transport, workflow orchestration, persistence, and world rules.

## Problem

The current repository contains the right building blocks, but the boundaries are blurred:

1. `apps/runtime-worker/src/routes.ts` mixes HTTP concerns with workflow orchestration and direct domain access.
2. `packages/application` is too thin to serve as the main workflow layer.
3. `packages/persistence` currently performs some business decisions instead of staying storage-focused.
4. `packages/domain` still carries product-facing baggage that outer layers can reach into too easily.
5. `apps/world-api` and `apps/world-worker` remain in the tree, keeping a parallel legacy architecture mentally alive.

## Goals

- define one official runtime path:
  - `apps/web`
  - `apps/runtime-worker`
  - `packages/application`
  - `packages/persistence`
  - `packages/domain`
- classify `apps/world-api` and `apps/world-worker` as legacy harnesses only
- move registration, onboarding, and agent orchestration flows out of `routes.ts` into `packages/application`
- reduce `packages/persistence` to storage, transaction, and concurrency responsibilities
- keep `packages/domain` focused on world rules and state transitions
- make compatibility and legacy seams explicit instead of implicit

## Non-Goals

- rewriting the whole gameplay engine in one change
- deleting all legacy code immediately
- redesigning product features unrelated to architecture boundaries
- changing core gameplay rules just to satisfy layering

## User-Visible Behavior

This change is primarily architectural. User-visible behavior should stay stable while the codebase becomes easier to reason about.

Some developer-facing behavior should change:

- repo docs should identify one official production path
- legacy harness apps should be documented as legacy only
- new workflow code should be added to `packages/application`, not directly into `routes.ts`

## Requirements

### Repository Architecture

- document one official production runtime path
- label legacy harness apps as outside the product architecture
- avoid introducing new product logic into legacy apps

### Runtime Worker

- `routes.ts` should focus on:
  - request parsing
  - authentication
  - calling application use cases
  - formatting HTTP responses
- registration/onboarding/agent flow composition should move toward application use cases

### Application Layer

- add explicit use cases for workflow-heavy runtime behavior
- application should coordinate repository and domain calls
- application should become the main home for agent-facing orchestration

### Persistence Layer

- repositories should expose storage-focused operations
- repositories may enforce transaction and concurrency boundaries
- repositories should not own product workflow decisions

### Domain Layer

- domain should keep simulation and world-rule logic
- domain should not absorb HTTP concerns
- domain should not become the default place for temporary product-history helpers

### Documentation

- add an architecture design doc
- add a phased implementation plan
- add a spec capturing the new boundary rules

## Acceptance Criteria

- the repo contains a documented architecture reset design and implementation plan
- the repo contains an architecture spec that defines official vs legacy paths
- future implementation work can use the docs to move runtime workflows from `routes.ts` into `packages/application`
- the migration strategy is phased so gameplay behavior can remain stable during the refactor

## Follow-Up Work

Implementation should proceed in phases:

1. document official and legacy paths
2. extract registration/onboarding/agent use cases into application
3. reduce repository business logic
4. narrow the domain export surface
5. fence or retire legacy harness apps


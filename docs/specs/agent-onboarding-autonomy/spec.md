# Agent Onboarding Autonomy Contract

## Summary

Make onboarding an explicitly optional guidance layer in the runtime contract.

An Agent should be able to follow the beginner path, ignore it and explore freely, or obey a direct owner command, while still treating runtime safety warnings as the highest in-world constraint.

## Problem

The current world already supports free action choice, but the API does not state that clearly enough:

- `onboarding.nextAction` looks compulsory
- `onboarding`, `agentGuidance`, and `strategy` do not explain their priority relationship
- owner-command overrides exist only as product intent, not as protocol wording
- one onboarding step currently has mismatched hint and action guidance

For an agent-first game, that is a contract problem. The Agent needs the runtime to say what is advisory versus what is urgent.

## Goals

- make onboarding explicitly advisory
- make free exploration explicitly allowed
- make the priority order between owner intent, safety guidance, strategy, and onboarding explicit
- preserve backward compatibility by using additive contract changes
- fix the onboarding hint/action mismatch
- sync public docs with the runtime semantics

## Non-Goals

- building a separate owner-command system
- changing which actions are valid in the world
- turning onboarding into a hard mode selector
- redesigning the current beginner content itself

## User-Visible Behavior

- `GET /agent/state` returns onboarding data that clearly says the tutorial is optional
- `GET /agent/state` returns a decision-policy object that explains how to prioritize commands and suggestions
- `GET /agent/strategy` returns the same decision-policy contract
- when safety warnings exist, they are treated as higher priority than onboarding recommendations
- when the Agent has no urgent warning and wants to roam, it may choose any valid action from `GET /agent/actions`
- onboarding hint text and recommended action now point at the same safe beginner step

## Requirements

### Domain Contract

- add a shared runtime view type for decision policy
- expose that policy through both `CultivatorStateView` and `StrategySnapshot`
- extend onboarding progress with explicit advisory semantics
- keep `nextAction` for compatibility, but clarify in the contract that it is recommended-only

### Policy Semantics

The contract must communicate this priority order:

1. explicit owner command
2. urgent safety and recovery constraints
3. runtime strategy and tactical guidance
4. onboarding recommendation
5. free exploration with any current valid action

The policy wording should stay simple enough for agents and human readers.

### Onboarding Semantics

- onboarding remains soft and skippable
- onboarding never blocks access to the rest of the action system
- onboarding wording must not imply a forced lock when no such lock exists
- `first-residence` hint/action mismatch must be resolved

### Documentation

- update public docs to explain that onboarding is a soft recommendation
- update runtime-generated guide markdown to describe the same priority order
- update any related source-of-truth docs that still imply a more rigid tutorial path

## Acceptance Criteria

- state payload includes an explicit decision-policy object
- strategy payload includes the same decision-policy object
- onboarding payload includes explicit advisory semantics
- onboarding hint and action guidance are consistent for the same step
- tests cover optional onboarding and the decision-policy contract
- public docs and runtime-generated docs describe onboarding as a soft guide rather than a hard lock

## Open Questions

- none

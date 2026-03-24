# Agent Onboarding Doc Redesign

## Goal

Redesign the public agent onboarding docs so they are optimized for AI agents, not human readers, while preserving the OC questionnaire and the one-time registration credential.

## Problem

The current onboarding surface has three issues:

- the main registration path is not singular enough for agents
- static Pages docs and runtime-generated docs do not teach the same flow
- compatibility details and large record examples appear too early, which raises ambiguity and token cost

For an agent-first game, the problem is not "friendly wording." The problem is protocol ambiguity.

## Design

### Primary Registration Path

Make the questionnaire-first flow the single recommended path:

1. `GET /agent/register/questions`
2. `POST /agent/register` with `answers`
3. save `agentId` and `credential`
4. verify with `GET /agent/state`
5. continue with `heartbeat.md`

This keeps the test-question flow as part of identity formation instead of treating it as an optional side path.

### Compatibility Path

Keep canonical `record` support, but move it behind the primary flow.

- If an agent already has a canonical OC `registration_record`, it may send `record` instead of `answers`.
- If the record is produced later, it may still use `POST /agent/registration`.

This preserves compatibility without letting the compatibility path compete with the recommended path.

### Documentation Structure

`register.md` should follow a ClawCity-style shape:

1. one recommended bootstrap path
2. minimal successful request example
3. credential persistence example
4. verification example
5. what to do next
6. compatibility appendix

`skill.md` should state the same bootstrap order in short form.

`heartbeat.md` should assume registration is already complete and should no longer describe messages as system-only if direct agent messaging exists.

### Runtime Consistency

The runtime-generated markdown routes must use the same protocol wording as the static Pages docs:

- questionnaire-first bootstrap
- credential shown once and must be saved
- `record` is supported but not the main path

The runtime docs can stay shorter than the static docs, but they must not teach a different flow.

## Scope

In scope:

- `apps/web/public/register.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
- `apps/world-do/src/agent-guides.ts`
- any directly affected source-of-truth docs that describe the public onboarding flow

Out of scope:

- API behavior changes
- questionnaire scoring changes
- plugin behavior changes
- recovery or credential reset redesign

## Acceptance Criteria

- `register.md` clearly presents only one recommended bootstrap flow
- the recommended flow starts with `GET /agent/register/questions`
- the docs explicitly preserve the questionnaire as the normal identity-forming path
- the docs explicitly tell agents to save the one-time credential
- static docs and runtime-generated docs no longer disagree about the onboarding order

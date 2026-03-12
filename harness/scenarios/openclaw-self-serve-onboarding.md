# OpenClaw Self-Serve Onboarding

## Purpose

Validate the hosted flow where an OpenClaw agent can connect to the deployed worker without the legacy local API.

## Preconditions

- `apps/runtime-worker` is deployed
- the worker has run `supabase/migrations/20260311_agent_onboarding_schema.sql`
- the worker has run `supabase/migrations/20260312_agent_credential_hash_cleanup.sql`
- `IDENTITY.md` and `SOUL.md` exist in the OpenClaw workspace
- the OpenClaw plugin points at the hosted `worldBaseUrl`

## Steps

1. Request `GET /skill.md`
2. Request `GET /register.md`
3. Call `POST /agent/register`
4. Save the returned `credential`
5. Call `POST /agent/sync-persona`
6. Call `GET /agent/state`
7. Call `GET /agent/actions`
8. Call `POST /agent/act`

## Expected Result

- registration returns `agentId`, `credential`, and `selectedCultivatorId`
- persona sync returns the same `selectedCultivatorId`
- authenticated state resolves the bound cultivator
- authenticated actions return at least one playable action
- action execution succeeds with a real `actionId`

## Regression Notes

- if `/agent/register` is unavailable, the OpenClaw plugin should fall back to legacy `/agent/sync-persona` plus `/cultivator/*`
- bearer-authenticated `/agent/*` routes should return `401` when the credential is missing or invalid

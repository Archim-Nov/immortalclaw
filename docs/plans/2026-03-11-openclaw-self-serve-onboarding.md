# 2026-03-11 OpenClaw Self-Serve Onboarding Plan

## Scope

Implement the minimum hosted onboarding path so OpenClaw can attach to the deployed worker and continue an identity-bound cultivator without the legacy local API.

## Steps

1. Extend `WorldRepository` plus the in-memory and Supabase adapters with:
   - agent registration
   - API key authentication
   - persona sync
   - registration record persistence helpers
2. Expand `apps/runtime-worker` routes with:
   - public markdown docs
   - `POST /agent/register`
   - authenticated `/agent/*` endpoints
   - legacy compatibility routes
3. Update the OpenClaw plugin so it:
   - reads persona files
   - caches credentials locally
   - auto-registers on first use
   - retries via new credentials when needed
   - falls back to legacy routes when the new worker endpoints are missing
4. Add a Pages same-origin runtime gateway:
   - proxy `/skill.md`, `/register.md`, `/heartbeat.md`, `/agent/*`, `/cultivator/*`, `/world/*`, and `/health`
   - expose `/skill.md` discovery hints from the root HTML
5. Add or update tests for:
   - worker onboarding docs and auth flow
   - Supabase repository registration/auth flow
   - plugin auto-registration and fallback behavior
   - Pages gateway discovery and proxy config
6. Sync repo docs:
   - root `README.md`
   - `docs/openclaw-agent-setup.md`
   - plugin README
   - harness scenario docs

## Verification

- `cmd /c node --import tsx --test packages\\openclaw-immortal-plugin\\index.test.ts`
- `cmd /c node --import tsx --test packages\\persistence\\src\\supabase-world-repository.test.ts`
- `cmd /c node --import tsx --test apps\\runtime-worker\\src\\index.test.ts apps\\runtime-worker\\src\\middleware.test.ts`
- `cmd /c npm test`
- `cmd /c npm run build`

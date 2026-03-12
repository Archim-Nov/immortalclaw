# Unified Agent Registration Plan

## Spec Reference

- `docs/specs/unified-agent-registration/spec.md`

## Implementation Steps

1. Extend the registration input contract so `POST /agent/register` and `WorldRepository.registerAgent()` can accept an optional canonical `registration_record`.
2. Update the in-memory and Supabase repository adapters so the registration record is saved onto the bound cultivator during the same registration transaction path.
3. Expand the runtime registration response to include `registration` and `registrationEffects`, using the resulting bound cultivator state as the confirmation surface.
4. Add focused runtime and persistence tests for:
   - persona-only registration compatibility
   - single-call registration plus canonical record save
   - immediate registration-derived state surfacing after bootstrap
5. Extend the OpenClaw plugin so first-time auto-registration can include a locally available canonical `registration_record`, and keep that local file in sync after `immortal_registration_save`.
6. Update hosted onboarding docs, plugin docs, and public markdown guides so they describe the single-call bootstrap path first while preserving delayed `POST /agent/registration` as a supported fallback.

## Verification

- `node --import tsx --test apps/runtime-worker/src/index.test.ts packages/persistence/src/supabase-world-repository.test.ts`
- `node --import tsx --test packages/domain/src/engine.test.ts`
- `node --import tsx --test packages/openclaw-immortal-plugin/index.test.ts`
- `npm run build`

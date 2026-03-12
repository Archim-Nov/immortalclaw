# Public Agent Directory Plan

## Spec Reference

- `docs/specs/public-agent-directory/spec.md`

## Implementation Steps

1. Extend `WorldRepository` and both repository adapters with a `listAgentProfiles()` method so the runtime can enumerate registered agents without mixing in seeded NPC cultivators.
2. Add `GET /world/agents` to `apps/runtime-worker`, combining registered agent profiles with bound cultivator state from the world snapshot.
3. Add targeted runtime and persistence tests that prove registered agents appear in the new public directory.
4. Replace the premium landing Agents tab demo cards with a runtime-backed container and client-side fetch logic that renders loading, empty, error, and success states.
5. Add a focused frontend test around the generated live-agent markup and update repository docs that describe public runtime capabilities.

## Verification

- `node --import tsx --test apps/runtime-worker/src/index.test.ts packages/persistence/src/supabase-world-repository.test.ts apps/web/src/pages/home-page.test.ts`
- `npm run build`
- manual `GET /world/agents` request after registering an agent
- manual browser check that the Agents tab shows the registered agent

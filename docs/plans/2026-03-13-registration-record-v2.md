# Registration Record V2 Plan

## Spec Reference

- `docs/specs/registration-record-v2/spec.md`

## Implementation Steps

1. Extend the domain registration types with stable taxonomy IDs and a label locale while keeping current label fields for compatibility.
2. Add a shared registration taxonomy utility that:
   - resolves labels to IDs for v1 compatibility
   - derives fallback labels from IDs and locale for v2
   - derives behavior-aspect and spirit-root IDs from five-element scores when needed
3. Update registration validation and gameplay modifier logic to normalize records and branch on IDs instead of localized substrings.
4. Expand runtime and repository tests to cover:
   - existing v1 English label-only payloads
   - v2 ID-first payloads with generated labels
   - state views surfacing both IDs and labels
5. Update local smoke scripts to emit v2 records by default.
6. Update public onboarding docs, OpenClaw setup docs, README examples, and the OC foundation record description so they recommend v2 and document v1 compatibility.

## Verification

- `node --import tsx --test packages/domain/src/engine.test.ts`
- `node --import tsx --test packages/persistence/src/in-memory-world-repository.test.ts`
- `node --import tsx --test packages/persistence/src/supabase-world-repository.test.ts`
- `node --import tsx --test apps/runtime-worker/src/index.test.ts`
- `npm run smoke:onboarding`
- `npm run smoke:questionnaire-to-register`
- `npm run build`

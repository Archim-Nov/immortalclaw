# Premium Landing Alignment Plan

## Spec Reference

- `docs/specs/premium-landing-alignment/spec.md`

## Implementation Steps

1. Copy the premium demo background art into `apps/web/public/assets/premium-landing/` so the page can load deployable image URLs.
2. Replace the current `HomePage` implementation with a demo-aligned landing component that preserves the demo markup, tab set, and content.
3. Reintroduce the previously shipped onboarding and playable-loop guidance as dashboard support sections placed after the hero and quick actions.
4. Port the premium demo styles into the web app, keeping the desktop layout visually aligned while adding minimal responsive handling for smaller screens.
5. Recreate the demo interaction logic in React for:
   - tab switching
   - active background layers
   - particle-canvas animation
   - messages-tab scroll positioning
6. Hide the AppShell language switcher on the premium landing route so the rendered page matches the demo structure.
7. Update landing tests and README references to reflect the new premium landing experience.

## Verification

- `npm test`
- `npm run build`
- manual visual comparison of `/` against `demo-landing-tabs-premium.html`

# Web SPA i18n Spec

## Summary

Add client-side internationalization to the React SPA in `apps/web/src` with English and Simplified Chinese, browser-language detection, and a manual language toggle that persists locally.

## Problem

The current web SPA hardcodes English copy throughout the landing experience. That prevents the frontend from serving Chinese-speaking users without duplicating components or introducing ad hoc string branching.

## Goals

- Render the React SPA in English and Simplified Chinese.
- Default the first visit from the browser language, choosing Simplified Chinese for `zh-*` and English otherwise.
- Let users switch languages manually and persist that choice in local state and `localStorage`.
- Keep the URL unchanged and avoid backend or static asset coupling.

## Non-Goals

- Translating the static onboarding markdown assets in `apps/web/public`.
- Translating backend responses, runtime data, or API payloads.
- Introducing a third-party i18n library in this first pass.

## User-Visible Behavior

On first load, the SPA chooses Simplified Chinese when the browser language begins with `zh`; otherwise it chooses English. A visible language toggle lets the user switch between English and Simplified Chinese. Once changed, the selection persists locally and applies when the user revisits the SPA or moves across client routes.

## Constraints

- Scope is limited to the React SPA under `apps/web/src`.
- Locale state must live in client state and local storage only, not the URL.
- The implementation should centralize copy in a typed message catalog instead of scattering string conditionals across components.
- English should act as the fallback locale for missing keys.

## Acceptance Criteria

- The SPA renders English and Simplified Chinese copy without changing routes or query parameters.
- `navigator.language` values matching `zh-*` default to Simplified Chinese when no persisted locale exists.
- A user-selected locale stored in `localStorage` overrides browser detection on later visits.
- A visible toggle changes the rendered copy without a full page reload.
- Automated tests cover locale detection, persisted override behavior, and translated rendering.

## Open Questions

- None for this first pass.

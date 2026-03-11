# Web SPA i18n Design

## Context

The current Cloudflare Pages SPA in `apps/web/src` renders a single landing experience with hardcoded English copy. The first internationalization pass only needs to cover this React surface, not the static onboarding markdown or runtime APIs.

## Scope

- Add English and Simplified Chinese locale support to the React SPA.
- Detect the initial locale from the browser language.
- Provide a manual language toggle that persists in `localStorage`.
- Keep locale state out of the URL and out of backend requests.

## Approach

Use a lightweight in-repo i18n layer instead of a third-party library. The layer will define:

- a `Locale` type for `en` and `zh-CN`
- an English-default message catalog keyed by stable ids
- locale resolution helpers for browser detection and persisted values
- a React provider and hook exposing `locale`, `setLocale`, and translated message access

`main.tsx` will wrap the app router with the provider. On startup, the provider will resolve the active locale from persisted storage first, then fall back to browser detection. The user can switch locales through a SPA-wide toggle in the shared shell. The provider will update `localStorage` when the locale changes.

## Rendering Strategy

The current landing page contains all user-facing copy in arrays and inline strings. That copy will move into the i18n message catalog so the component tree renders from translated data rather than mixed string pairs. The language toggle will live in the app shell so it remains visible on all client routes.

English remains the fallback source for missing translations. The first pass will not attempt interpolation-heavy formatting or pluralization because the current page does not need it.

## Testing Strategy

Use test-first coverage for:

- locale resolution from `navigator.language`
- persisted locale overriding browser detection
- translated rendering for both English and Simplified Chinese
- language toggle interactions updating rendered copy and persistence

The implementation stays small enough to verify through existing Node test infrastructure without bringing in browser automation.

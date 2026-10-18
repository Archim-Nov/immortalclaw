# Implementation Plan

## Linked Spec

- `docs/specs/spectator-static-homepage/spec.md`

## Goal

Put the approved static 修仙观览 in the repo and make the VPS publish path keep it.

## Architecture

`apps/spectator` is a file site, not a workspace package. `npm run build:spectator` copies the four public files into `dist/spectator`. `deploy/sync-web-root.sh` copies that site into the nginx root from `apps/spectator` by default, then copies the agent markdown and template pack from `apps/web/public`. A Vite `index.html` is rejected so the old `apps/web/dist` argument cannot put the SPA back.

## Tasks

### Sources

- Add `apps/spectator/index.html`, `styles.css`, `app.js`, and `jiuzhou-ink-wash.png`.
- Add `scripts/build-spectator.mjs` and `build:spectator` on the root package.

### Publish

- Replace the body of `deploy/sync-web-root.sh`.
- Point `deploy/README.md` and the nginx site comment at this homepage.
- Note the split in `README.md` and `AGENTS.md`.

### Verification

- `node --import tsx --test --test-name-pattern "spectator homepage" apps/web/deploy-config.test.ts`
- Run the sync script into a temp directory and confirm the Vite dist is refused.

## Doc Updates

- `deploy/README.md`
- `deploy/nginx/immortalclaw.conf`
- `README.md`
- `AGENTS.md`
- `docs/specs/spectator-static-homepage/spec.md`

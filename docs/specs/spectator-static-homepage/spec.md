# Spectator Static Homepage

## Summary

The self-hosted site at `/var/www/immortalclaw` serves the static 修仙观览 in `apps/spectator`. The Vite app in `apps/web` stays in the repo for Cloudflare Pages. Publishing the VPS no longer copies that SPA over the homepage.

## Problem

The approved 观览 page is already what visitors see on the VPS, but the files were copied onto the machine by hand. The documented upgrade still runs `npm run build:web` and `deploy/sync-web-root.sh` against `apps/web/dist`, which replaces `index.html` with the old Vite shell.

## Goals

- Keep the live spectator sources in git under `apps/spectator`: `index.html`, `styles.css`, `app.js`, and `jiuzhou-ink-wash.png`.
- Make the VPS publish step install that page as `/`.
- Keep copying `skill.md`, `register.md`, `heartbeat.md`, and `agent-templates/` from `apps/web/public`.
- Keep the OpenClaw discovery tags on the spectator `index.html`.
- Leave `apps/web` in place, and say clearly that it is no longer the VPS homepage.

## Non-Goals

- Wiring the spectator page to `GET /world/agents` or any other live API.
- Removing the Vite app, the control center, or the Cloudflare Pages path.
- Changing 归虚 or other gameplay.
- Removing `/skill.md`, `/register.md`, `/heartbeat.md`, or the owner-page pack.

## User-Visible Behavior

- A visitor opening the VPS origin sees the Chinese 观览: map, roster, dossier, and the other卷册. The footer still says the figures are a demo.
- `/skill.md`, `/register.md`, and `/heartbeat.md` stay on the origin. Nginx still proxies those three paths to the Node backend. The same files are also placed on disk from `apps/web/public`.
- `/agent-templates/` is still the static pack. `dungeon-wake`, `progress-summary`, and `gift-notice` stay 404.
- The homepage HTML still advertises the three markdown URLs for agent discovery.

## Constraints

- The spectator page is the exact static demo already approved. This change does not restyle it or translate it.
- `npm run build:spectator` only copies the four site files into `dist/spectator`.
- `deploy/sync-web-root.sh` reads `apps/spectator` by default. If the directory it is given still contains the Vite shell (`id="root"`), it exits without copying.

## Acceptance Criteria

- `apps/spectator` contains the four live files, and `index.html` includes `openclaw-skill-url`, `openclaw-register-url`, and `openclaw-heartbeat-url`.
- `npm run build:spectator` writes those four files to `dist/spectator`.
- `deploy/sync-web-root.sh <web-root>` copies the spectator files plus `skill.md`, `register.md`, `heartbeat.md`, and `agent-templates/`, and deletes the three withdrawn template pages if they are present.
- The same script refuses `apps/web/dist`.
- `deploy/README.md` tells the next upgrade to publish the spectator page instead of the Vite dist.

## Open Questions

- None. Live world data can replace the demo roster in a later change.

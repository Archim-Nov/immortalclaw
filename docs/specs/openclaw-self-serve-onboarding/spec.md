# OpenClaw Self-Serve Onboarding

## Summary

Make the deployed runtime usable by OpenClaw without a local SQLite harness. An OpenClaw agent should be able to register itself against the hosted worker, receive a server-issued UUID `agentId` plus a bearer credential, bind its `IDENTITY.md` and `SOUL.md` persona to a single cultivator, and continue play across restarts.

## Problem

The project already has a playable cultivation loop and a custom OpenClaw plugin, but the hosted worker does not expose the endpoints needed for self-serve onboarding. The old local `apps/world-api` harness has persona sync and other read routes, while the worker only exposed basic state and action endpoints. This blocks a ClawCity-style flow where a user points OpenClaw at one URL and starts playing.

## Goals

- expose public onboarding docs from the worker
- support `POST /agent/register` with server-issued UUID agent ids and durable bearer credentials
- support authenticated `/agent/*` routes for state, actions, messages, events, strategy, tribulation, sect, dao logs, registration, action execution, and manual tick
- support `POST /agent/credential/reset` for in-session credential rotation
- keep legacy `/cultivator/*`, `/agent/sync-persona`, and `/world/tick` compatibility for local harnesses and migration
- make the OpenClaw plugin auto-register, cache credentials, and reuse them on later runs while treating plugin `agentId` as a local lookup key instead of a server identity selector
- make the Pages domain act as a single public entrypoint by serving `/skill.md`, `/register.md`, and `/heartbeat.md` directly and proxying runtime routes

## Non-Goals

- a full multi-agent social web frontend
- npm publishing or marketplace distribution of the plugin
- heartbeat automation inside this repo beyond docs and API support
- lost-credential recovery without the current bearer credential

## Requirements

### Worker API

- add `GET /skill.md`
- add `GET /register.md`
- add `GET /heartbeat.md`
- add `POST /agent/register`
- add `POST /agent/credential/reset`
- add bearer-authenticated `/agent/*` endpoints
- keep `/cultivator/*` and `/world/tick` routes working

### Persistence

- introduce durable agent profiles
- introduce durable agent credentials keyed by hashed bearer credential
- track `last_seen_at`

### Plugin

- read `IDENTITY.md` and `SOUL.md`
- auto-register on first run if no cached credential exists
- cache credentials in a local `credentials.json`
- persist the server-issued UUID `agentId` returned by registration
- prefer authenticated `/agent/*` routes
- treat configured plugin `agentId` only as a stable local cache key
- fall back to legacy `/agent/sync-persona` plus `/cultivator/*` if `/agent/register` is unavailable

### Same-Origin Gateway

- the Pages deployment should serve static onboarding docs at:
  - `/skill.md`
  - `/register.md`
  - `/heartbeat.md`
- the Pages deployment should proxy:
  - `/health`
  - `/agent/*`
  - `/cultivator/*`
  - `/world/*`
- the root HTML should expose machine-readable references to `/skill.md` so non-browser agents can discover the entrypoint from the site URL alone

## Validation

- worker tests cover onboarding docs, credential reset, and authenticated agent routes
- persistence tests cover agent registration and authentication
- plugin tests cover auto-registration, credential reuse, invalid-credential handling without implicit re-registration, and legacy fallback

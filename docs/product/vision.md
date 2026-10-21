# Immortal Claw Vision

Immortal Claw is a persistent cultivation-world simulation built to explore whether a structured, tick-driven world can support long-running agent play.

The repository is still an early-stage prototype. The self-hosted option uses `apps/server` with SQLite for both world state and authentication, plus a static spectator homepage containing demo data. The Cloudflare option uses Pages for the SPA, a Worker and Durable Object SQLite for world state, and Supabase only for authentication. Both use the shared gameplay and application packages. The immediate focus is proving the core gameplay loop, persistent state, and agent onboarding. See the [quickstart](../quickstart.md), [VPS guide](../../deploy/README.md), and [deployment evidence](../community/deployment-case.md).

## Canonical Design References

- ClawCity gameplay-alignment baseline: `docs/specs/clawcity-gameplay-alignment/spec.md`
- Gameplay build foundation: `docs/specs/gameplay-build-foundation/spec.md`
- Combat deliverable baseline: `docs/specs/combat-gameplay-v1/spec.md`
- Combat registration-weight table: `docs/specs/combat-gameplay-v1/registration-action-weight-table.md`
- Gameplay event-pool support doc: `docs/specs/gameplay-build-foundation/event-pool-foundation.md`
- Detailed world and mechanics draft: `docs/immortal-realm-design.md`
- First-version scope and roadmap: `docs/phase-1-first-version-plan.md`, `docs/phase-2-enhanced-plan.md`, `docs/phase-3-full-version-plan.md`
- OpenClaw integration notes: `packages/openclaw-immortal-plugin/README.md`
- Deployment architecture spec: `docs/specs/deployment-platform/spec.md`
- Deployment design and plan: `docs/plans/2026-03-10-vercel-workers-supabase-design.md`, `docs/plans/2026-03-10-deployment-platform-implementation.md`

## Product Direction

The product direction for this repository is:

- preserve the ClawCity gameplay skeleton for world actions, social play, organizations, assets, and logs
- add cultivation-specific differentiation through OC, attributes, five elements, realms, and combat extensions
- support two organization paths: low-friction neutral sects and high-commitment player sects with explicit founding and approval rules
- let cultivators accumulate a personal righteous/demonic direction through organization behavior and explicit binary event choices
- keep the world model explicit and executable
- make actions resolve through rules and ticks rather than ad hoc scripts
- preserve room for agent integration through stable interfaces
- centralize durable world state instead of relying on runtime-local files in production
- separate the web shell from the simulation runtime without duplicating business logic
- let visitors watch the realm without an account. The public page is a spectator stage. Agents still act through their own credentials
- evolve the repo with lightweight, versioned specs and plans
- treat future harness assets as first-class repository artifacts

This file is the stable product framing. Change-specific intent should live in `docs/specs/`.

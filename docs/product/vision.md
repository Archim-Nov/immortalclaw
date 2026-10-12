# Immortal Claw Vision

Immortal Claw is a persistent cultivation-world simulation built to explore whether a structured, tick-driven world can support long-running agent play.

The repository is still an early-stage prototype. Production is self-hosted on a Singapore VPS: Apache serves the web shell and proxies the API to `apps/server`, and the world plus agent credentials live in a local SQLite file. The public site is `https://claw.archim.top`. The immediate focus is to keep proving the core gameplay loop and the world-state model on that host before introducing heavier agent orchestration or richer world systems. `apps/runtime-worker` and `apps/world-do` remain in the tree as an alternate Cloudflare path.

## Canonical Design References

- ClawCity gameplay-alignment baseline: `docs/specs/clawcity-gameplay-alignment/spec.md`
- Gameplay build foundation: `docs/specs/gameplay-build-foundation/spec.md`
- Combat deliverable baseline: `docs/specs/combat-gameplay-v1/spec.md`
- Combat registration-weight table: `docs/specs/combat-gameplay-v1/registration-action-weight-table.md`
- Gameplay event-pool support doc: `docs/specs/gameplay-build-foundation/event-pool-foundation.md`
- Detailed world and mechanics draft: `docs/immortal-realm-design.md`
- First-version scope and roadmap: `docs/phase-1-first-version-plan.md`, `docs/phase-2-enhanced-plan.md`, `docs/phase-3-full-version-plan.md`
- OpenClaw plugin: `packages/openclaw-immortal-plugin/README.md`
- Current production deploy: `deploy/README.md`, `docs/process/deployment-guide.md`
- Historical Cloudflare migration specs: `docs/specs/deployment-platform/spec.md`, `docs/specs/durable-object-migration/spec.md`

## Product Direction

The product direction for this repository is:

- preserve the ClawCity gameplay skeleton for world actions, social play, organizations, assets, and logs
- add cultivation-specific differentiation through OC, attributes, five elements, realms, and combat extensions
- support two organization paths: low-friction neutral sects and high-commitment player sects with explicit founding and approval rules
- let cultivators accumulate a personal righteous/demonic direction through organization behavior and explicit binary event choices
- keep the world model explicit and executable
- make actions resolve through rules and ticks rather than ad hoc scripts
- preserve room for agent integration through stable interfaces
- keep durable world state in the production SQLite file on the Singapore VPS, so every API call and tick sees the same world
- separate the web shell from the simulation runtime without duplicating business logic
- evolve the repo with lightweight, versioned specs and plans
- treat future harness assets as first-class repository artifacts

This file is the stable product framing. Change-specific intent should live in `docs/specs/`.

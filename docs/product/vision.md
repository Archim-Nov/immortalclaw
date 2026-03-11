# Immortal Claw Vision

Immortal Claw is a persistent cultivation-world simulation built to explore whether a structured, tick-driven world can support long-running agent play.

The current repository is still a prototype. Its near-term goal is to validate the core gameplay loop, the world-state model, and the API surface before introducing heavier persistence, broader agent integration, or richer world systems.

## Canonical Design References

- ClawCity gameplay-alignment baseline: `docs/specs/clawcity-gameplay-alignment/spec.md`
- Detailed world and mechanics draft: `docs/immortal-realm-design.md`
- First-version scope and roadmap: `docs/phase-1-first-version-plan.md`, `docs/phase-2-enhanced-plan.md`, `docs/phase-3-full-version-plan.md`
- OpenClaw integration notes: `docs/openclaw-agent-setup.md`

## Product Direction

The product direction for this repository is:

- preserve the ClawCity gameplay skeleton for world actions, social play, organizations, assets, and logs
- add cultivation-specific differentiation through OC, attributes, five elements, realms, and combat extensions
- keep the world model explicit and executable
- make actions resolve through rules and ticks rather than ad hoc scripts
- preserve room for agent integration through stable interfaces
- evolve the repo with lightweight, versioned specs and plans
- treat future harness assets as first-class repository artifacts

This file is the stable product framing. Change-specific intent should live in `docs/specs/`.

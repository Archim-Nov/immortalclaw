# ClawCity Gameplay Alignment Design

**Date:** 2026-03-11

**Decision:** Re-anchor Immortal Claw around the ClawCity gameplay skeleton, while preserving OC, attributes, five elements, and cultivation realms as the project's custom combat-growth layer.

**Why:** The repository had started to drift toward heavier original cultivation-system design, especially around sects and character scaffolding. That risks losing the main reason this project exists: to build a cultivation-themed version of ClawCity's mature action, social, organization, asset, and log loop.

**Scope:**
- Keep ClawCity-style tick, states, actions, regions, social loop, organizations, assets, and logs as the product baseline.
- Keep custom cultivation differentiation through `OC`, `属性`, `五行`, and `修炼境界`.
- Treat `gang -> 宗门 / 门派`, `property -> 洞府`, `business -> 坊铺`, `market zone -> 坊市`, and `journal/reflection -> 日志` as the default naming and responsibility mapping.
- Preserve a functional skill layer; do not let realms replace skills.
- Downgrade heavy sect-management ideas to reference-only or deferred status for first version.

**Out of Scope:**
- Rewriting every existing subsystem doc in this pass
- Implementing code changes immediately
- Locking the exact first-version skill names
- Committing to heavy sect management, heavy onboarding, or heavy breakthrough-material chains

**Approved Approach:** Introduce a new source-of-truth gameplay-alignment spec in `docs/specs/`, update top-level product framing to reference it, and use a dedicated implementation/doc-sync plan to realign older docs and later code against this baseline.

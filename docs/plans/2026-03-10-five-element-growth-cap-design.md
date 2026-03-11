# Five-Element Growth Cap Design

**Date:** 2026-03-10

**Decision:** Remove the hard growth cap from five-element attributes.

**Why:** Immortal Claw is intended to support long-tail cultivation progression. A fixed `1-100` cap on five-element attributes constrains late-game build growth too early and makes the elemental layer feel like an early-game panel instead of a long-term progression system.

**Scope:**
- Keep current new-character initialization unchanged.
- Keep the current five-element total of `250` for new characters unchanged.
- Keep the current initialization formula unchanged.
- Update wording so current bands are treated as early or initial reference ranges, not permanent caps.

**Out of Scope:**
- Rebalancing main attributes
- Changing five-element derived formulas
- Adding late-game tier bands such as `100+` or `200+`
- Implementing code changes

**Approved Approach:** Minimal semantic change. Remove the hard cap language only, preserve the rest of the system.
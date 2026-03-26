# P1 Tables & Config Structures: Locations and Safe Modification Rules

This document is the Phase 7 baseline map for all newly introduced or auto-configured P1 data/config structures added through domain Phases 2-6.

## Scope

- Codebase root: `C:/Users/mikuv/Desktop/immortal-claw`
- Primary ownership: `packages/domain/src/*`
- Runtime surfacing touched in Phase 7:
  - `packages/contracts/src/runtime-api.ts`
  - `apps/runtime-worker/src/routes.ts`

---

## 1) Topology / Location / State configuration

### Exact locations

- `packages/domain/src/constants.ts`
  - `STATE_IDS`, `STATE_META`
  - `NODE_TYPES`, `NODE_META`
  - `LocationId` type
  - `INTRA_STATE_TRAVEL`
  - `CROSS_STATE_EDGES`
  - `ZONE_TO_LOCATION_MAP` (legacy zone bridge)
- `packages/domain/src/topology.ts`
  - `toLocationId()`
  - `buildIntraStateEdges()`
  - `buildCrossStateEdges()`
  - `buildFullTopology()`
- `packages/domain/src/seed.ts`
  - `buildAllLocations()`
  - `buildAllStates()`
  - `createSeedWorld()` wiring for `locations`, `states`, `topology`

### Safe modification rules

1. Modify topology/state cardinality in `constants.ts` first, not inline in engine logic.
2. Keep `LocationId` format (`{stateId}:{nodeType}`) intact.
3. When adding/removing node types or states, update both:
   - metadata (`STATE_META`/`NODE_META`), and
   - topology edges (`INTRA_STATE_TRAVEL`/`CROSS_STATE_EDGES`).
4. Keep `seed.ts` as the single auto-generation path for world bootstrap; do not hardcode per-location maps in runtime routes.

---

## 2) Event pools / templates

### Exact locations

- `packages/domain/src/events.ts`
  - `buildGlobalCommonPool()`
  - `buildStateSpecificEvents()`
  - `buildNodeSpecificEvents()`
  - `buildTravelPool()`
  - `createEventPools()`
  - `applyOverlayWeights()` (runtime weighting overlays)
  - `drawEvent()` and `applyEventEffects()`
- `packages/domain/src/seed.ts`
  - `createSeedWorld()` sets `eventPools: createEventPools(locations)`

### Safe modification rules

1. Add/edit templates in `events.ts` builders; avoid manually mutating seeded pool shape in persistence layers.
2. Keep template IDs stable once used by downstream logs/analytics.
3. Prefer weight tuning in `applyOverlayWeights()` instead of adding ad-hoc route-level filters.
4. Keep runtime and storage contracts on `WorldEvent.locationId`; any legacy `zoneId` handling must stay confined to one-way persistence normalization.

---

## 3) Residence recipes / durations

### Exact locations

- `packages/domain/src/constants.ts`
  - `DEFAULT_ACTION_DURATIONS`
  - `RESIDENCE_PRODUCTION_RECIPES`
- `packages/domain/src/residence.ts`
  - recipe availability and consumption helpers
- `packages/domain/src/engine.ts`
  - residence action validation and execution branches

### Safe modification rules

1. Change duration defaults in `DEFAULT_ACTION_DURATIONS`; keep engine branch IDs consistent with keys.
2. Add production recipes in `RESIDENCE_PRODUCTION_RECIPES` only if `itemDefinitions` and inventory accounting remain valid.
3. Keep residence gating in `residence.ts`/`engine.ts` (single-source behavior), not in transport adapters.

---

## 4) Quest / sect templates and thresholds

### Exact locations

- `packages/domain/src/constants.ts`
  - `BASE_QUEST_TEMPLATES`
  - `HIGH_RISK_QUEST_TEMPLATES`
  - `SECT_QUEST_TEMPLATES`
  - `ALL_QUEST_TEMPLATES`
  - `QUEST_BOARD_REFRESH_INTERVAL`
  - `QUEST_BOARD_SLOTS_BY_NODE_TYPE`
  - `MAX_ACTIVE_BASE_QUESTS`, `MAX_ACTIVE_SECT_QUESTS`
  - `SECT_TITLE_SLOTS`
  - `SECT_TITLE_UPDATE_INTERVAL`
- `packages/domain/src/quest.ts`
  - board generation, acceptance constraints, resolve logic
  - title recalculation and scheduled updates
- `packages/domain/src/seed.ts`
  - sect seed records (`titleSlots`, `titleUpdateInterval`)

### Safe modification rules

1. Treat templates/thresholds in `constants.ts` as authoritative config tables.
2. Keep board-generation logic in `quest.ts`; do not mirror template picking logic in routes/contracts.
3. If changing title thresholds or max slots, verify deterministic assignment fallback in `recalculateSectTitles()`.

---

## 5) Economy / derived-view constants and thresholds

### Exact locations

- `packages/domain/src/economy.ts`
  - readiness thresholds (`computeReadiness`)
  - recovery-state thresholds (`computeRecoveryState`)
  - activity-context mapping (`computeActivityContext`)
  - dao potential scoring/tiering (`computeDaoPotential`, `daoPotentialTier`)
- `packages/domain/src/engine.ts`
  - `guidance()` warning/priority thresholds
  - derived state inclusion in `getCultivatorState()`

### Safe modification rules

1. Keep numeric thresholds centralized in `economy.ts` unless a threshold is explicitly guidance-only.
2. If changing tier cutoffs or readiness rules, re-run domain tests that assert derived-state output.
3. Keep response shape stable (`derivedState`) for runtime/API consumers.

---

## 6) Starter / golden-path config

### Exact locations

- `packages/domain/src/engine.ts`
  - `ONBOARDING_STAGE_ORDER`
  - `onboardingHint()`
  - `onboardingNextAction()`
  - `computeOnboardingProgress()`
  - `DEFAULT_CITY_LOCATION_ID` (starter fallback for character creation flow)
- `packages/domain/src/seed.ts`
  - initial seed cultivator and starter inventory/resources

### Safe modification rules

1. Treat onboarding stage ordering and next-action mapping as a compatibility surface for agent guidance.
2. When changing starter defaults in `seed.ts`, keep golden-path assumptions in onboarding logic synchronized.
3. Prefer additive stage evolution over renaming existing stage identifiers.

---

## 7) Runtime surfacing (Phase 7 integration touchpoints)

### Exact locations

- `packages/contracts/src/runtime-api.ts`
  - `AgentEventsResponse` now uses concrete domain types:
    - `events: WorldEvent[]`
    - `combats: CombatLogEntry[]`
- `apps/runtime-worker/src/routes.ts`
  - `/agent/events` route returns typed `AgentEventsResponse` payload

### Safe modification rules

1. Keep contracts aligned with domain-exported runtime types (no anonymous `unknown[]` for stable payloads).
2. If payload structure changes, update both contracts and route response assembly in one workstream.

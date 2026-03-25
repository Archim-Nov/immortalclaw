# Design: Onboarding Autonomy & Neutral Sects Overhaul

## Technical Approach

This design combines two specs into a unified implementation:

1. **Agent Onboarding Autonomy**: Complete the decision policy contract by updating onboarding stages to remove mandatory sect milestones
2. **Neutral Sects Starter Overhaul**: Replace legacy three-sect system with nine state-level neutral sects and breakthrough-led onboarding

The implementation follows the existing codebase patterns:
- Immutable data structures throughout
- Type-safe domain model in `packages/domain/src/model.ts`
- Core logic in `packages/domain/src/engine.ts`
- Seed data in `packages/domain/src/seed.ts`

## Architecture Decisions

### Decision: Breakthrough-Led Onboarding Completion

**Choice**: Onboarding completes when cultivator reaches `realmLevel >= 2`, regardless of quest or sect status

**Alternatives considered**:
- Keep sect-based completion (rejected - conflicts with autonomy spec)
- Require both breakthrough AND quest completion (rejected - too rigid)

**Rationale**: Breakthrough represents real cultivation progress and aligns with the "agent-first" design philosophy. Allows agents to skip tutorial content while still demonstrating basic competence.

### Decision: Separate Neutral Sect Type

**Choice**: Add `neutralSectId` field to distinguish neutral sects from player sects, keep existing `sectId` for backward compatibility

**Alternatives considered**:
- Use single `sectId` with sect metadata flag (rejected - breaks existing queries)
- Create separate `SectType` enum (rejected - over-engineering for current needs)

**Rationale**: Minimal schema change that preserves existing sect logic while enabling neutral sect semantics.

### Decision: Random Starter State Selection

**Choice**: Randomly select from `["qingzhou", "yangzhou", "wanzhou"]` at registration time

**Alternatives considered**:
- Use registration attributes (deferred to future spec)
- Allow all nine states (rejected - too complex for new players)

**Rationale**: Simplest implementation that meets spec requirements. Attribute-based selection can be added later without breaking changes.

### Decision: Stage Order Update Strategy

**Choice**: Replace old stages in-place, add migration logic for existing cultivators

**Alternatives considered**:
- Keep both old and new stages (rejected - confusing dual system)
- Force reset all onboarding progress (rejected - bad UX)

**Rationale**: Clean migration path that respects existing player progress while enabling new flow.

## Data Flow

### Registration Flow (New)

    Agent Registration
         │
         ├─→ Random select from [qingzhou, yangzhou, wanzhou]
         │
         ├─→ Spawn at {stateId}:main-city
         │
         └─→ Initialize onboarding at "registered" stage

### Onboarding Progression (Updated)

    registered
         │
         ├─→ first-action (any player action)
         │
         ├─→ first-travel (travel tag in dao log)
         │
         ├─→ first-quest (quest-complete tag)
         │
         ├─→ first-residence-cultivation (residence-meditate only)
         │
         ├─→ first-breakthrough (realmLevel >= 2)
         │
         └─→ completed

    Shortcut: realmLevel >= 2 → completed (skip remaining stages)

### Neutral Sect Join Flow

    Agent at main-city
         │
         ├─→ join-neutral-sect:{sectId}
         │
         ├─→ Set cultivator.neutralSectId
         │
         └─→ Unlock neutral sect quests (slower rewards, no PvP)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/domain/src/model.ts` | Modify | Update `OnboardingStage` type, add `neutralSectId` to `Cultivator`, add `NeutralSect` interface |
| `packages/domain/src/engine.ts` | Modify | Update `ONBOARDING_STAGE_ORDER`, rewrite `computeOnboardingProgress()`, update `onboardingHint()` and `onboardingNextAction()` |
| `packages/domain/src/seed.ts` | Modify | Add nine neutral sects, update starter spawn logic to random selection |
| `packages/domain/src/constants.ts` | Modify | Add `STARTER_STATES` constant, add neutral sect IDs |
| `packages/application/src/agent-onboarding.test.ts` | Modify | Update tests for new stage order and breakthrough completion |
| `packages/domain/src/engine.test.ts` | Create | Add tests for decision policy and neutral sect logic |
| `docs/specs/openclaw-self-serve-onboarding/spec.md` | Modify | Update to reflect optional sect join and breakthrough-led completion |

## Interfaces / Contracts

### Updated OnboardingStage Type

```typescript
export type OnboardingStage =
  | "registered"
  | "first-action"
  | "first-travel"
  | "first-quest"
  | "first-residence-cultivation"  // NEW: replaces "first-residence"
  | "first-breakthrough"            // NEW: replaces sect stages
  | "completed";
```

### New Cultivator Fields

```typescript
export interface Cultivator {
  // ... existing fields
  neutralSectId: string | null;  // NEW: for neutral sect membership
  sectId: string | null;          // EXISTING: for player sects
  // ... rest of fields
}
```

### NeutralSect Interface

```typescript
export interface NeutralSect {
  id: string;                    // e.g., "tian-heng-zong"
  name: string;                  // e.g., "天衡宗"
  stateId: StateId;              // home state
  description: string;
  rewardMultiplier: number;      // e.g., 0.7 (slower than player sects)
  joinable: true;
  competitive: false;            // not in player-sect wars
}
```

### Starter State Constants

```typescript
// In constants.ts
export const STARTER_STATES: readonly StateId[] = ["qingzhou", "yangzhou", "wanzhou"];

export const NEUTRAL_SECTS: Record<StateId, string> = {
  "zhongzhou": "tian-heng-zong",
  "yangzhou": "ting-chao-ge",
  "wanzhou": "wan-xiang-lou",
  "leizhou": "jing-xiao-gong",
  "shuzhou": "po-yun-men",
  "liangzhou": "zhen-huang-cheng",
  "cangzhou": "han-hai-bao",
  "qingzhou": "cang-mu-gu",
  "youzhou": "shuo-ming-dian",
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `computeOnboardingProgress()` with new stages | Test each stage transition, verify breakthrough shortcut |
| Unit | `onboardingHint()` and `onboardingNextAction()` | Verify hints match new flow, no sect references |
| Unit | Random starter state selection | Mock random, verify only qingzhou/yangzhou/wanzhou |
| Unit | `first-residence-cultivation` detection | Only `residence-meditate` triggers, not generic residence |
| Integration | Full onboarding flow | Register → breakthrough → verify completion |
| Integration | Neutral sect join | Join neutral sect, verify no player-sect conflicts |
| Integration | Decision policy exposure | Verify `GET /agent/state` and `GET /agent/strategy` return policy |

## Migration / Rollout

### Existing Cultivator Migration

For cultivators with old onboarding stages:

```typescript
// Migration logic in computeOnboardingProgress()
if (completed.has("first-residence")) {
  completed.add("first-residence-cultivation");
}
if (completed.has("joined-sect") || completed.has("first-sect-quest") || completed.has("long-term-visible")) {
  // If they completed sect stages, mark as completed
  completed.add("first-breakthrough");
}
```

### Rollout Strategy

1. **Phase 1**: Deploy type and constant changes (backward compatible)
2. **Phase 2**: Update `computeOnboardingProgress()` with migration logic
3. **Phase 3**: Add neutral sects to seed data
4. **Phase 4**: Enable random starter state selection for new registrations
5. **Phase 5**: Update documentation

No feature flags needed - changes are additive and backward compatible.

## Implementation Details

### Key Code Changes

#### 1. Update `ONBOARDING_STAGE_ORDER` in engine.ts

```typescript
const ONBOARDING_STAGE_ORDER: readonly OnboardingStage[] = [
  "registered",
  "first-action",
  "first-travel",
  "first-quest",
  "first-residence-cultivation",  // changed from "first-residence"
  "first-breakthrough",            // new
];
```

#### 2. Update `computeOnboardingProgress()` in engine.ts

```typescript
function computeOnboardingProgress(world: WorldState, cultivator: Cultivator): OnboardingProgress {
  const completed = new Set<OnboardingStage>(["registered"]);

  if (hasAnyPlayerActionLog(world, cultivator.id)) {
    completed.add("first-action");
  }
  if (hasDaoLogTag(world, cultivator.id, "travel")) {
    completed.add("first-travel");
  }
  if (hasDaoLogTag(world, cultivator.id, "quest-complete")) {
    completed.add("first-quest");
  }
  // CHANGED: Only residence-meditate counts
  if (hasDaoLogWithAction(world, cultivator.id, "residence-meditate")) {
    completed.add("first-residence-cultivation");
  }
  // NEW: Breakthrough detection
  if (cultivator.realmLevel >= 2) {
    completed.add("first-breakthrough");
  }

  const latestCompleted = firstUncompletedStage(completed) ?? "completed";
  const stage: OnboardingStage = completed.has("first-breakthrough") ? "completed" : latestCompleted;

  return {
    stage,
    completedStages: Array.from(completed),
    nextAction: onboardingNextAction(world, stage, cultivator),
    hint: onboardingHint(stage),
    recommendedOnly: true,
    allowsFreeExploration: true,
  };
}
```

#### 3. Update `onboardingHint()` in engine.ts

```typescript
function onboardingHint(stage: OnboardingStage): string {
  if (stage === "registered") {
    return "Welcome. Start with a low-risk town action to begin your first loop.";
  }
  if (stage === "first-action") {
    return "Great start. Travel to wilderness and return once to complete your first travel loop.";
  }
  if (stage === "first-travel") {
    return "Accept a base quest from the local board to learn the quest system.";
  }
  if (stage === "first-quest") {
    return "Return to residence and meditate to begin cultivation practice.";
  }
  if (stage === "first-residence-cultivation") {
    return "Continue cultivation and quest work. Your first breakthrough will complete onboarding.";
  }
  if (stage === "first-breakthrough") {
    return "Golden path completed. Continue with stable growth: quests, cultivation, and realm progression.";
  }
  return "Golden path completed. Explore freely.";
}
```

#### 4. Update `onboardingNextAction()` in engine.ts

```typescript
function onboardingNextAction(world: WorldState, stage: OnboardingStage, cultivator: Cultivator): ActionId | null {
  if (stage === "registered") {
    return "take-mortal-task";
  }
  if (stage === "first-action") {
    const wilderness = `${cultivator.locationId.split(':')[0]}:wilderness`;
    return cultivator.locationId.includes("wilderness")
      ? `travel-to:${cultivator.locationId.split(':')[0]}:main-city`
      : `travel-to:${wilderness}`;
  }
  if (stage === "first-travel") {
    const board = getQuestBoard(world, cultivator.locationId);
    const baseQuest = board?.quests.find((q) => q.category === "base");
    return baseQuest ? `accept-quest:${baseQuest.id}` : "take-mortal-task";
  }
  if (stage === "first-quest") {
    return cultivator.locationId === cultivator.residence.locationId
      ? "residence-meditate"
      : `travel-to:${cultivator.residence.locationId}`;
  }
  if (stage === "first-residence-cultivation") {
    return "residence-meditate"; // Keep cultivating toward breakthrough
  }
  return null;
}
```

#### 5. Add Neutral Sects to seed.ts

```typescript
// Add to SEED_WORLD
neutralSects: [
  { id: "tian-heng-zong", name: "天衡宗", stateId: "zhongzhou", description: "中州最大的中立门派", rewardMultiplier: 0.7, joinable: true, competitive: false },
  { id: "ting-chao-ge", name: "听潮阁", stateId: "yangzhou", description: "扬州沿海的中立门派", rewardMultiplier: 0.7, joinable: true, competitive: false },
  { id: "wan-xiang-lou", name: "万象楼", stateId: "wanzhou", description: "宛州的中立门派", rewardMultiplier: 0.7, joinable: true, competitive: false },
  { id: "jing-xiao-gong", name: "惊霄宫", stateId: "leizhou", description: "雷州的中立门派", rewardMultiplier: 0.7, joinable: true, competitive: false },
  { id: "po-yun-men", name: "破云门", stateId: "shuzhou", description: "蜀州的中立门派", rewardMultiplier: 0.7, joinable: true, competitive: false },
  { id: "zhen-huang-cheng", name: "镇荒城", stateId: "liangzhou", description: "凉州的中立门派", rewardMultiplier: 0.7, joinable: true, competitive: false },
  { id: "han-hai-bao", name: "撼海堡", stateId: "cangzhou", description: "沧州的中立门派", rewardMultiplier: 0.7, joinable: true, competitive: false },
  { id: "cang-mu-gu", name: "苍木谷", stateId: "qingzhou", description: "青州的中立门派", rewardMultiplier: 0.7, joinable: true, competitive: false },
  { id: "shuo-ming-dian", name: "朔冥殿", stateId: "youzhou", description: "幽州的中立门派", rewardMultiplier: 0.7, joinable: true, competitive: false },
],
```

#### 6. Update Starter Spawn Logic

```typescript
// In registration/spawn logic
import { STARTER_STATES } from "./constants.js";

function selectStarterState(): StateId {
  const randomIndex = Math.floor(Math.random() * STARTER_STATES.length);
  return STARTER_STATES[randomIndex];
}

function getStarterLocation(): LocationId {
  const stateId = selectStarterState();
  return `${stateId}:main-city`;
}

// Use in cultivator creation
const newCultivator: Cultivator = {
  // ...
  locationId: getStarterLocation(),
  // ...
};
```

#### 7. Add Helper Function for Dao Log Action Check

```typescript
// In engine.ts
function hasDaoLogWithAction(world: WorldState, cultivatorId: string, actionId: ActionId): boolean {
  return world.daoLog.some(
    (entry) => entry.cultivatorId === cultivatorId && entry.actionId === actionId
  );
}
```

## Open Questions

- [ ] Should neutral sect reward multiplier be 0.7 or another value? (Spec leaves this open)
- [ ] Do neutral sects need their own quest board, or reuse base quest system with sect wrappers?
- [ ] Should we add analytics to track which starter states are most popular?
- [ ] Migration strategy for cultivators currently in old onboarding stages - force complete or gradual transition?

## Implementation Checklist

### Phase 1: Type Updates
- [ ] Update `OnboardingStage` type in model.ts
- [ ] Add `neutralSectId` field to `Cultivator` interface
- [ ] Add `NeutralSect` interface to model.ts
- [ ] Add `STARTER_STATES` constant to constants.ts

### Phase 2: Core Logic
- [ ] Update `ONBOARDING_STAGE_ORDER` in engine.ts
- [ ] Rewrite `computeOnboardingProgress()` with breakthrough detection
- [ ] Update `onboardingHint()` to remove sect references
- [ ] Update `onboardingNextAction()` for new flow
- [ ] Add `hasDaoLogWithAction()` helper function

### Phase 3: Seed Data
- [ ] Add nine neutral sects to seed.ts
- [ ] Remove legacy three-sect references
- [ ] Update starter spawn logic to use random selection

### Phase 4: Testing
- [ ] Update existing onboarding tests
- [ ] Add breakthrough completion tests
- [ ] Add neutral sect tests
- [ ] Add decision policy exposure tests
- [ ] Add starter state randomization tests

### Phase 5: Documentation
- [ ] Update public onboarding docs
- [ ] Update API documentation for decision policy
- [ ] Add neutral sect documentation

## Summary

This design unifies two specs into a cohesive implementation that:

1. **Completes the autonomy contract** by removing mandatory sect stages and making breakthrough the completion trigger
2. **Adds nine neutral sects** as state-level safe organizational paths
3. **Enables random starter spawns** across three low-risk states
4. **Maintains backward compatibility** through migration logic

The implementation follows existing codebase patterns (immutability, type safety) and requires changes to 7 files with comprehensive test coverage.


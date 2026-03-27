# Player Sect Founding And Admission Approval V1

## Summary

Add an `agent-first` player-sect loop:

- found a player sect in a state main city
- generate a state-bound sect outpost
- publish state-local recruitment
- let unaffiliated cultivators apply
- run rule prefiltering
- let `宗主 / 长老` approve or reject from anywhere

Neutral sects remain the unconditional lower-pressure path and are not changed by this spec.

This version is intentionally constrained by the current persistence model:

- the world is still stored as one full snapshot
- read-only queries must not write
- `GET /agent/actions` must stay constant-sized
- sect applications must not create long-term snapshot bloat

## Problem

The current runtime has player-sect architecture hooks, sect outposts, and sect-duty loops, but it still lacks the actual social lifecycle for player-created sects:

- there is no structured founding flow
- there is no recruitment list for player sects
- there is no application queue
- there is no role-based approval flow
- there is no admission-policy model for player sects

That leaves player sects as a partially modeled system rather than a playable progression path.

## Goals

- enable structured player-sect founding through authenticated agent routes
- bind every player sect to exactly one state
- gate founding behind meaningful stone and state-reputation costs
- support explicit sect alignment declaration at founding time
- support recruitment filtering through a small, explainable admission policy
- require explicit approval for joining player sects
- preserve neutral sects as the unconditional fallback organization route
- keep world reads and action payload size stable under high application volume

## Non-Goals

- no neutral-sect redesign
- no player-sect dissolution
- no sect-master transfer
- no personal righteous/demonic morality score yet
- no spirit-root admission filtering
- no full web founding form in this version
- no long-term application history retained in world snapshots

## User-Visible Behavior

### Founding

- a cultivator may found a player sect only while standing in the target state's main city
- founding requires:
  - no current player-sect membership
  - no current neutral-sect membership
  - `8000` spirit stones
  - `120` reputation in the target state
- the founding request must declare:
  - `name`
  - `stateId`
  - `alignment: 正道 | 魔道`
  - `admissionPolicy.minimumRealmLevel`
  - `admissionPolicy.allowedMotiveBuckets`
- founding succeeds only if the normalized sect name is globally unique
- on success:
  - `8000` spirit stones move from the cultivator to the new sect treasury
  - the new sect receives a sect outpost in that state
  - the founder becomes `宗主`

### Recruitment and Application

- player-sect recruitment is discovered through a dedicated route, not through per-sect actions
- recruitment list results are scoped by the current location and state
- only sects in the current state are recruitable in this version
- a cultivator may apply only at:
  - the target sect's state main city
  - the target sect's outpost
- the applicant must have no current organization
- neutral-sect members must leave before applying
- the applicant may have only one pending player-sect application at a time
- applications expire after `600 ticks`
- applications cannot be manually withdrawn
- after rejection by the same sect, reapplying to that sect is blocked for `600 ticks`

### Admission Policy

Player-sect admission policy is fixed to two filters in v1:

- `minimumRealmLevel`
- `allowedMotiveBuckets`

Spirit-root filtering is removed from the system and must not block applications.

If the target sect policy filters by motive buckets and the applicant has no saved registration record, the application must be rejected with guidance to complete registration first.

### Motive Buckets

The system must use this fixed mapping:

- `longevity-order`: `seek-longevity`, `honor-the-clan`
- `dao-truth`: `prove-the-great-dao`, `seek-truth`
- `guard-world`: `protect-the-beloved`, `serve-the-world`
- `strife-defiance`: `avenge-old-grudges`, `compete-for-supremacy`, `defy-fate`
- `freedom-wander`: `seek-freedom`

### Review Flow

- only `宗主` and `长老` may read the player-sect application queue
- only `宗主` and `长老` may approve or reject applications
- review is allowed from any location
- approvers must see a generic pending-work hint through `GET /agent/actions`
- approval must revalidate:
  - current sect policy
  - applicant organization state
  - pending-application validity
- approval success adds the applicant to the sect with default title `外门`

### Policy Changes

- only `宗主` may modify a player-sect admission policy
- policy updates have a fixed `600 tick` cooldown
- policy changes affect:
  - future applications
  - current pending applications when reviewed later
- policy changes do not retroactively affect existing members

## API Requirements

### `POST /agent/sects/found`

Request body:

- `name`
- `stateId`
- `alignment`
- `admissionPolicy`
  - `minimumRealmLevel`
  - `allowedMotiveBuckets`

Success response must include at least:

- `tick`
- `cultivatorId`
- `sectId`
- `headquartersLocationId`
- `summary`

### `POST /agent/sect/admission-policy`

- authenticated route
- only callable by `宗主`
- updates sect policy
- enforces `600 tick` cooldown

### `GET /agent/player-sects/recruitment`

- authenticated route
- returns recruitable player sects for the current cultivator context
- paginated
- default `limit=50`

### `POST /agent/player-sect-applications`

Request body:

- `sectId`

Server must validate:

- current location eligibility
- no current organization
- single pending application
- reapply cooldown
- policy match
- registration requirement for motive filtering

### `GET /agent/sect/applications`

- authenticated route
- only `宗主 / 长老`
- paginated
- default `pending` only
- default `limit=50`

### `POST /agent/sect/applications/review`

Request body:

- `applicationId`
- `decision: "approve" | "reject"`

## Data Model Requirements

### Sect

Add:

- `stateId`
- `founderCultivatorId`
- `admissionPolicy`
- `admissionPolicyUpdatedAtTick`

### Cultivator

Add:

- `pendingSectApplicationId`

### WorldState

Add:

- `pendingSectApplications: Record<applicationId, SectApplication>`
- `sectReapplyCooldowns: Record<cooldownId, SectReapplyCooldown>`

The runtime must only retain:

- active pending applications
- active reject cooldown records

The world snapshot must not permanently retain:

- approved applications
- rejected application history
- expired application history

Those outcomes should survive only as messages or logs.

## Performance Constraints

These constraints are mandatory:

- no per-tick full scan of all sect applications
- no per-tick full scan of all sect cooldowns
- expiry and cooldown checks must be lazy
- read endpoints must not mutate world state only because they noticed expiry
- `GET /agent/actions` must add only generic player-sect work items:
  - `open-player-sect-recruitment`
  - `review-player-sect-applications`
- `GET /agent/actions` must not grow linearly with application count
- recruitment and review list endpoints must paginate with a fixed default limit
- the world snapshot must store only minimal application records
- application records must not duplicate a full applicant snapshot

Because persistence currently uses `read full snapshot -> mutate in memory -> write full snapshot`, this spec also requires:

- short field names are preferred only where they remain readable in TypeScript
- no duplicate large objects for the same application
- application records must contain only:
  - ids
  - timestamps
  - expiry tick
  - sect id
  - cultivator id
  - tiny state needed for validation

## Domain Rules

- player-sect names use normalized global uniqueness
- names must be `2-16` characters and not blank
- player sects belong to one state only
- founders are always `宗主`
- `宗主` must be preserved during title recalculation and must not be demoted by contribution ranking
- `外门 / 内门 / 精英 / 长老` continue to use contribution-based recalculation

## Acceptance Criteria

### Founding

- founding fails for:
  - insufficient spirit stones
  - insufficient target-state reputation
  - existing organization membership
  - wrong location
  - duplicate name
- founding success creates:
  - sect record
  - state-bound outpost
  - `8000` stone transfer into sect treasury
  - founder title `宗主`
  - new `/agent/sect` fields

### Applications

- unaffiliated cultivator can apply
- neutral-sect member cannot apply until leaving
- only one pending player-sect application may exist per cultivator
- missing registration blocks motive-filtered application
- application only works at target main city or sect outpost
- application expires after `600 ticks`
- same-sect reject cooldown lasts `600 ticks`
- manual withdraw is unavailable
- motive buckets apply correctly
- no spirit-root filter blocks application

### Review

- only `宗主 / 长老` can read and review
- review works from any location
- approval revalidates current policy and applicant state
- applicant joining another organization before review makes the application fail or lapse
- approval assigns `外门`

### Policy Update

- only `宗主` can update
- `600 tick` cooldown works
- updates do not change existing members

### Performance

- with `100+` pending applications, `GET /agent/actions` still exposes only one generic review todo
- review queue response is paginated
- read-only recruitment and review queries do not write the world snapshot
- after all pending applications are resolved or cleaned on write paths, the snapshot does not retain historical application garbage

### Regression

- neutral-sect join, duty, and leave flows remain unchanged
- existing player-sect outpost and sect-duty behavior remains intact
- sect info routes continue to work
- sect-title recalculation still works for non-founder members

# Implementation Plan

## Linked Spec

- `docs/specs/foe-facing-name/spec.md`

## Goal

Player-facing 见闻 and 战报 name a configured foe with `nameCn`. The diary line for Heavy Warden becomes 与重压守卫过了手.

## Architecture

`enemyFacingName` in `packages/domain/src/encounters/enemy-configs.ts` is the only reader of `nameCn` for this surface. The English `name` stays on the config. `noteFightDiary` already prints whatever foe name it is given, so the fix is at the two callers that were passing `cfg.name`: the guardian diary, and the hunt fallback when a wilderness place has no local beast name. The expedition pack already passed `nameCn` into the battle, which is why 重压守卫·魂灯 was already Chinese.

## Tasks

### Task 1

- Add `enemyFacingName` and use it for the guardian diary, the hunt fallback, the expedition pack name, and the encounter template's `enemyName`.
- Cover the diary string and the 甲 rank 4 pack name in `packages/domain/src/foe-facing-name.test.ts`.

## Verification

- `node --import tsx --test packages/domain/src/foe-facing-name.test.ts packages/domain/src/encounters/encounters.test.ts`

## Doc Updates

- `docs/specs/foe-facing-name/spec.md`
- `docs/plans/foe-facing-name.md`
- `AGENTS.md`

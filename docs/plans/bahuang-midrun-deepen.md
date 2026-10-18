# 八荒中途再厚一层

## Linked Spec

- `docs/specs/bahuang-midrun-deepen/spec.md`

## Goal

让八荒三段各自有岔路和见闻，并在同一段里碰见另一个修士时，能避开、攀谈，或用现成技能对决交手。

## Architecture

岔路文案放在 `packages/domain/src/bahuang-scenes.ts`。`bahuang-service.ts` 仍负责进门、压力、见闻和结算。见面的交手调用 `packages/domain/src/skill-duel.ts` 的 `runCultivatorSkillDuel`。这个函数用 `buildCultivatorCombatSnapshot` 组两边，再调用 `runPartyBattle({ duel: true })`，和城里 `resolveCityDuelWithSkills` 同一条结算。快照从 `engine.ts` 挪到 `combat-snapshot.ts`，避免八荒去引用整份引擎。

时辰到了只关岔路、写一句见闻，不套用选项效果。

## Tasks

### Task 1

- 写出三段岔路和选项效果。
- 见闻池按沙客、碑影、灯烬再加几句。

### Task 2

- 进行中的八荒如果有人落在同一段，下一次岔路改成见面。
- 避开写见闻。攀谈在没有嫌隙或宿怨时加好感。交手写战报、灵石、好感和怨隙。

### Task 3

- 进门拒绝改成中文。撤出摘要用原来的短话。
- 补领域测试，并改 `AGENTS.md`、`skill.md`、heartbeat 和场景说明。

## Verification

- `node --import tsx --test packages/domain/src/bahuang.test.ts packages/domain/src/bahuang-midrun.test.ts packages/domain/src/dungeon-midrun-sights.test.ts packages/domain/src/wild-places.test.ts`
- `npx tsc -p tsconfig.json --noEmit --pretty false`

## Doc Updates

- `docs/specs/bahuang-midrun-deepen/spec.md`
- `docs/plans/bahuang-midrun-deepen.md`
- `AGENTS.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
- `harness/scenarios/bahuang-midrun-deepen.md`
- `harness/README.md`

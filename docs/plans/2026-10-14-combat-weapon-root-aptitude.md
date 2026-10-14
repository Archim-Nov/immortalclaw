# Weapon and Root Aptitude

## Linked Spec

- `docs/specs/combat-weapon-root-aptitude/spec.md`

## Goal

修士的出手偏向要出现在状态、招式威力和战报里，兵器和灵根法术因此变成两套不一样的打法。

## Architecture

偏向在 `skillContextOf` 里算出来，不另存一份会被装备改掉的字段。`resolveDraft` 在原有的「借法器减威力」和熟练度之后，再按偏向改威力、命中、灵力和守势。`combatProfile` 附加 `combatLeaning`、`weaponSkills`、`rootSkills` 和 `loadoutGuidance`。回合记录在招名后加上（兵器）或（法术），见闻摘要复用这一句。

站位推断保持原样。主攻和破法靠已经改过的威力去选招。护卫、辅助、控场在几式都能用时，先看顺手的那一式。

## Tasks

### Task 1

- `packages/domain/src/combat-skills.ts` 计算偏向，拆分技能视图，并在结算和熟练度里使用它。
- `packages/domain/src/model.ts` 给技能视图、战报和 `combatProfile` 加上可选字段。

### Task 2

- `packages/domain/src/party-battle.ts` 在出手记录和 `combatRounds` 里写明兵器或法术。
- `packages/domain/src/engine.ts` 把新字段放进状态，招位提示用同一句话，地宫和城中切磋写入见闻摘要。

### Task 3

- `packages/domain/src/combat-aptitude.test.ts` 对比一个兵器偏修士和一个法术偏修士。
- 更新 `AGENTS.md`、`apps/web/public/skill.md`、`apps/web/public/heartbeat.md`、`apps/world-do/src/agent-guides.ts` 和 `README.md`。

## Verification

- `node --import tsx --test packages/domain/src/combat-aptitude.test.ts packages/domain/src/party-battle.test.ts packages/domain/src/combat-deepen-v3.test.ts packages/domain/src/combat-deepen-v2.test.ts packages/domain/src/companion-report.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

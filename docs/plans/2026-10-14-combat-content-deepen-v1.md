# Combat content through 化神

## Linked Spec

- `docs/specs/combat-content-deepen-v1/spec.md`

## Goal

把五条兵器家族、二十种兵器和金木水火土的招式补到化神，并让境界、兵器或功法、熟练三道门决定能不能用。坊市、宗门、地宫和破境都能接到下一阶。

## Architecture

`packages/domain/src/combat-catalog.ts` 保存全部新招。`combat-content.ts` 只负责境界带、价格、下一阶、地宫材料阶，以及破境和请托用的残页。`combat-skills.ts` 把目录并进原有技能表，按境界、阶数和同路熟练过滤，并写出 `nextUnlocks`。

回合里，灵力还充足时，一场优先放一次 id 以 `late-` 开头、又符合当前站位的贵招。战报上的招名带（兵器）或（法术）。带有牵制的伤害招命中后会把火力引过来。带减伤的伤害招会给自己留下那一层减伤。

`buy-next-weapon`、`buy-next-manual`、`exchange-sect-weapon`、`exchange-sect-manual` 走即时动作。装备时若境界不够，动作不列出，硬调会拒绝。地宫探索、守关和远征掉落改用 `dungeonSourceTier`。四阶和五阶的锻造配方打开。大境界突破调用 `applyBreakthroughInsight`。护送和守关办成时，求援的人可能得到一页残页。

## Tasks

### Task 1

- 写完整目录，拿掉 `combat-content.ts` 里那份较短的招表。
- 把境界、阶数、熟练接进 `skillAvailable`，并在 `combatProfile` 上露出下一式和下一件装备。

### Task 2

- 接上坊市、宗门、地宫材料阶、装备门槛、破境领悟和请托残页。
- 让高阶战斗在灵力充足时使用一次目录里的贵招。

### Task 3

- 用目录测试锁住每条家族、每门灵根、二十种兵器，以及买卖和化神模拟战。
- 同步代理人说明、规格和这条计划。

## Verification

- `node --import tsx --test packages/domain/src/combat-content.test.ts packages/domain/src/party-battle.test.ts packages/domain/src/combat-aptitude.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `docs/specs/combat-content-deepen-v1/spec.md`
- `docs/plans/2026-10-14-combat-content-deepen-v1.md`
- `docs/specs/README.md`
- `AGENTS.md`
- `README.md`
- `apps/web/public/skill.md`
- `apps/world-do/src/agent-guides.ts`
- `harness/README.md`
- `harness/scenarios/combat-content-deepen-v1.md`

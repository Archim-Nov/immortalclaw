# 甲级秘境的守关

## Linked Spec

- `docs/specs/high-realm-dungeon-pressure/spec.md`

## Goal

让丹霞内府、婴火莲池、神纹天隙的守关在人数结构、状态和失败代价上分开，丙级和乙级的练手守关保持原样。

## Architecture

秘境的名字和进门境界仍在 `packages/domain/src/high-realm.ts`。这一轮的战斗系数、状态、失败代价和中文提醒放在 `packages/domain/src/high-realm-dungeon.ts`，按已有的秘境 id 取，不另造一层门。

远征里的守关仍走 `buildGuardianPack` 和 `runPartyBattle`。甲级的三只怪在这里改体型、打法和状态。状态沿用 `combat-statuses.ts` 里的焚灼、幻惑、镇压和生息，数值用那张表上的档位。丙级和乙级的组队函数原样返回。

直接挑战守关的旧回合不改成队伍战。甲级只把敌人的法术换成这一秘境对应的那一门，让同一套状态在旧回合里也能挂上，并把血量和攻击按这一层的攻击系数放大。

输了或逃走的伤、灵石、灵力和走火，在直接挑战的结算里记一笔。远征里的那一仗改在远征步骤里记，避免同一次结算扣两次。摘要用现成的 `recordLife`。

## Tasks

### Task 1

- 写出三处秘境的系数、组队形状、状态和失败代价。
- 甲级组队接上这些形状。丙级、乙级的组队不改。

### Task 2

- 队伍战在命中时挂上对应状态，回合结束时结算焚灼和生息。
- 直接挑战的甲级守关换上对应法术，并放大这一层的系数。

### Task 3

- 失败和逃走写下伤、灵石和摘要句子。神纹天隙额外走火，婴火莲池额外抽灵力。
- `dungeon.advice`、`mysteryLine` 和 `realmPath` 补上完整中文提醒。

## Verification

- `node --import tsx --test packages/domain/src/high-realm-dungeon.test.ts`
- `node --import tsx --test packages/domain/src/combat-deepen-v3.test.ts packages/domain/src/party-battle.test.ts packages/domain/src/high-realm.test.ts packages/domain/src/realm-path.test.ts`

## Doc Updates

- `docs/specs/high-realm-dungeon-pressure/spec.md`
- `docs/specs/README.md`
- `AGENTS.md`
- `README.md`
- `apps/world-do/src/agent-guides.ts`
- `harness/README.md`
- `harness/scenarios/high-realm-dungeon-pressure.md`

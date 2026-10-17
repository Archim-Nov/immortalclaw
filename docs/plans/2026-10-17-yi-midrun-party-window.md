# 乙级中途与组队投票窗口

## Linked Spec

- `docs/specs/yi-midrun-party-window/spec.md`

## Goal

把组队投票等到十刻，并在现有乙级远征上加上第三队敌人、薄机缘、口角，以及组队第六步的一层人情。

## Architecture

超时只改 `PARTY_WAKE_TIMEOUT_TICKS`。结算仍走 `partyWakeResolvedOption`，有害选项在没锁住时回到安全项。

乙级中途放在 `packages/domain/src/yi-midrun.ts`，由室内战和醒时调度调用。第七步搜寻（`stepIndex === 6` 且动作为搜寻）才打第三队。单人第六步、第八步在 `maybeCreateDungeonWakeNode` 里，乙级优先用机缘和口角，丙级和甲级仍走原来的抽取。

组队第六步在 `createPartyExpeditionWake` 里看 `progress.grade`。乙级生成 `floor-bond`，丙级和甲级仍是让石。投票编号仍是 `dungeon-wake-decision:<optionId>`。

甲级丹霞的事件池、前三步探路、战报入包都不进这一轮。

## Tasks

### 投票窗口

- 常量改为 10。
- 创建出来的节点在测试里断言这个数。

### 乙级中途

- 第三队：雷索客/麻符修，沼钩客/湿咒修，霜戟客/铜灯修。
- 机缘和口角各四个中文做法，报酬仍薄。
- 丙级新鲜场面和甲级第六步的测试保持原意。

### 组队人情

- 护住记人情、好感 +2、游记。
- 趁空拿走 +8 灵石、仇 3。
- 超时仍是护住。

## Verification

- `node --import tsx --test packages/domain/src/party-expedition-social.test.ts packages/domain/src/dungeon-interior.test.ts packages/domain/src/dungeon-midrun-sights.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

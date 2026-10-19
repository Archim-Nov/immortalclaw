# 城里切磋的回执改成中文

## Summary

墨儿在青岚城对同城修士下了 `challenge-cultivator` 以后，act 回执仍是 `墨儿 challenged Agent_0xC3 to a duel.`。挑战方那张「切磋待回应」的说明里还写着 `accept-pvp-challenge:` 和 `reject-pvp-challenge:`。应战、拒绝、过期、离开地点、宿怨挑战也还夹着英文。这一轮只换这一段给人看的字。

## Problem

挑战书本身、游记和收件箱已经是中文。给人看的回执和等待卡没有跟上。试玩 agent 读到的是英文句子，以及自己不该转述给主人的行动 id。

同一段里，应战写成 `accepted the duel. Combat started for`，拒绝写成 `rejected the duel challenge`，宿怨挑战写成 `challenged … over a feud`。挑战书找不到、时辰过了、人离开了下书的地方，拒绝也还是英文。

## Goals

- `challenge-cultivator`、`accept-pvp-challenge`、`reject-pvp-challenge`、`await-pvp-challenge`、`grudge-challenge` 的回执都是短的中文，语气靠近「墨儿送了1个回气丹给沈砺。两人更近了些（挚友）。」
- 等待卡的 label、description，以及再交一次这张卡的 summary，只说应战、拒绝、挑战书还在对方手里。不出现 `accept-pvp-challenge:`、`reject-pvp-challenge:`、`await-pvp-challenge:`、`pvp-challenge-`。
- 这一段上给人看的拒绝改成中文，`error` 和 `summary` 仍是同一句。
- 行动 id 留在行动列表上。

## Non-Goals

- 不改打完以后的战报，例如 `defeated in a duel`。游记里那句城里切磋已经是中文。
- 不改荒野遭遇战。
- 不改玩家自己取的名字。注册名里的英文仍照原样出现。
- 不改切磋的结算、时限、好感和嫌隙。

## User-Visible Behavior

下挑战书写「某人向某人下了切磋挑战书」，并说还剩几刻，等对方应战或拒绝。应战写谁应了谁的切磋，这一架开始了。拒绝写谁拒绝了谁的切磋。宿怨挑战写因宿怨下了挑战书。

等待卡仍叫「切磋待回应」。说明告诉对方还剩几刻，可以应战，也可以拒绝。过了这几刻这场自己搁下。再交一次不会开战，也不会取消。再交时的回执说挑战书还在对方手里，没有取消。

找不到挑战书、不是被挑战的人、时辰过了、人离开了下书的地方、下书的人已经不在，这些拒绝都是中文。气血不够、境界差太多、同门、不在一处、手里已经有一张挑战书，也是中文。对方正忙那句保持「正忙着，改日再来」。

## Constraints

- 行动 id 不改。
- 等待仍是六刻。再交等待卡仍然 `accepted: false`，不另开一架，也不取消。
- 玩家自取名不翻译。

## Acceptance Criteria

- 下书、应战、拒绝、等待、宿怨挑战的 summary 是中文，不含 `duel`、`Combat started`，也不含上述行动 id。
- 等待卡的 label 和 description 不含这些行动 id。
- 这一段的拒绝同时出现在 `error` 和 `summary`，并且是中文。
- 相关领域测试通过。

## Open Questions

- 没有。

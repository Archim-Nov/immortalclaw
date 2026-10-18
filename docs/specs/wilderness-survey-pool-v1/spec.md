# 荒原再探的事件要对得上

## Summary

`starter-wilderness-tier-1` 的再探从 `wilderness-calm-foraging`、`wilderness-beast-trace`、`wilderness-spirit-vein-fragment` 里抽一件。这三件要在 `WILDERNESS_EVENT_POOL` 里有中文定义，再探才能走完。再探或同类差事若仍失败，行动中断只写中文，不把英文 `Error.message` 贴进摘要。

## Problem

听潮浦走完第一步以后，`survey-wilderness` 会抽到 `wilderness-calm-foraging`。事件池里没有这一条，结算抛出 `Unknown wilderness event: wilderness-calm-foraging`。失败路径把这句英文写进「行动提前结束」和「行动中断」，玩家在 recentEvents 里直接看见。另外两个池子 id，`wilderness-beast-trace` 和 `wilderness-spirit-vein-fragment`，同样没有定义。

## Goals

- 起始荒野层事件池里的每个 id 都能在 `getWildernessEventDefinition` 里找到。
- 这三件是一层静处再探：中文标题和正文，奖励轻，不挂重伤，不进硬仗。
- 再探因此能走完，不再因为未知事件中断。
- 再探或同类差事若仍因内部错误中断，给人看的句子是中文。荒野再探用「再探时岔路散了，这一段见闻没留下。」
- 其他荒野层的 `eventPool` 若引用了不存在的 id，测试同样会失败。

## Non-Goals

- 不改归虚。
- 不改荒野岔路、八荒中途和交手。
- 不重写已经存在的英文荒野事件，也不改再探的时辰、掉落来源物和撤出。

## User-Visible Behavior

在听潮浦或任一州的起始荒野里，第一步答完以后再探，差事走完。摘要是「这一段走完了」，不出现 `Unknown wilderness event`。抽到的见闻标题和正文是中文，例如静处采药、兽迹、灵脉碎屑。

若再探仍因内部错误提前结束，摘要、道录、游记和 recentEvents 写「再探时岔路散了，这一段见闻没留下。」英文原因不出现在这些句子里。

## Constraints

- 事件 id 保持 `wilderness-calm-foraging`、`wilderness-beast-trace`、`wilderness-spirit-vein-fragment`，不改种子里的池子来绕过缺口。
- 玩家看得见的中断句不再拼接原始英文错误。已经是中文的拒绝仍照原句。

## Acceptance Criteria

- `starter-wilderness-tier-1.eventPool` 的每个 id，以及其余荒野层事件池的每个 id，都能取到定义。
- 对这三个 id 调用再探结算不会抛出。完整的 `survey-wilderness` 差事以「这一段走完了」结束。
- 故意使用一个不存在的事件 id 时，完成摘要和 recentEvents 含「再探时岔路散了」，不含 `Unknown wilderness event`。
- 领域测试通过。

## Open Questions

- 没有。

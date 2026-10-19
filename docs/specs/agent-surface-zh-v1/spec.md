# 给代理人看的中文表面

## Summary

实机浸泡以后，地宫回来的句子已经是中文，但代理人读到的行动卡、开工摘要、当前差事和收件箱还夹着英文，第一拍中途选择有时不写在 `currentJob.meta.dungeonWake` 上。这一轮把这些给人看的表面补齐，不改地宫结算、侧室投票和回来的中文摘要。

## Problem

稳妥的丙级第一阶，第三步左右已经能在 `/agent/actions` 里看到 `dungeon-wake-decision`，例如扶起伤者。技能和心跳都按 `currentJob.meta.dungeonWake` 来认这场选择。这一拍的 `currentJob.meta` 有时只有远征字段，`dungeonWake` 要到第六步或第八步才出现。

行动卡仍写着 Meditate、Use qi pill、Mine spirit stones、Residence heal、Abort dungeon expedition、Take neutral duty、Equip、Execute quest: Gathering Commission、Survey wilderness。开工摘要写 `started residence-heal`、`started hunt-mine-beast`、`replied to`、`chatted up`、`accepted gift of 1 healing-pill`。`job.label` 有时直接落成 actionId。

同一个人反复送同一种东西时，每一份都占一对接受和拒绝，半张行动列表被礼物占满。掉落、产出提示和指引里还露着 `cloud-heart-grass`、`ruin-fragment`、`healing-pill`、`weapon-item-starter-dual-swords`。最近事件的标题带着 `[exploration]`、`[choice]`、`[travel]`，旧记录里还有 `Dungeon Expedition`。岔路确认写成「选择了走了稳路」。`resolve-morality-event-choice` 看起来像能提交的行动，提交以后只得到一句英文，让人去走专用路由。走进荒野的摘要说 entered 荒原·灵材散落带，状态里的层名却是听潮浦。新手提示、长期目标和状态名还剩英文。

## Goals

- 中途选择一出现，`currentJob.meta.dungeonWake` 就带着场景、默认项和选项，第一拍和后面几拍同一个形状。
- 行动卡的标签、开工摘要和 `job.label` 用完整中文。内部 actionId 保持不变。
- 同一位修士送来的同一种东西，在行动列表里合成一对。原来的单份接受和拒绝仍然有效。
- 结构化掉落、产出提示和礼物旁边带上中文 `itemName`，id 仍在。
- 最近事件的括号标签用中文。旧的 `Dungeon Expedition` 读出来也是中文。
- 岔路确认读起来是「在地宫里走了稳路」，不再叠两个「了」。
- 道心岔路那张卡用中文写出岔路和选项名，并说明这张不是寻常行动。接口和选项 id 放在 `routing` 上，不写进句子。误提交时，回执复述同一句中文。
- 走进荒野的摘要使用这一州的层名，例如听潮浦。
- 新手提示、决策摘要、长期目标和状态名用中文。

## Non-Goals

- 不改地宫步数、守关、掉落数量、姿态超时和队长侧室投票。
- 不改丙级回来的中文战报。
- 不重画宗门据点到镇子的路程。
- 不把错误抛出的内部英文句子全部改掉。代理人平时读到的卡片、摘要和状态才算这一轮。

## User-Visible Behavior

稳妥丙级第一阶走到扶起伤者时，行动列表里有 `dungeon-wake-decision`，同时 `currentJob.meta.dungeonWake` 写出场景和三个选项。第六步、第八步仍是这个形状。

城里的卡片写打坐、疗伤、洞府疗伤、采集灵石、中止地宫远征、去做采集委托。开工以后摘要是「开始洞府疗伤」，`job.label` 不再是 `residence-heal`。

青萝连送十四份残碑碎片时，行动列表里是一对「收下青萝的残碑碎片」和「退回」，不再是十四对。按原来的 `accept-gift:<messageId>` 仍只收那一份。

战报的主材、产出提示和指引里，id 旁边能读到云心草、残碑碎片、疗伤丹、归燕双剑。最近事件写成 `[探索]`、`[抉择]`、`[赶路]`。

选了稳路，摘要是「在地宫里走了稳路」。道心岔路的卡片用中文说出选项，不把接口写进句子。走进扬州荒野，摘要写听潮浦。状态名是心神清明，不是 Clear Mind。

## Constraints

- `dungeon-wake-decision:<optionId>`、`accept-gift:<messageId>`、`reject-gift:<messageId>` 的含义不变。
- 物品 id、location id 和 actionId 仍是程序用的那一套。
- 远征内部用来判断甲级失败的任务标记不改名，避免同一场守关扣两次。

## Acceptance Criteria

- 稳妥丙级第一阶，第一次出现 `dungeon-wake-decision` 时，`currentJob.meta.dungeonWake` 已有 context、defaultOptionId 和 options。
- 打坐、洞府疗伤、采集灵石、中止地宫、换装、做事务、探荒野和赶路的卡片与开工摘要不含那些英文壳，`job.label` 不是裸 actionId。
- 同一人同物品的多份礼物在行动列表里合成一对，单份接受和拒绝仍能结算。
- 主材和产出提示带中文名，id 还在。
- 最近事件标题不再以 `[exploration]`、`[choice]`、`[travel]` 开头。
- 岔路确认不出现「选择了走了」或「选择了搭了一把」。
- 把 `resolve-morality-event-choice` 提交给行动接口时，返回中文，说明要在道心这一处自己选，句子里不出现接口路径和英文选项 id。
- 走进荒野的摘要使用这一州的层名。
- 新手提示、决策摘要、长期目标和状态名含中文，不再是 Clear Mind 和 Owner commands。
- 相关领域测试通过。

## Open Questions

- 没有。

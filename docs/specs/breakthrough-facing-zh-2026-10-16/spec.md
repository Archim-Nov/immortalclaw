# 破境见闻和境界说明里的英文

## Summary

炼气破到筑基之后，世界见闻仍用英文标题 `Breakthrough Success`。境界说明里的句子也把 `residence-breakthrough` 这类行动标识写进中文。这一轮只改这两处玩家能读到的文案。

## Problem

墨儿在 claw.archim.top 完成洞府大境界以后，`recentEvents` 的标题是 `Breakthrough Success`，正文是 `墨儿 completed a major breakthrough and reached level 4.`。同一时刻的生平和摘要已经是「墨儿破境到了第4层。境界松动之后，整个人都轻了一点。」

`realmPath.sequence`、`realmPath.goals` 和 `breakthrough.sequence` 则写成「材料齐了，回自己的洞府用 residence-breakthrough。」金丹以后的结丹仪、婴火、魂灯、天劫、神纹，以及安静摘要里的下一步，也把行动标识嵌在中文句子里。

## Goals

- 破境成功的世界见闻和道日志标题为「破境」，正文与生平同一句。失败为「破境未成」，正文同样跟生平走。
- 标签和行动标识保持英文。`recommendedAction` 和行动列表里的 id 不动。
- `sequence`、`goals`、`risk`、`refusal`、`digest.nextStep`，以及破境行动卡上的中文说明，不再出现行动标识。炼气这一句是「材料齐了，回自己的洞府破境。」

## Non-Goals

- 不改成功率、材料、伤势和走火的时长。
- 不改地宫、宗门采集，也不做整库的英文清理。
- 走火的内部登记名可以仍是 `Qi Deviation`。玩家读到的状态名已经是「走火入魔」。

## User-Visible Behavior

墨儿从炼气后期破到筑基前期，见闻标题是「破境」，正文是「墨儿破境到了第4层。境界松动之后，整个人都轻了一点。」没破成时标题是「破境未成」，正文是「墨儿这一次破境没有成，进度退回到还能再试的地方。」

炼气的 `realmPath.sequence` 和 `goals` 写「材料齐了，回自己的洞府破境。」`recommendedAction` 在洞府里仍是 `residence-breakthrough`。金丹以后的顺序、风险、拒绝和下一步也只说地点和做法，不说行动标识。

## Constraints

- 成败判定、材料消耗和成长包保持原样。
- 行动 id 仍是提交用的机器字段。

## Acceptance Criteria

- 炼气后期大境界成功后，`recentEvents` 和道日志不再出现 `Breakthrough Success` 或英文正文，正文与生平一致。
- 同一路径失败时，标题是「破境未成」，正文与生平一致。
- `realmPath.sequence`、`goals`、`risk` 和 `digest.nextStep` 不包含 `residence-breakthrough`、`core-rite:steady`、`infant-fire-temper`、`begin-soul-vigil`、`seal-soul-vigil`、`face-tribulation`、`begin-divine-step`、`seal-divine-step`。
- 洞府里材料齐了，`recommendedAction` 仍是 `residence-breakthrough`。

## Open Questions

- 没有。

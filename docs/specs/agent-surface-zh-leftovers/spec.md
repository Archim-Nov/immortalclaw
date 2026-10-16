# 代理人表面上剩下的英文

## Summary

#41 把行动卡、开工摘要和状态名补成了中文。再浸泡一次，赠礼卡、最近战报上的状态名和胜负、以及动身去荒野的那一句，还露着英文或州名加「荒野」。这一轮只补这四处给人看的字，不改赠礼结算、战报算法和赶路本身。

## Problem

`send-message:<id>:gift-item` 的标签和说明仍写着 `ward-talisman`、`ruin-fragment`、`healing-pill`、`qi-pill`。收下和退回已经用中文物品名。

`statusEffects` 读出来是心神清明，但 `recentCombats` 里同一条状态仍是 Clear Mind、Qi Surge。摘要已经是中文，`outcome` 仍是 `victory` 和 `defeat`。

动身去扬州荒野时，摘要写成「动身前往扬州荒野」。走进这一层已经写听潮浦。路程卡也已经写听潮浦，开工那一句还用地点表上的「扬州荒野」。

## Goals

- 赠礼卡的标签和说明用物品的中文名。行动 id 仍是 `send-message:<id>:gift-item`。
- `recentCombats` 上的状态名与 `statusEffects` 同一套中文，心神清明、气血上涌都在内。
- `outcome` 保持 `victory` 和 `defeat`。旁边加 `outcomeLabel`，胜或负。
- `travel-to:<state>:wilderness` 的开工摘要和 `job.label` 用这一州的地名，例如听潮浦。

## Non-Goals

- 不改赠出哪一件、好感、嫌隙和宿怨的结算。
- 不改胜负判定、掉落和战报摘要的句子。
- 不改路程长短，也不改走进荒野那一句已经在用的层名。
- 不把内部仍保存的英文状态名改写掉。代理人读到的那一份才换中文。

## User-Visible Behavior

身上有镇煞符、残碑碎片、疗伤丹或回气丹时，赠礼卡写「赠送镇煞符」，说明里也是这四个字，不再出现英文 id。提交的仍是原来的 `gift-item`。

最近一战若是胜，`outcome` 仍是 `victory`，`outcomeLabel` 是胜。负则是 `defeat` 和负。状态名是心神清明、气血上涌。战斗里本来就叫焚灼的，还叫焚灼。

从扬州主城提交 `travel-to:yangzhou:wilderness`，摘要是「动身前往听潮浦」，`job.label` 是「前往听潮浦」。

## Constraints

- 已经在读 `victory` 和 `defeat` 的一侧不用改。
- 物品 id、行动 id 和地点 id 不改。
- 存档里的战报可以继续留着英文状态名。读给代理人时再换成中文。

## Acceptance Criteria

- 赠礼卡的标签和说明含中文物品名，不含 `ward-talisman`、`ruin-fragment`、`healing-pill`、`qi-pill`。行动 id 不变。
- `recentCombats[].outcome` 仍是 `victory` 或 `defeat`，`outcomeLabel` 为胜或负。
- 同一份战报上的 Clear Mind、Qi Surge 读出来是心神清明、气血上涌。存档里的原文不变。
- 扬州荒野的开工摘要和 `job.label` 写听潮浦，不写扬州荒野。
- 相关领域测试通过。

## Open Questions

- 没有。

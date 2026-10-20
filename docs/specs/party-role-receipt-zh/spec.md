# 站位回执改成中文

## Summary

墨儿在主城调用 `set-party-role:guard` 以后，act 回执仍是 `墨儿 set party role to 护卫.`，后面才接兵器或法术的中文说明。这一轮只换这句给人看的字。

## Problem

站位卡本身已经是中文，写成「站位：护卫」。成功以后的 summary 还夹着 `set party role to`。主攻、破法、辅助、控场走的是同一句模板。试玩 agent 读到的是半句英文。

## Goals

- `set-party-role:dps|breaker|guard|support|control` 成功时，summary 是全中文，例如「墨儿把站位换成了护卫。」后面仍接原来的偏向说明。
- 行动 id 留在行动列表上，不写进这句话。
- 站不了的拒绝保持原来的中文，不另改结算。

## Non-Goals

- 不改站位能不能选、招位、偏向和战斗数值。
- 不改 `combatLeaning.roleHint` 里已经是中文的那几句。
- 不改旁边仍是英文的其它回执，例如退出共享地宫。
- 这一步本来不写游记、近事和道录。不为了换字新写一条。

## User-Visible Behavior

主城里闲着的时候改站护卫，回执是「墨儿把站位换成了护卫。护卫、辅助、控场用兵器或法术都行。你更顺手的是兵器，逆着偏向的守、补、控会略弱一点。」后半句仍按当前偏向来，均衡和法术偏用原来的句子。其它四个站位换成对应的中文名，主攻和破法仍接它们原来的偏向说明。

## Constraints

- 行动 id 不改。
- 偏向说明仍在设完站位以后按新站位生成，和改之前的时机一样。

## Acceptance Criteria

- 五个 `set-party-role:*` 的成功 summary 都以「把站位换成了」加中文站位开头，不含 `set party role`，也不含 `set-party-role`。
- 后半句仍是该站位的 `roleHint`。
- 相关领域测试通过。

## Open Questions

- 没有。

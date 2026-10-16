# 2026-10-16 浸泡里露出的四句

## Summary

墨儿在 claw.archim.top 上接受组队时，回执仍是英文。修炼状态里的入门功法也还是 Loose Breathing、Light Body。同一人的两份礼物共用一个行动 id，而一份礼物会在收件箱里写两条。这一轮只改这四处。

## Problem

`accept-party` 的标签已经是「接受组队」，回执却是 `墨儿 joined 顾长川's party.`。邀请、拒绝、解散走的是同一段英文回执。

`state.cultivation` 把新角色身上的功法原样交出去。存档里这两门仍是英文名字，代理人读到的也是英文。已经写成中文的功法，例如紫霄吐纳诀，没有这个问题。

闲着的时候，回气丹和镇煞符都列成 `send-message:<id>:gift-item`。代理人只能在请求体里带 `itemId`，两张卡本身分不开。发出去以后，收件人同一刻收到两条内容相同的赠礼消息，消息号还是紧挨着的。

## Goals

- 接受组队的回执写成「墨儿加入了顾长川的队伍。」邀请、拒绝、解散的回执一并改成中文。
- `state.cultivation` 用中文功法名。Loose Breathing 显示为松息吐纳，Light Body 显示为轻身术。存档里的英文字符串不动。已经是中文的名字原样显示。
- 赠礼卡的行动 id 带上物品 id，形如 `send-message:<id>:gift-item:<itemId>`。旧的 `send-message:<id>:gift-item` 仍可提交。请求体里的 `itemId` 在行动 id 没有点名物品时生效。行动 id 里已经有物品时，以行动 id 为准。
- 一份礼物只写一条收件箱消息。

## Non-Goals

- 不改 `/world/map`、大包超时、灵气已满时打坐的空 `completedJobs`，也不改地图图片。
- 不改好感、嫌隙、宿怨、一 tick 只送一次，以及礼物仍要对方收下。
- 不把请离、轮换、候补的回执放进这一轮。
- 不把功法改成新的 id 体系。

## User-Visible Behavior

墨儿接受顾长川的邀请，回执是「墨儿加入了顾长川的队伍。」邀请是「顾长川向墨儿发出了组队邀请。」拒绝是「墨儿拒绝了顾长川的组队邀请。」解散是「顾长川解散了队伍。」

新角色的 `state.cultivation.mainTechnique` 是松息吐纳，`techniques` 是松息吐纳和轻身术。角色自己身上存的仍是 Loose Breathing 和 Light Body。云中鹤的紫霄吐纳诀、清风步不变。

身上同时有疗伤丹和镇煞符时，两张赠礼卡的行动 id 不同，分别带上 `healing-pill` 和 `ward-talisman`。提交带物品的那条，送的就是那一件，不再总是袋子里的第一件。只提交旧 id、并在请求体里写 `itemId`，送的也是那一件。两种都不写时，仍送袋子里的第一件。

收件人这一刻只多一条「的赠礼」。

## Constraints

- 旧客户端继续提交 `send-message:<id>:gift-item` 加请求体 `itemId` 时，结果里的 `actionId` 仍是它提交的那条。
- 功法的存档字符串不改，已经读这几个英文字的内部比较不用跟着改。
- 物品 id 仍是目录里的 id。卡面的标签和说明继续用中文名。

## Acceptance Criteria

- 接受组队的回执是「加入了……的队伍。」，不含 `joined`。
- 新角色的 `state.cultivation` 是松息吐纳和轻身术，存档仍是 Loose Breathing 和 Light Body。
- 两件可赠之物列出两个不同的 `gift-item:<itemId>`。用其中一条送出时，扣的是那一件。
- 请求体 `itemId` 配旧行动 id，也能送出点名的那一件。
- 一次赠礼只增加一条赠礼消息。
- 相关领域测试和代理人状态路由测试通过。

## Open Questions

- 没有。

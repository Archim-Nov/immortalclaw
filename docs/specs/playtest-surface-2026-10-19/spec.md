# 试玩扫出的两处门口文案

## Summary

2026-10-19 线上试玩里，墨儿看见的道心岔路把接口和英文选项 id 写在句子里。同一天她站在青州甲级地宫门口，八荒令、仙缘都够，入口却因为时辰关着，行动列表上连一句原因都没有。这一轮只补这两处给人看的字。

## Problem

道心岔路还停着的时候，`GET /agent/actions` 那张 `resolve-morality-event-choice` 的标签和说明里写着 `/agent/act`、`POST /agent/events/choose`、`choiceId`，选项也写成「把整筐送下去（deliver）」。误把这张卡交给行动接口，回执同样把这些词再说一遍。试玩的人读到的是接口，不是眼前那条岔路。

八荒入口关着时，`canEnterBahuang` 已经能说出「八荒入口关着，再过若干刻才开」，没有令、贡献不够、感应不够、境界不到，也各有一句中文。行动列表只在进得去的时候放出三张 `enter-bahuang`。进不去就整段不出现。身上有伤时外层判断直接跳过，门口同样一声不吭。人只看见归虚、进地宫、买令，不知道八荒为什么进不去。

## Goals

- 道心岔路的标签、说明和误交回执都用中文说出标题、选项名，并说明这张不是寻常行动，要在道心这一处自己选。
- 这些句子里不出现 `/agent/act`、`/agent/events/choose`、`POST`、`choiceId`、`optionId`，也不出现英文选项 id。
- 机器还要认路的话，走卡片上的 `routing`：`path`、`choiceId`、`optionIds`。不写进句子。
- 人在八荒入口、手头没有荒野或八荒远征时，进得去仍是三张 `enter-bahuang`。进不去至少有一张「看八荒入口」，说明就是那句中文原因。
- 身上有伤之类进不了高风险的情形，门口也留一句，例如「身上有伤，八荒进不去。」
- 交出这张门口卡时不进八荒，回执复述同一句原因。

## Non-Goals

- 不改道心结算，也不改 `POST /agent/events/choose` 的请求形状。
- 不改八荒令的价钱、窗口长度、入境境界和贡献门槛。
- 不改归虚、地宫和买令。
- 不改主人控制台里本来就给操作者看的接口按钮。

## User-Visible Behavior

「学徒的篮子」还停着时，卡片叫「道心岔路待选」。说明写出可以把整筐送下去，也可以拿走好的那几株，并说硬交不会把路选上，要在道心这一处自己选。括号里不再跟英文 id。

人站在青州甲级地宫门口，窗口关着，看见「看八荒入口」，说明是「八荒入口关着，再过若干刻才开。」没有八荒令，说明是「没有八荒令，进不了八荒。」身上有伤，说明是「身上有伤，八荒进不去。」窗口开着、其余条件也够，仍是稳妥、均衡、凶猛三张进八荒，不再另放这张看门口的卡。

## Constraints

- `resolve-morality-event-choice` 和 `enter-bahuang:conservative|balanced|aggressive` 的 id 不改。
- 误交道心卡仍是 `accepted: false`，待选的岔路还在。
- 看门口的卡 id 是 `inspect-bahuang-gate`。交出以后 `accepted: false`，不扣令，不开远征。
- 人不在入口，或者已经在荒野、八荒里面，不另放这张卡。

## Acceptance Criteria

- 有待选道心时，标签和说明含中文选项名，不含接口路径、`choiceId`、`optionId` 和英文选项 id。`routing` 仍带路径、choice id 和选项 id。
- 误交 `resolve-morality-event-choice` 时 `accepted: false`，回执能看懂要去道心那一处选，句子里没有上述接口字样。
- 入口地点、窗口关闭或没有八荒令时，行动列表有「看八荒入口」，说明等于 `canEnterBahuang` 的中文原因。
- 入口地点、窗口开着且条件满足时，仍是三张 `enter-bahuang`，没有看门口的卡。
- 入口地点、身上有伤时，有一张说明是「身上有伤，八荒进不去。」交出后回执相同，伤势和背包不变。

## Open Questions

- 没有。

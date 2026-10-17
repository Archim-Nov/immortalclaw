# 甲级进门到守关

金丹站在 `yangzhou:dungeon-a`，甲级一层还没开过。

1. 筑基在同一门口只看见进不去的卡，句子里有丹霞内府、金丹、丹霞露，没有 `enter-dungeon`。
2. 金丹的行动列表有 `enter-dungeon:rank-1:conservative`、`balanced`、`aggressive`，没有 `start-dungeon-expedition`。
3. 进门卡写着三十刻，并写明岔路和侧室在守关前面。
4. 用均衡或冒进走进去。守关出现之前，行动列表里除了 `abort-dungeon-expedition`，还有 `choose-event` 或 `dungeon-wake-decision`。
5. 直接提交 `start-dungeon-expedition:rank-1:balanced` 仍能开同一趟三十刻的远征。

领域回归在 `packages/domain/src/jia-midrun.test.ts`。

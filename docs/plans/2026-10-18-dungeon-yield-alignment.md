# 地宫预估和实际掉落对齐

Spec: `docs/specs/dungeon-yield-alignment/spec.md`

## Approach

门口的区间本来就在 `ESTIMATED_MATERIAL_YIELD_BY_BAND`。远征每一步给材料时，按这一趟还差多少主材、后面还剩几步，决定这一步给主材还是池里别的。走完全部步数仍低于下限，结账前补到下限，再写战报。

甲级按层换主材：一到三层金灵花，四到六层婴火莲，七到九层神念晶。乙级、丙级主材仍是原来的玄英石、云心草。境界路线和突破来源改成同一句话。

战报若还要提最后一场的「带出何物」，改成「最近一场胜仗当场……这一笔已经算进上面的总数」，并且从「记得最清楚」和最近一战里拿掉那句未说明的副本。

见闻从还没用过的句子里抽。同一标题用过就不再抽。一阶的句子补到够走完十步。

## Files

- `packages/domain/src/dungeon-expedition-service.ts`
- `packages/domain/src/engine.ts`
- `packages/domain/src/realm-path.ts`
- `packages/domain/src/model.ts`
- `packages/domain/src/dungeon-yield-alignment.test.ts`

## Verification

- `node --import tsx --test packages/domain/src/dungeon-yield-alignment.test.ts`
- 相关既有地宫测试
- `npx tsc -p tsconfig.json --noEmit`

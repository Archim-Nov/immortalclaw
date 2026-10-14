# 破境方式按境界分开

## Summary

炼气和筑基仍在自己的洞府里破境。金丹、元婴、化神不再共用同一个 `residence-breakthrough`。每一档在 `state.realmPath` 和可用行动里写明去哪、和谁一起、按什么顺序做。材料、掉落和成败的数值底子沿用金丹之后那一档，不另开一条经济。

## Problem

境界升高以后，破境还是同一颗按钮：材料齐了，回洞府，等几个时辰。金丹后期进元婴、元婴后期进化神，只是材料更贵、失败会受伤。代理人读到的 `realmPath` 也只说回洞府。境界变了，做法没有变。

## Goals

- 炼气、筑基保持洞府破境。小突破必成，大境界仍按原来的成功率，失败只掉材料和进度，不挂伤。坊市购买不变。
- 金丹前期和中期走结丹仪。人要到宗门驻地，用 `core-rite:steady`。眼前有人，或护法还守着，可以在洞府或驻地用 `core-rite:press` 催丹。催丹更快，大约四分之一的机会留下一段短走火，境界仍然过去。
- 金丹后期进元婴走婴火淬体。地点是宗门驻地或甲级地宫门口，行动是 `infant-fire-temper`。可以一个人做。有护法或同伴在同一处，成功率高一截。失败时婴火反噬，伤比早期大境界重。
- 元婴里的两层小突破走魂灯守夜。先在自己的洞府 `begin-soul-vigil`，灯还亮着再用 `seal-soul-vigil`。材料在收口时才耗。灯灭了不扣材料，重新点。
- 元婴后期进化神走天劫。地点是荒野或甲级地宫门口，行动是 `face-tribulation`。一个人迎，失败时伤更重。有同伴在同一处，成功率高一点，失败时雷会分掉一点，同伴也挂一点伤。
- 化神里的两层小突破走神纹。先在宗门驻地 `begin-divine-step`，再用 `seal-divine-step`。有人看着，印落得稳。一个人落印也能成，但会挂一点伤。
- `state.realmPath.method`、`methodName`、`sequence` 和 `state.breakthrough` 上的同名字段，写出这一档的做法。`sequence` 是完整的句子，点明地点、行动和顺序。金丹后期起，安静摘要里的 `digest.nextStep` 也改口，不再说回洞府按老按钮。
- 境界不到的时候用 `residence-breakthrough`，会得到一句中文说明，指向这一档真正的行动。

## Non-Goals

- 不改各阶的材料种类、数量、坊市是否可买、地宫掉落层数。
- 不改成败之后的气血、灵力、属性包、名声和宗门贡献门槛。
- 不改战斗目录、队伍、社交和人情的规则。护法仍是原来的 `guard-breakthrough`，守在身边时算数。
- 不新增炼虚或更高的境界。
- 不强迫金丹以后的人必须有同伴才能破。同伴改变的是风险和说法，不是把单人修士锁死。

## User-Visible Behavior

炼气修士材料齐了，仍在自己的洞府看到 `residence-breakthrough`。`realmPath.method` 是 `residence`。摘要在无事时仍是「过得平常」，没有 `nextStep`。

金丹前期的人在洞府里看不到洞府破境。`realmPath.sequence` 让他去宗门驻地走 `core-rite:steady`。驻地里这个行动会出现。若另一位修士站在同一处，`core-rite:press` 也会出现。催丹成功时，大约四分之一的机会多一段短走火。

金丹后期的 `realmPath.method` 是 `infant-fire`。人站在甲级地宫门口或宗门驻地，材料齐了，才能 `infant-fire-temper`。失败的日记写婴火反噬，进度退到六成，人受伤，并有走火。成功进入元婴，气血和灵力仍按原来的幅度涨。

元婴前期先点魂灯，再收口，`realmPath.method` 是 `soul-vigil`。元婴后期的 `method` 是 `tribulation`，人得到荒野或甲级门口去迎雷。化神的 `method` 是 `divine-pattern`，驻地里分两步落印。

## Constraints

- 行动是加上去的。`residence-breakthrough` 仍留在炼气和筑基。
- `realmPath` 和 `breakthrough` 上的新字段可以缺省，旧的读取方不用改。新世界会把这些字段填上。
- 句子用中文，说完一个意思。地点、行动标识和顺序写在同一段话里。
- 身上有伤时，金丹及以后的破境不做。先疗伤。炼气和筑基的洞府破境仍按原来的规则，伤着也能试。

## Acceptance Criteria

- 炼气、修为已满、材料已齐时，洞府里仍有 `residence-breakthrough`，做成后进入下一层。`realmPath.method` 是 `residence`，不提元婴。
- 金丹前期在洞府使用 `residence-breakthrough` 会被拒绝，说明指向结丹仪。人在宗门驻地可以 `core-rite:steady`，做成后境界加一。没有旁人时 `core-rite:press` 会被拒绝。有旁人时催丹可以做成。
- 金丹后期的 `realmPath.method` 是 `infant-fire`，`sequence` 写到 `infant-fire-temper`、宗门驻地或甲级地宫门口。在洞府里这个行动不出现。在甲级门口可以做。失败日记提到婴火，进度为 60，人受伤并走火。成功进入元婴。
- 元婴前期的 `method` 是 `soul-vigil`。`begin-soul-vigil` 不耗材料，`seal-soul-vigil` 才耗，做成后境界加一。灯灭以后收口会被拒绝，材料还在。
- 元婴后期的 `method` 是 `tribulation`。荒野或甲级门口才有 `face-tribulation`。成功进入化神。一个人失败时伤得更重；有同伴在场失败时，同伴也会挂伤。
- 化神前期的 `method` 是 `divine-pattern`。驻地里先铺纹再落印。一个人落印会受伤，有人看着则不挂这点伤。两步做成后境界加一。
- 金丹后期的安静摘要仍含「过得平常」，`nextStep` 写到婴火淬体，而不是只说回洞府。

## Open Questions

- 没有。化神后期之上这一轮仍不继续加境。

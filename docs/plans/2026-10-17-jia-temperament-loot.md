# 甲级带出按气质分池

## Linked Spec

- `docs/specs/jia-temperament-loot/spec.md`

## Goal

让甲级撤出和走完的旁支跟着丹霞、火毒、阵纹走，并让中途抉择和是否走完改到真正入包的份数。

## Architecture

气质、份数和摘要句子放在 `packages/domain/src/jia-temperament.ts`。物品进现有目录，不另做背包。

层数决定气质：一层、四层、七层是丹霞余砂，二层、五层、八层是火毒凝滴，三层、六层、九层是阵纹残片。远征开始时写在进度上。甲级中途的闲事只从这一池抽，池子仍是原来的八个场面。

撤出（已经走出至少一步）或走完时，在丹霞露和来源物同一段里把专属物加进袋子，再合并进 `secondaryDrops`，然后写战报。走完的底数是两份、三份、四份，按一到三层、四到六层、七到九层。中途撤出是一份。险再加一份，走减一份，帮换成下一池。放弃和被抬出来不发。

选走时若身上有伤，当场按下去两刻。见闻先记下这一择，东西仍等到撤出或走完才入包，避免抉择发生在两步之间时战报漏记。

## Tasks

### 气质与物品

- 三件不出售的材料，名字是丹霞余砂、火毒凝滴、阵纹残片。
- 门口收获提示带上这一层的那一件。

### 入账与摘要

- 与丹霞露同一段先入账再写报。
- 摘要写明走完或中途撤出，并写出份数和地名。
- 见闻复述同一句。

### 中途抉择

- `choose-event:risk`、`help`、`walk` 改 `jiaHaul`。
- 取仍只动灵石。

## Verification

- `node --import tsx --test packages/domain/src/jia-temperament.test.ts`
- 既有的甲级战报、乙级中途、组队投票测试
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `AGENTS.md`、`README.md`、`apps/web/public/skill.md`、`apps/world-do/src/agent-guides.ts`
- `docs/specs/README.md`、`harness/README.md`、`harness/scenarios/jia-temperament-loot.md`

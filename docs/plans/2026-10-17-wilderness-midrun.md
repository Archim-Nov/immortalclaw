# 荒野层两步岔路

## Linked Spec

- `docs/specs/wilderness-midrun-v1/spec.md`

## Goal

让走进九州荒野的人，在再探和撤出之外，先答这一处自己的两步中文岔路。

## Architecture

场面放在 `packages/domain/src/wild-beats.ts`，跟 `wild-places.ts` 的地名走，不另做一层地宫。进度仍写在原来的 `WildernessProgress` 上，多三个可选字段：已经走完几步、下一步从哪一刻出现、当前这一步的 id。旧档没有这些字段时，从第一步算起。

岔路还开着时，`applyWildernessPressure` 照样扣气血和灵力，也照样写原来的见闻，但是不撤出，也不发这一步的东西。第一步答完以后过两刻才武装第二步。第二步还没出现、生存时限到了，仍走原来的撤出。

行动列表在这一步开着时只给三个 `wild-choice` 和撤出。同伴不投票。八荒的函数不读这张表。

## Tasks

### 场面

- 九处各两步，做法的句子不重复。
- 历练跟这一处的兽和状态。奇遇或人情跟这一处已经有的物件，比如露、网、路碑、茶案。

### 进度与行动

- 读行动、读状态、或压力走一刻时，把到点的那一步挂上。
- 摘要、游记、digest 用中文见闻。拿走的东西只在选中时入包。
- 再探的完成句在有地名时改成中文，避免这一层的摘要漏出英文。

### 说明

- `AGENTS.md`、`README.md`、`skill.md`、heartbeat、`renderSkillMarkdown` 写明这两步，并写明这一层仍是一个人走。
- 补一条 harness 场景。

## Verification

- `node --import tsx --test packages/domain/src/wild-beats.test.ts packages/domain/src/wilderness.test.ts packages/domain/src/wild-places.test.ts`
- `tsc -p tsconfig.json --noEmit`

## Doc Updates

- `docs/specs/wilderness-midrun-v1/spec.md`
- `AGENTS.md`
- `README.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
- `apps/world-do/src/agent-guides.ts`
- `harness/scenarios/wilderness-midrun-v1.md`
- `harness/README.md`

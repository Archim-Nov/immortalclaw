# 八荒均衡也先停下一次

## Linked Spec

- `docs/specs/bahuang-balanced-first-wake/spec.md`

## Goal

还没有岔路的八荒，下一步深度一定停下。稳妥和均衡跟凶猛一样。后面仍按原来的概率抽，一趟仍最多三处。每段再加一处中文场面。

## Tasks

- `createWakeNode` 在 `encounteredWakeNodes` 还是空的时候直接生成岔路，不再只看凶猛。
- `bahuang-scenes.ts` 给荒尘驿、断碑原、无灯壑各加一处三到四个中文做法。
- `bahuang-midrun.test.ts` 用均衡进门，推进到深度增加，断言撤出前已有岔路。稳妥偏守放在同一次检查里。

## Verification

- `node --import tsx --test packages/domain/src/bahuang-midrun.test.ts packages/domain/src/bahuang-ticket.test.ts packages/domain/src/dungeon-midrun-sights.test.ts`

## Doc Updates

- `docs/specs/bahuang-balanced-first-wake/spec.md`
- `AGENTS.md`
- `README.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
- `harness/scenarios/bahuang-midrun-deepen.md`
- `harness/README.md`

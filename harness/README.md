# Harness Directory

This directory is reserved for validation assets that make the project easier to exercise, understand, and eventually evaluate automatically.

## Intended Structure

- `scenarios/`: human-readable scenarios and walkthroughs worth validating
- `fixtures/`: reusable sample state, payloads, and other setup artifacts
- `evals/`: future automated evaluation definitions and related support files

## Current Scope

At this stage, harness engineering is intentionally lightweight. The repository is creating a stable home for scenarios and validation intent before adding heavier automation.

Current high-value scenarios:

- runtime API smoke: fetch health, state, actions, and act through `apps/runtime-worker`, which now forwards to the Durable Object
- hosted onboarding smoke: register an agent, authenticate with a bearer token, and read agent state through `apps/runtime-worker`
- scheduled tick smoke: advance the world through the Durable Object alarm path and verify tick metadata
- web shell smoke: confirm the Vite/Pages frontend build scaffold and browser entrypoint wiring

The first explicit end-to-end scenario now lives at `harness/scenarios/runtime-action-and-tick.md`.
Dungeon entry must finish or fail cleanly: `harness/scenarios/dungeon-enter-unstick.md`.
An aggressive low-qi run must eject with a report: `harness/scenarios/dungeon-aggressive-collapse.md`.
Favors, rivals, board notes, and a harder aggressive rank live at `harness/scenarios/social-and-higher-dungeon.md`.
Shared dungeon runs, richer board notes, and the longer sect chain live at `harness/scenarios/shared-dungeon-and-sect-chain.md`.
Finding someone in the same city, reading a gift or duel afterward, and seeing a dungeon share before it starts live at `harness/scenarios/nearby-party-and-aftermath.md`.
Registered agents stay visible in a crowded city, a party of five can share one dungeon, and fights leave a short note: `harness/scenarios/nearby-agent-priority.md`.
A city party explains the gate, fights name a stance, and the social inbox stays short: `harness/scenarios/party-city-and-fight-rhythm.md`.
A greet can start a party invite, later agents get a social page, and a fight notes the consequence: `harness/scenarios/social-page-and-invite-path.md`.
Dungeon guardians resolve as turn-based fights with a role and named skills: `harness/scenarios/dungeon-turn-combat.md`.
City duels, a chosen role, a reserve seat, and small skill practice: `harness/scenarios/combat-party-deepen-v2.md`.
Named aftermath notes, harder rank 3 packs, and a wound a teammate can tend: `harness/scenarios/combat-deepen-v3.md`.
Weapon families and the five root schools each run from 入门 to 化神, with a shop, a sect exchange, and a realm gate: `harness/scenarios/combat-content-deepen-v1.md`.
金丹后期往后的元婴和化神，材料在甲级高层，破境可能受伤: `harness/scenarios/realm-ladder-past-core.md`.
甲级三层秘境的守关各有压力，输了会挂伤掉灵石: `harness/scenarios/high-realm-dungeon-pressure.md`.
炼气仍在洞府破境，金丹走结丹仪，元婴点魂灯或迎天劫，化神在驻地落神纹: `harness/scenarios/breakthrough-methods.md`.
A spoken line on chat, gift, and a doorway call, plus one reply: `harness/scenarios/social-spoken-lines.md`.
A shared dungeon copies `combatRounds` onto each companion, and the closing note names a role, a skill, a spoken line, and a tended wound: `harness/scenarios/companion-shared-report.md`.
A personal favor, a note left for someone away, and a rumor a neighbor can repeat: `harness/scenarios/social-deepen.md`.

A favor repaid in words, a digest that names the people, and a reunion after travel: `harness/scenarios/favor-chains.md`.
A dungeon run wakes in Chinese, with three or four mid-run choices, and leaves a 见闻 plus 带出何物 when a fight is won: `harness/scenarios/dungeon-midrun-sights.md`.
Five cultivators on one dungeon leave a tended wound, a yielded pile, a crack over an unclaimed find, and paired lines on both digests: `harness/scenarios/party-expedition-social.md`.
A finished 甲 run leaves one 残页, 炉灰, or 纹屑, and a companion can quote the same arc line: `harness/scenarios/jia-relic-chronicle.md`.
乙级一到三层是雷泽残阵，四到六层是沉雾沼，七到九层是铜棺窟。丙级七到九层是旧驿石廊: `harness/scenarios/yi-mystery-identity.md`.
九州各有一处只能从这一州进去的秘境，主城和宗门驻地另有三处短洞: `harness/scenarios/regional-dungeons-v1.md`.
排名层和州府秘境在进门与守关之间还有侧室、探路和有名字的中途敌人: `harness/scenarios/dungeon-interior-v1.md`.
九州荒野各有一处名字，八荒按深浅分成荒尘驿、断碑原、无灯壑: `harness/scenarios/wild-route-identity.md`.
The OpenClaw onboarding walkthrough now lives at `harness/scenarios/openclaw-self-serve-onboarding.md`.
洞府升阶和绝品陈设是灵石无底洞，夺下的边寨 materials 改口为本宗出产: `harness/scenarios/residence-sink-v1.md`.

Fast local smoke entrypoint:

- `npm run smoke:onboarding`
- `npm run smoke:questionnaire-to-register`

`npm run smoke:onboarding` runs the registration flow entirely in memory through `apps/runtime-worker`, generates a synthetic agent, answers the full 18-question questionnaire, derives the canonical `registration_record`, and prints the real registration, state, and actions payloads. Use it as the default inner loop before slower OpenClaw checks.

`npm run smoke:questionnaire-to-register` is the inspection-heavy variant. It keeps the same in-memory runtime path, but also prints the raw 18 answers and the full derived `registration_record`, so you can verify the questionnaire-to-register chain without launching OpenClaw.

Use `docs/process/harness-engineering.md` for the workflow guidance and `docs/templates/harness-checklist.md` for the first-pass format.

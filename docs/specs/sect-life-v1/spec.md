# Sect Life

## Summary

Cultivators who belong to a sect can hold a real post, do the work of that post, and move the sect itself. Spirit veins, herb fields, and mines sit on the existing map and yield the same breakthrough and meditation materials the realm ladder already uses. A sect that has grown past the outer court can raid another sect's node. A personal fight still uses the existing grudge ladder, and the next meeting is tense.

## Problem

Sect membership currently records contribution, a title, and a task board. The sect's numeric level is only the square root of personal contribution. Nothing on the map belongs to a sect, so taking territory cannot change what the sect produces. After a duel the grudge number rises, but the next conversation still sounds like a greeting.

## Goals

- A member can take, hold, and resign one of five posts: 外门杂役, 内门修炼, 执事, 长老, 掌门席. Each post has a slot cap, a readable requirement, and a duty.
- Completed duties and sect chains add sect merit. Merit, together with owned nodes, raises a named sect tier from 初立山门 to 一州之望. Player-sect merit also counts toward the existing contribution level.
- Each state has three map nodes: a herb field, a mine, and a spirit vein. They produce the breakthrough and meditation materials of a realm band. 炼气 and 筑基 nodes stay in safe and low states. 金丹, 元婴, and 化神 nodes appear from medium and high states. Gathering is limited by the cultivator's realm.
- An elder, a sect master, or a 筑基 steward can raid an enemy node in the same state. Success transfers ownership and therefore production. Failure costs contribution, leaves an injury, and can be written up. The losing sect hears 山门失守.
- A city duel, a wilderness fight against another cultivator, or a raid against someone standing on the node uses the existing 嫌隙 and 宿怨 ladder. A raid also grudges one or two defending members when nobody is standing on the node, and records a 边衅. See `docs/specs/raid-feud-and-jia-gate/spec.md`. The next meeting offers a hard spoken line, 拒礼, and a rematch. The digest can say 剑拔弩张.

## Non-Goals

- Replacing sect titles, the sect task board, faction wars, or the relationship model.
- A full sect diplomacy layer, alliances, or a siege that lasts many days.
- Letting a 炼气 cultivator loot 丹霞露 or declare war on the first day.

## User-Visible Behavior

`state.sectLife` is present for a player-sect or neutral-sect member. It names the post, the tier, the next requirement in a complete sentence, what to do today, the nodes in that state, the chains that can be started here, and any raid that is legal.

Action ids:

- `take-post:outer-chore|inner-cultivate|steward|elder|master-seat`
- `resign-post`
- `post-duty`
- `sect-chain:transmit|patrol|guard-vein|recruit-chore|escort|council`
- `gather-vein:<veinId>`
- `declare-raid:<veinId>`
- `refuse-gift:<cultivatorId>` when a 嫌隙 or 宿怨 is standing nearby

Node bands and materials:

- 炼气: 凝气清露, 青冥石髓, 洗脉莲心露
- 筑基: 定基灵珀, 御风凝晶, 九转凝丹砂
- 金丹: 流霞丹英, 龙曜灵晶, 丹霞露
- 元婴: 婴火莲, 元胎玉, 魂灯芯, 养婴露, 固婴砂, 九转紫金髓, 养魂砂
- 化神: 神念晶, 天魂丝, 神纹石, 破婴神莲, 神胎露, 化神金章, 神纹尘

Safe and low states grow 炼气 and 筑基 nodes. Medium states add a 金丹 mine and a 元婴 vein. High states add 金丹, 元婴, and 化神 nodes. A node yields one portion every four ticks, two portions once the sect is 中宗 or higher. Stock is capped.

A 嫌隙 gift can still be handed over, but affinity does not rise, and the digest can say 剑拔弩张. A 宿怨 gift is refused on the spot: the item stays with the giver. `refuse-gift` stays listed while that person is nearby, including after a chat. A same-sect gift is a little warmer. Chat with a feud does not raise affinity.

## Constraints

- Extend `WorldState`, sect records, and the existing grudge helpers. Do not add a second hatred score.
- Veins anchor to locations that already exist, so topology does not grow a new node type.
- Early posts and the neutral sect's herb field must work at 炼气. Raids start at 筑基.
- Chinese agent copy is complete sentences.

## Acceptance Criteria

- Taking and resigning 外门杂役 updates `sectPost` and `state.sectLife`.
- Four outer duties raise the sect from 初立山门 to 小宗, and the next requirement says what 中宗 still needs.
- A owned herb field yields a 炼气 breakthrough material. A 金丹 mine can yield 丹霞露 to a cultivator who has reached 金丹.
- A successful raid changes the node's owner. The previous sect's members get a 山门失守 line. A failed raid leaves an injury and costs contribution.
- After a city duel the pair is at least 嫌隙, the next chat is a hard sentence, `refuse-gift` is offered, and the digest can say 剑拔弩张.
- A gift during that 嫌隙 does not raise affinity, and the digest can say 剑拔弩张. After it becomes 宿怨, the gift is refused, the item stays, and the digest can say 礼没收下. `refuse-gift` is still listed after chat-up has gone on cooldown.

## Open Questions

- Whether player sects should start with a thin vein of their own, instead of claiming the wild mine at 筑基, can wait until sect founding is played more.

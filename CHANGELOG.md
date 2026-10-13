# Changelog

## Unreleased

### 切磋、站位和候补 / Duels, roles, and reserves

城里的切磋改走和地宫守关同一套回合战斗。两边都按自己的站位出招。游记里除了原来的起手和灵气，还会多一句双方都能复述的切磋，写明使出了哪一式。灵石、声望、好感和对手记录仍按原来的胜负、撤退和平手结算。

`set-party-role:dps|breaker|guard|support|control` 把站位改成主攻、破法、护卫、辅助或控场，但只有这套兵器、法器和灵根站得住的位置才选得了。`equip-skill-slot:<skillId>` 往随身招位里装或卸，最多三式。`clear-skill-loadout` 清空招位，战斗改用这个站位能用的全部招。`combatProfile` 上能看到 `legalPartyRoles`、`preferredPartyRole`、`equippedSkillIds`、`equippedSkills`、`skillProficiency` 和 `roleExperience`。

地宫开跑时已经算进来的同伴，中途离开门口不会被悄悄抹掉。要退出用 `leave-shared-expedition`。队伍仍是五人。满员以后外人用 `queue-party-reserve:<leaderId>` 候补，队长用 `party-rotate:<memberId>` 轮换，或用 `party-kick:<memberId>` 请人离队。`leave-party-reserve` 退出候补。

出招和打赢会积一点熟练。威力每点加 0.2%，24 点封顶，也就是 4.8%。炼气单人打不过寻常守关，三人小队都能打，五人混合和五主攻一样能过 1 到 3 阶。

City duels now use the same turn-based skill fight as dungeon guardians. Both travelogues gain a short 切磋 line naming the skills, while stones, reputation, affinity, and the rivalry note stay on the old outcome rules.

`set-party-role:<role>` chooses 主攻, 破法, 护卫, 辅助, or 控场 when the loadout can stand there. `equip-skill-slot:<skillId>` toggles one of three ready skills. `clear-skill-loadout` clears them. The combat profile exposes the legal roles, the choice, the ready skills, and the small practice totals.

A companion who was on a dungeon run when it started is not dropped for stepping away. `leave-shared-expedition` is the explicit exit. The field stays at five. `queue-party-reserve:<leaderId>`, `party-rotate:<memberId>`, `party-kick:<memberId>`, and `leave-party-reserve` are the reserve, swap, kick, and cancel actions.

Skill practice adds 0.2% power per point and stops at 24 points, 4.8%. A solo 炼气 cultivator does not clear an ordinary guardian. Trios do. A mixed party of five clears ranks 1–3 as reliably as five damage dealers.

### 地宫回合战斗 / Dungeon turn combat

地宫守关不再只扣一笔气血和灵力。守关会按速度排序回合，命中、闪避、会心沿用现有战斗数值。每人按兵器、法器和灵根自动站到主攻、破法、护卫、辅助或控场，并打出这个搭配真正会的招。剑会剑引，枪会枪出，法器补上对应五行的术，灵根对不上时威力收一成。贵的爆发招灵力高、冷却长，群攻单目标更亏。

`combatProfile.partyRole` 和 `combatProfile.availableSkills` 给代理看当前职责和招式。`dungeonExpedition.lastReport.combatRounds` 最多留下三场，每场一到三句中文，写明谁出了什么招、结果是胜、负还是撤。`summary` 会复述最近一战。探路步骤、30 tick 的入宫、门口同行、五人上限都不变。没有新的 action id。

Guardian rooms inside a dungeon expedition now resolve as turn-based fights. Turn order follows speed. Hit, dodge, and crit use the existing combat numbers. Each cultivator is assigned 主攻, 破法, 护卫, 辅助, or 控场 from their weapon, spell, and spirit root, and can only cast skills that combination unlocks. A sword learns 剑引, a spear learns 枪出, and a spell focus adds that element. If the element is not in the root, the skill is slightly weaker. Expensive bursts cost spirit and a cooldown. Area attacks are weaker per target.

Agents read `combatProfile.partyRole` and `combatProfile.availableSkills`. `dungeonExpedition.lastReport.combatRounds` keeps up to three fights, each with one to three Chinese beats naming who used which skill and whether the room was a win, a loss, or a withdraw. The summary repeats the latest fight. Search steps, the 30-tick enter, gate sharing, and the party cap of five are unchanged. There is no new action id.

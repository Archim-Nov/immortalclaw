# Changelog

## Unreleased

### 地宫回合战斗 / Dungeon turn combat

地宫守关不再只扣一笔气血和灵力。守关会按速度排序回合，命中、闪避、会心沿用现有战斗数值。每人按兵器、法器和灵根自动站到主攻、破法、护卫、辅助或控场，并打出这个搭配真正会的招。剑会剑引，枪会枪出，法器补上对应五行的术，灵根对不上时威力收一成。贵的爆发招灵力高、冷却长，群攻单目标更亏。

`combatProfile.partyRole` 和 `combatProfile.availableSkills` 给代理看当前职责和招式。`dungeonExpedition.lastReport.combatRounds` 最多留下三场，每场一到三句中文，写明谁出了什么招、结果是胜、负还是撤。`summary` 会复述最近一战。探路步骤、30 tick 的入宫、门口同行、五人上限都不变。没有新的 action id。

Guardian rooms inside a dungeon expedition now resolve as turn-based fights. Turn order follows speed. Hit, dodge, and crit use the existing combat numbers. Each cultivator is assigned 主攻, 破法, 护卫, 辅助, or 控场 from their weapon, spell, and spirit root, and can only cast skills that combination unlocks. A sword learns 剑引, a spear learns 枪出, and a spell focus adds that element. If the element is not in the root, the skill is slightly weaker. Expensive bursts cost spirit and a cooldown. Area attacks are weaker per target.

Agents read `combatProfile.partyRole` and `combatProfile.availableSkills`. `dungeonExpedition.lastReport.combatRounds` keeps up to three fights, each with one to three Chinese beats naming who used which skill and whether the room was a win, a loss, or a withdraw. The summary repeats the latest fight. Search steps, the 30-tick enter, gate sharing, and the party cap of five are unchanged. There is no new action id.

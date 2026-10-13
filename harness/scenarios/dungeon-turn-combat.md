# Dungeon turn combat

A cultivator with a starter sword and a metal-edge spell reads `combatProfile.partyRole` as 破法 and sees 剑引, 拆招, and 寻常一击 in `availableSkills`. 枪出 is absent.

They enter an uncleared rank-1 dungeon. When the run ends, `dungeonExpedition.lastReport.combatRounds` has at least one fight. The beats name a role and a skill, and the outcome is win, loss, or withdraw. The summary repeats that fight. The cultivator is back in a safe place, and the job is gone.

If a companion was idle at the gate, that companion's name is on the fight, they never held their own job, and `sharedDungeon` is clear after the run.

An empty ally list passed to the fight helper withdraws and says nobody stepped in. It does not throw.

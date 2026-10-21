# Changelog

## Unreleased

### 开源协作与部署入口 / Contribution and deployment documentation

Added a local Node/SQLite quickstart, contributor and reporting entrypoints, a dated public deployment evidence record, a licensing inventory, and a manual release checklist. The README now lists the self-hosted runtime and labels removed Cloudflare deployment automation as historical. Deployment credentials, backups, and SQLite files are ignored. The existing combat test fixture now respects readonly loadout arrays and asserts acquisition paths before reading them, allowing the full TypeScript build to pass. Runtime and gameplay behavior are unchanged.

### 站位回执改成中文 / A party-role receipt stays in Chinese

`set-party-role` 成功以后，回执写成「某人把站位换成了护卫。」一类的句子，后面仍接原来的兵器或法术偏向。主攻、破法、护卫、辅助、控场都是这一句。行动 id 留在行动列表上，不写进这句话。

A successful `set-party-role` receipt now says the cultivator changed stance, in Chinese, and keeps the existing leaning hint. The action id stays on the action list.

### 主题洞收束不能跳过探路 / A manual close cannot skip the passage

九州主题洞进门以后，行动里只有当前这一步探路和退出。遇敌或人情要等探路走完才出现。收束、侧室和更里面要等这两步都走完才出现。探路还开着时直接去收会被拒绝，签名物不进袋子。时辰到了也不跳过去。两步走完以后，手动收束和超时都能把签名物放进袋子。散修旧洞、游商暗仓、古修闭关室仍是进门就能选。

On a state dungeon the action list is only the open passage step and leave. The foe or favor appears after the scout. The signature choice, the side room, and the farther room appear after both steps. Submitting the close early is refused and does not grant the drop. A timeout still waits. Once the passage is empty, a manual close or a timeout can grant it. The three shorter caves are unchanged.

### 元婴和化神按阶段换做法 / A different rite for each phase

元婴前期到宗门驻地或甲级门口炼婴，中期才回洞府守魂灯，后期仍去渡劫。化神前期在驻地铺神纹，中期到荒野或甲级门口守神台。材料还是原来的甲级层。材料不齐或拿错这一阶的东西，破境不做，袋子里的东西不动。一个人炼婴或守神台会挂一点伤，有人看着就不挂。化神前期和中期的六个时辰摘要不再把人送去迎天劫。见闻和生平是同一句中文，不写行动标识。

元婴前期 refines the infant at a sect outpost or a 甲级 gate. 元婴中期 still keeps the soul lamp at home, and 元婴后期 still faces tribulation. 化神前期 still lays the pattern at a sect outpost. 化神中期 holds the platform in the wilderness or at a 甲级 gate. The materials stay on the same floors. The wrong material is refused and left in the bag.

### 洞府继续烧灵石，夺下的边寨改口 / A deeper cave sink, and a captured camp speaks as ours

洞府升阶的安全州价格是 8000、36000、160000、720000，洞天以后每一重乘三。家具大多到绝品，茶案到仙品，屏风和观景台仍停在宝光。一档的底价是 3600、18000、88000、360000、1600000，再乘每件自己的倍数。把位子补满并升到十二个位子，安全州要两千万灵石以上。

加成仍有顶，比原来松一点：闭关最多多六分进境，疗伤最多快三刻，调息最多多十二点气血，炼制最多约少两成八，待客最多多六点好感，这处府在本州的声望最多涨二十四点。府邸本身会添一点，到不了顶。一件绝品单独也到不了顶。撤下陈设不退灵石，也不再发一次声望。

边寨还在邻宗手里时，materials 仍写邻宗占在本州。夺下来以后改成己宗守着、出产归本宗。还没有主的边寨不写邻宗。

Cave upgrades in a safe state cost 8000, 36000, 160000, and 720000, then triple. Most furniture reaches 绝品. Filling the slots and the cave costs more than twenty million stones. The caps are a little higher and still stop. A captured border camp's materials line speaks as our yield. A neighbor's camp still says 邻宗.

### 地宫里再往里走一段 / Another stretch inside the same doors

排名层仍最多醒三次，第三步仍是伤者。第六步和第八步还可以是枯井、窄梁、残灯、低语或浅滩，四个中文做法，句子里带着这一层的地方。搜寻的第二步和第五步还是原来的那一队。第三步若仍是搜寻，会遇见这一层的后手；第六步若仍是搜寻，后手再加一只精英。雷泽残阵的后手是雷鞭客、跳符修、阵眼客。探路、歇脚、侧室在后一段换成另一句。

州府秘境原来的侧室还在。`active.deeper` 是更里面的一间，做法也是三到四个，仍用 `regional-choice`。答了不结束，也不发签名物。计票和侧室分开，队长已经答了就留下那一句。八荒再多两种醒时：脚印和灭掉的火，仍最多醒三次。

A ranked run still wakes at most three times, and step 3 is still the wounded traveler. Later pauses can also be a dry well, a narrow span, a leftover lantern, a low voice, or a shallow ford. The third search step meets a second named pair, and the sixth can add that pair's elite. State dungeons keep the first side room and add `active.deeper`. 八荒 can also pause on footprints or a dead fire.

### 地宫回来怎么说，侧室听谁的 / Expedition wording and the side-room vote

丙级地宫回来以后，战报、游记和六个时辰的摘要用中文写带回的东西和回到的地方。袋子里的 id 还在，给人看的句子里不再出现 `cloud-heart-grass`、`ruin-fragment` 或 `yangzhou:main-city` 这种内部名字，也不再附一句英文结果。前往、进地宫、走进荒野的行动卡也改成中文。

同队进散修旧洞这类州府秘境时，侧室仍要超过一半才当场锁。队长已经选了、其他人没在时辰里投出多数，窗口关上时留下队长那一句，不再改成稳的那一间。谁都没答，才补上稳的那一句。签名选择超时仍走稳的那一边，掉落和战斗不改。

A finished 丙 expedition now names items and the return place in Chinese on the report, the travelogue, and the six-tick digest. Internal ids stay on the state. Travel, dungeon, and wilderness action cards use Chinese labels. On a party regional run, a side room the captain already chose is kept when the others abstain; an empty tally still writes the safe line. The signature choice still times out to its safe option.

稳妥的丙级第一阶同样会在中途停下来问人。选择写在 `currentJob.meta.dungeonWake` 上，行动列表里也不只剩中止。没人答的时候仍走安全的那一边，不会改成冒进。

A conservative 丙 rank-1 run still pauses for the mid-run choice. The pending scene is on `currentJob.meta.dungeonWake`, and the action list is not abort alone. An unanswered pause still takes the safe option.

### 甲级通关留下的一件东西 / A relic from a finished 甲 run

丹霞内府、婴火莲池、神纹天隙走完以后，袋子里会多一件能拿回去说的东西。丹霞是残页、炉灰或纹屑，婴火和神纹各有自己的三件。只有一份，坊市不收，守关的算法也不改。`lastReport.relic.arcLine` 是那一句。同队的人在自己的战报、游记和六个时辰的摘要里引用同一句，袋子里不会多出一份。中止、撤出，以及丙级和乙级，都没有这件。

回到自己洞府，可以用 `display-relic` 把它摆上案。东西还在袋子里。来的人在洞府的 glance 和 homeLine 里看得见那一句。`clear-displayed-relic` 只是把案清空。

A finished 甲 run leaves one story relic: a page scrap, kiln ash, or pattern flake named for 丹霞内府, 婴火莲池, or 神纹天隙. `lastReport.relic.arcLine` is the sentence. Companions quote it and do not receive a copy. `display-relic` sets it on the cave table without spending the item.

### 同队下地宫的人情 / Party dungeon favors

五个人走同一趟地宫时，第 3、6、8 步会停下来，用中文问一件事。有人挂了伤，可以伸手压住，也可以先走。石室里的灵石可以让出去，也可以钻短路先拿。壁缝里那件东西可以当面分开、让给伤重的人，或者先伸手。队长和还在门口、自己没有开工的同伴都能投 `dungeon-wake-decision`，伤着的人也能看见这张卡。三个人说定了就不用等剩下的人。时辰到了还没说死，就按不伤情分的那边收，冒进也不会替没开口的人去抢。

伸手压伤记下「替我挡了一剑」。让出灵石记下「把灵材让给我」。先伸手或走短路会裂一道嫌隙以下的缝。出地宫时，两边游记和六个时辰的 digest 都写「上回你替我挡了一剑」这一类成对的句子。送到门口的请托，和开跑前约在门口见的那一句，也会各记一次。一个人自己下去，仍走中文的中途醒时：第三步扶起伤者、分一口水、拿走袋子，后面是岔路、残片、同路的人或夺宝。见闻和「带出何物」在同队这一趟里也照旧写。

On a shared run, steps 3, 6, and 8 pause for a Chinese choice about a wound, a pile of stones, and an unclaimed find. The leader and idle companions at the gate vote, including someone who is wounded. Three of five can lock it. A timeout keeps the safe side. The paired 上回 lines land on both travelogues and both digests when the run ends. A fulfilled escort and a recent rendezvous are quoted once each. A solo run still uses the Chinese mid-run wakes, and 见闻 plus 带出何物 still publish on a shared run.

### 地宫中途的见闻 / Mid-run dungeon sights

地宫和八荒的醒时抉择改成了中文。一次仍最多醒三次。第三步还是伤者岔路。后面会遇到岔路、残片、同路的人，或一只两边都看见的袋子，每个场面三到四个做法。每走两三笔，游记和六个时辰的摘要里会有一条见闻。守关打赢时，战报、游记和摘要共用一句「带出何物」。

Dungeon and Eight Wastes wakes are Chinese, still capped at three. Later wakes offer three or four choices. Every few beats, the travelogue and the digest gain a 见闻, and a won fight keeps one reusable 带出何物 line.

### 人情、见闻和说话 / Favor chains, the digest, and spoken lines

办成的请托会记下一条短事由，例如「替我守关」，出现在 `state.owedFavors`。当面 `call-favor`，或后来用另一件请托去还，两边的见闻都会把上回的事和这次的偿还写成一句。替对方的朋友办成，也会点出三个人的名字。六个时辰里若有请托、字条、闲话、同门差事或重逢，摘要先讲这些，并点出最多三个人和一句原话。同队或有人情的人在路上、或在别的城里时，可以 `wait-for`。人到了记一笔重逢，同一对要隔十二刻。

没给 `line` 时，搭讪、送礼、回话、请托和回字条会生成一句完整的话，跟着眼前的事走，不再套同一句客气话。`reply-line` 只回那一个说话的人。话里叫了别人的名字，这句会被拒。

A finished favor keeps a short reason on `state.owedFavors`. `call-favor`, or a later favor for that person or their friend, writes both halves into the digest. The six-tick summary prefers those social beats and names the people. `wait-for` records one reunion. Generated speech is a complete sentence about the scene, and a reply stays with the person who spoke.

### 请托、字条和闲话 / Favors, notes, and gossip

一个修士可以当面请另一个人去采一株云心草、送到地宫门口、在闭关时守在洞府外，或把云心草送给第三人。对方应下或回绝，办成、放下或过了时辰都会改好感、嫌隙和心境。办成了欠一份人情，仍用 `call-favor` 兑。双方游记和 `state.digest` 都会留下这句话。

`leave-note` 可以留给不在眼前的人，`leave-spot-note` 留在安稳的地方。对方回头用 `reply-note` 或 `reply-spot-note` 回一句。同门可以在 `state.sectBoard` 上留话，一起办一趟差事，前辈也可以提点后辈。附近的人会听见知己、嫌隙、城中胜负和黄掉的请托，生成的话有时会把这件事说出来。嫌隙这一阶的名字从误写的「嫩隙」改了过来。

One cultivator can ask another to fetch 云心草, walk them to a dungeon gate, stand watch at a breakthrough, or deliver the herb to a third person. Accepting, refusing, finishing, or letting it lapse changes affinity, grudge, and mood. Success owes a favor `call-favor` can repay, and both digests keep the sentence. A note can wait for someone who is away. Sect-mates share a hall board, one joint errand, and a senior's guidance. Neighbors hear gossip about a 知己 bond, a 嫌隙, a city win, or a failed favor. The grudge stage at 8 is named 嫌隙.

### 同伴也能读到的战报 / Companion combat rounds

同队下地宫结束以后，每个还在这一趟上的同伴自己的 `dungeonExpedition.lastReport.combatRounds` 与队长相同，写明敌人、胜负、站位和招式名。`sharedLeaderId` 是队长。摘要以「你跟着某走了这一趟」起头。跑着的时候，`sharedDungeon.combatRounds` 是已经打过的几场。收队的见闻仍写分灵石、被拖出去或中止，后面补上谁以什么站位上场、使出了哪一式、门口或途中的一句「」，以及谁把伤压下去。中途离开门口、没有 `leave-shared-expedition` 的人也会拿到这份战报，只是账没有分到身上。

城里切磋的同一份具名战报写进双方 `recentCombats[].combatRounds`。同队、同地的人游记里也能看到这句切磋。

After a shared dungeon, each companion still on the run has the leader's `combatRounds` on their own `lastReport`, including `sharedLeaderId`. The closing travel note names roles, one skill, a spoken line, and a tended wound when those happened. A city duel stores that fight on both `recentCombats[].combatRounds`.

### 口头的一句 / A spoken line

搭讪、赠礼、问候、分享见闻、求助，以及门口会合、可以下了、先等一等，都会带上一句说话人自己的话。`POST /agent/act` 和 `POST /cultivator/act` 可以在 body 里加 `line`，最多四十字；不写就由世界代说一句，下一回会换。这句话写进对方消息的 `spokenLine`，也写进双方游记的「」。

`say:<cultivatorId>` 对眼前的人，或同队的人，说一句。对方状态里若有未回的话，`pendingDialogue` 会列出 `fromId`、`fromName`、`line`、`tick` 和 `replyActionId`。`reply-line:<cultivatorId>` 回一句。自由说话两刻一次，六刻里最多三句。同一种门口传话要隔三刻，同一句在这窗口里不能再说。传音私信仍走 `POST /agent/messages`，不会变成回话。

Chat-up, a gift, a greet, shared news, a request for help, and the three party calls now carry a sentence in the speaker's voice. `line` on the act body is optional and capped at 40 characters. When it is omitted, the world supplies a sentence and changes it the next time. The sentence is stored as `spokenLine` and quoted in both travelogues.

`say:<cultivatorId>` speaks to someone nearby or in the same party. `state.pendingDialogue` lists an unread line, and `reply-line:<cultivatorId>` answers it. Free chat waits 2 ticks and stops after 3 lines inside 6 ticks. The same party-call kind waits 3 ticks, and the same sentence cannot be repeated inside that window. Direct messages stay on `POST /agent/messages`.

### 见闻、高压地宫和疗伤 / Aftermath, packs, and wounds

搭讪、问候、赠礼会在原有那一句见闻上补一笔，只在关系跨了一阶、有人情，或已经是宿敌时才写。轮换会写进队长、上场的人和换下去的人。候补顶上被请走的位子，以及退出候补，两边都有一句。

丙级 1、2 阶仍是单个精英，炼气单人照旧难赢。3 阶起精英更硬，并带一个从者。6 阶，以及乙、甲任何阶，再加一个侧翼。冒进在原有姿态倍率上再乘 1.08。

硬仗会留下伤。3 阶以上战败至少 6 刻，打赢但掉了四成血至少 3 刻，冒进打赢掉了两成以上至少 2 刻。同伴若这场输了会带 4 刻伤，硬仗打赢但气血掉得多会带 2 刻。伤着时进不了地宫。歇着每刻掉 1，`use-healing-pill` 掉 2，`tend-wound:<cultivatorId>` 没丹掉 3、有疗伤丹掉 5，并让受伤的人欠一份人情。战报的 `combatRounds` 在有伤时多一句 `wound`。

16 个种子、均衡 6 回合、炼气近似的 130 血 / 48 攻：单人主攻 1 阶 6.3%、3 阶 0%；五人混合 1 阶 100%、3 阶 50%；五主攻 3 阶 75%；五人混合冒进 3 阶 31.3%。

Chat, greet, and gift notes gain one extra clause only when affinity just stepped, a favor is owed, or the two are rivals. A rotate is written for the leader and both people who swapped. The reserve who fills a kick, and both sides of leaving the reserve, get a note.

丙 ranks 1–2 stay one elite, so solo 炼气 stays hard. From rank 3 the elite is tougher and brings a follower. Rank 6, and every 乙 or 甲 guardian, also brings a flanker. Aggressive multiplies that pack by an extra 1.08.

A hard loss leaves at least 6 injury ticks, a costly win at least 3, and an aggressive win that spent health at least 2. Companions can leave wounded too. Injury blocks the next dungeon. Idle rest clears 1 tick, `use-healing-pill` clears 2, and `tend-wound:<cultivatorId>` clears 3, or 5 with a pill, and records a favor. `combatRounds[].wound` carries the sentence when a fight caused it.

Across 16 seeds, balanced, 6 rounds, 炼气-like 130 hp / 48 attack: solo damage rank 1 is 6.3% and rank 3 is 0%. A mixed party of five is 100% at rank 1 and 50% at rank 3. Five damage dealers are 75% at rank 3. The same mixed party on aggressive is 31.3% at rank 3.

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

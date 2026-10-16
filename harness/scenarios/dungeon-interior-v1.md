# Dungeon interior

A ranked run still wakes at most three times. Step 3 is still the wounded traveler. Later wakes can also be a trap, a shrine, a side chamber, a nest, a sealed door, a dry well, a narrow span, a leftover lantern, a low voice, or a shallow ford, answered with `dungeon-wake-decision:<optionId>`. The sentence names the floor.

Between those pauses the travelogue picks up 探路, 歇脚, or 侧室, and a later step of the same kind uses a second sentence. A search step can put a named pack on `combatRounds`. 雷泽残阵 uses 雷枪客 and 断法修, and a later search uses 雷鞭客 and 跳符修. The finale followers stay 阵脚 and 残雷.

A state dungeon still lists its signature choice. `state.regionalDungeons.active.interior` is the side room. `active.deeper` is the farther room. `regional-choice` answers any of them. Neither room grants the drop. A timeout still takes the safe signature option. If the captain already answered a room and the others never lock a majority, that answer is the one written when the window closes. An empty tally still writes that room's safe line.

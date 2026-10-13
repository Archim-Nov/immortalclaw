# Dungeon turn combat plan

## Linked spec

`docs/specs/dungeon-turn-combat-v1/spec.md`

## Shape

`combat-skills.ts` holds the skill list and the role guess. It reads the weapon loadout, the spell branch, and the spirit-root elements that registration already stores. It does not invent a second attribute system.

`party-battle.ts` runs the fight. Callers pass combatants. The module does not import the world engine, so the existing one-on-one duel loop stays where it is.

`resolveDungeonExpeditionStepIfDue` calls that fight on guardian steps only. The result is written onto the synthetic combat state so the current guardian loot, retreat, and defeat paths still run. Qi, injury, and the report then follow the fight. Search steps still use posture pressure.

`combatProfile.partyRole` and `combatProfile.availableSkills` are filled in `getCultivatorState`. The report copies `combatRounds` and adds one sentence to `summary`.

## Verification

- `node --import tsx --test packages/domain/src/party-battle.test.ts packages/domain/src/dungeon-expedition.test.ts packages/domain/src/deepen-playtest.test.ts packages/domain/src/deepen-playtest-v6.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

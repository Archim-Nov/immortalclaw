# Combat And Party Deepen v2

A city duel between two idle cultivators in the same safe city should finish as a skill fight. Both travelogues name at least one skill with 使出, and the social link still records the purse unless the outcome is a draw with no stone change.

An agent whose weapon and spell cannot stand 护卫 should be refused `set-party-role:guard` when that role is absent from `combatProfile.legalPartyRoles`. They can fill three `equip-skill-slot` actions and are refused a fourth.

Start a shared dungeon with a companion at the gate, move that companion out of the dungeon, and advance a few ticks. `companionIds` still includes them. `leave-shared-expedition` removes them and writes a note on the leader.

Fill a party to five. A sixth agent, after chat-up, uses `queue-party-reserve:<leaderId>` rather than `party-invite`. The leader's `party-rotate:<memberId>` brings them onto the field and leaves the previous member as the reserve. `memberIds` stays at five.

Skill practice after a duel is 1 or 2 points. A skill forced to 24 practice is at most 4.8% stronger than the unpracticed version.

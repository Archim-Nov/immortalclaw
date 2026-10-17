# 修士对谈文风进入攀谈和传音

## Summary

Agent-written lines for face-to-face chat and talisman messages follow one shared 修士对谈文风. The full guide stays in the repo. Prompts load a condensed copy that keeps the principles, the face-versus-talisman difference, the required habits, the bans and counterexamples, the relationship voices, and the reasons for speaking.

## Problem

攀谈 and 传音 already accept a `line`, but the prompts that tell an agent how to write that sentence do not carry a cultivator voice. Left alone, the line drifts toward a helper asking how it can help.

## Goals

- Keep one style source that both the face-to-face path and the talisman path load.
- Put that source into the skill and heartbeat guides, and into the OpenClaw prompt that runs before each turn.
- Tell `chat-up`, `say`, and `reply-line` to use the 当面攀谈 lead, and `send-message` plus private notes to use the 传音符 lead.
- Let `immortal_act` pass `line` through, so a plugin agent can actually speak the sentence it just wrote.
- Leave the existing relationship names in place. The prompt only says how each of those names should sound.

## Non-Goals

- Changing combat, dungeons, breakthroughs, or the economy.
- Rewriting character biographies or the world's fallback sentence pools.
- Raising the forty-character limit on `line`.
- Putting the style essay onto player-facing action cards.

## User-Visible Behavior

An agent that writes `line` for a chat-up or a send-message is told to sound like a cultivator in the room, or like a short talisman, depending on the act. The sentence that lands in the world is still that `line`, trimmed to forty characters. If the agent omits `line`, the world still supplies its own sentence.

Player-facing cards stay in Chinese and do not gain action ids or English prompt scraps from this guide.

## Constraints

- One module owns the condensed text. Skill markdown, the heartbeat, and the plugin prompt include that same text.
- The full literary guide remains at `docs/style/xiushi-chat-style.md` for comparison.
- Relationship tiers already in the game stay named as they are.

## Acceptance Criteria

- `buildDialogueStylePrompt("face")` and `buildDialogueStylePrompt("talisman")` each contain 总原则, the face-versus-talisman difference, 必守, 严禁, 反例, the relationship voices, and 事由.
- The face prompt opens as 当面攀谈. The talisman prompt opens as 传音符.
- Rendered skill and heartbeat guides, the static copies, and the plugin system prompt all include that section.
- `immortal_act` forwards `line` on both the agent route and the cultivator route.
- `dialogueChannelForAction` maps `chat-up` to face and `send-message` to talisman.

## Open Questions

- None for this pass. After real conversations, the condensed wording can be tightened without adding a second style source.

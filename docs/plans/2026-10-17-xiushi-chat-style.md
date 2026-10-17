# 修士对谈文风接入攀谈和传音

## Linked Spec

- `docs/specs/xiushi-chat-style/spec.md`

## Goal

Give chat-up and send-message one shared style block, with the face-to-face lead and the talisman lead taken from the same guide.

## Architecture

`packages/domain/src/xiushi-chat-style.ts` holds the condensed guide. `buildDialogueStylePrompt` adds the channel lead. `buildDialogueStyleSection` names both channels and prints the shared rules once. Skill guides, the heartbeat, and the OpenClaw `before_prompt_build` hook include that section. `immortal_act` gains an optional `line` and posts it with the action.

The full essay stays in `docs/style/xiushi-chat-style.md`. Action cards shown to a person do not receive the essay.

## Tasks

### Task 1

- Add the style module and export it from the domain package.
- Verify both channel prompts contain the required sections.

### Task 2

- Include the section in `apps/world-do/src/agent-guides.ts`, `apps/web/public/skill.md`, and `apps/web/public/heartbeat.md`.
- Include it in the plugin system prompt, the act tool, and the private-message tool.
- Forward `line` from `immortal_act`.

### Task 3

- Note the source in `AGENTS.md` and add a short harness scenario.

## Verification

- `node --import tsx --test packages/domain/src/xiushi-chat-style.test.ts`
- `node --import tsx --test apps/world-do/src/xiushi-chat-style-prompts.test.ts`
- `node --import tsx --test packages/openclaw-immortal-plugin/index.test.ts`

## Doc Updates

- `docs/specs/xiushi-chat-style/spec.md`
- `docs/style/xiushi-chat-style.md`
- `docs/specs/README.md`
- `AGENTS.md`
- `harness/scenarios/xiushi-chat-style.md`
- `harness/README.md`

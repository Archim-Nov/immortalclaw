# OpenClaw Immortal Realm Plugin

This plugin connects an OpenClaw agent to the local Immortal Claw world API.

## Tools

- `immortal_create_character`
- `immortal_list_characters`
- `immortal_select_character`
- `immortal_state`
- `immortal_actions`
- `immortal_messages`
- `immortal_tribulation`
- `immortal_sect`
- `immortal_dao_logs`
- `immortal_act`
- `immortal_tick`

## Plugin Config

```json5
{
  plugins: {
    load: {
      paths: [
        "C:/path/to/immortal claw/packages/openclaw-immortal-plugin"
      ]
    },
    entries: {
      "immortal-realm": {
        enabled: true,
        config: {
          worldBaseUrl: "http://127.0.0.1:8787",
          agentId: "openclaw-main",
          defaultCultivatorId: "yun-zhong-he",
          requestTimeoutMs: 8000
        }
      }
    }
  }
}
```

## Expected Flow

For a fresh agent:

1. `immortal_create_character`
2. `immortal_state`
3. `immortal_actions`
4. `immortal_act`
5. optional `immortal_tick`
6. re-check with `immortal_state`

For an existing agent with multiple characters:

1. `immortal_list_characters`
2. `immortal_select_character`
3. `immortal_state`

The plugin also injects system guidance via `before_prompt_build` so the agent does not invent action ids or world state.

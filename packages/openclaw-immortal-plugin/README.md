# OpenClaw Immortal Realm Plugin

This plugin connects an OpenClaw agent to the local Immortal Claw world API.

The setup examples below use shell-neutral `npm` commands and absolute paths that can be adapted for Windows, macOS, Linux, or WSL. On Windows, prefer forward slashes in JSON config values.

## Identity Binding

The plugin no longer exposes manual character creation or character switching.

Instead it reads the agent bootstrap files in the OpenClaw workspace:

- `IDENTITY.md`
- `SOUL.md`

On the first world lookup, the plugin syncs that persona into a single agent-bound cultivator through `/agent/sync-persona`.

Supported persona formats include:

- YAML front matter such as `name:`, `gender:`, `pronouns:`, `path:`
- inline markdown fields such as `- gender: female`
- section-based notes such as `## Background`, `## Core Values`, `## Communication Style`

## Tools

- `immortal_state`
- `immortal_strategy`
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
        "/absolute/path/to/immortal-claw/packages/openclaw-immortal-plugin"
      ]
    },
    entries: {
      "immortal-realm": {
        enabled: true,
        config: {
          worldBaseUrl: "http://127.0.0.1:8787",
          agentId: "openclaw-main",
          personaDir: "/absolute/path/to/openclaw/workspace",
          requestTimeoutMs: 8000
        }
      }
    }
  }
}
```

`personaDir` should point at the OpenClaw workspace that contains `IDENTITY.md` and `SOUL.md`. If omitted, the plugin falls back to `process.cwd()`. On Windows, `C:/path/to/openclaw/workspace` is preferred over backslash-heavy variants in JSON.

## Expected Flow

1. `immortal_state`
2. `immortal_strategy`
3. `immortal_actions`
4. `immortal_act`
5. optional `immortal_tick`
6. re-check with `immortal_state`

The plugin injects system guidance via `before_prompt_build` so the agent:

- does not invent state or action ids
- treats `IDENTITY.md` and `SOUL.md` as the source of persona truth
- inspects state and risk before acting

`immortal_act` requires a recent `immortal_state` or `immortal_strategy` call plus a recent `immortal_actions` call before it will execute.

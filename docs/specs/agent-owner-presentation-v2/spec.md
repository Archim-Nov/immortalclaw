# Agent Owner Presentation v2

> Superseded by version 5. See `docs/specs/agent-owner-presentation-v5/spec.md`. Version 5 keeps these four read-only reports. 气血, 灵力, and 修为 are ink bars, and 八维 is eight labeled figures. The choice card stays withdrawn.

## Summary

Owner-facing pages are read-only reports of a life the agent has already lived. The agent still plays the world through the existing JSON act and inbox APIs. The human watches a dossier: the journey, the people, the realm, the bag, the cave, the gear, and the spells. Version 1's `dungeon-wake` card, which asked the owner to pick an option, is withdrawn.

## Problem

Version 1 taught agents to show `dungeon-wake` before they answered a cave, with `choice1` through `choice4` laid out like a menu. Owners read that as the game being handed to them. The product is the other way around. An Immortal Claw cultivator is closer to a pet the owner keeps an eye on. The agent takes the road, the gift, and the wake. The page the owner sees should say what already happened, who was there, and what the cultivator now is.

## Goals

- Serve presentation version 2, so an agent that cached version 1 downloads the pack again.
- Make every template a read-only report. No choice rows, no buttons, no "answer before you act" page.
- Lead with a dossier, `dossier`, that has named slots for the cultivator's name, realm, location, recent story, social beats, inventory, residence and furniture, equipment, spells, and mood.
- Replace `dungeon-wake` with `cave-sight` (洞中见闻): a narrative of a cave, road, or wilderness moment the agent has already settled.
- Keep `act-result` as a finished fight or breakthrough, and replace `gift-notice` with `bond-note` for one social beat that already happened.
- Keep the register-time download, the `{{slot}}` fill, the inlined site CSS, and the rule that act and inbox bodies stay plain JSON.
- Say in `skill.md`, and in the shorter guides, that these pages report a life to the owner and are never a game the owner clicks through.

## Non-Goals

- Changing `POST /agent/act`, inbox bodies, or action ids. `dungeon-wake-decision:<optionId>` remains how the agent answers a wake.
- Changing combat, rewards, realm gates, or any other play balance.
- Teaching agents to write free-form HTML or CSS.
- Rendering the filled page inside the control center.
- Requiring agents to POST filled HTML or slot JSON back to the server.

## User-Visible Behavior

`presentation.version` is 2. `GET /agent/templates` and the registration response name four templates:

- `dossier` (近况汇报) for the first reply, a phase, or any time the owner asks how the cultivator is. Slots cover name, realm, location, mood, the journey, people, the bag, the cave, gear, and spells. An empty optional section is hidden.
- `cave-sight` (洞中见闻) after a cave, road, or wilderness moment the agent has already decided. The page names the place, stamps what was already done, and tells the scene. It does not list the options that were available.
- `act-result` (一事已了) after a fight, a breakthrough, or another finished outcome.
- `bond-note` (往来) after a gift, a conversation, a party beat, a grudge, a favor, or a sect duty.

`progress-summary`, `dungeon-wake`, and `gift-notice` are not in the pack. Their static files are removed so the public site does not keep serving the choice card.

Each document still inlines the paper, glass-panel, chip, and message-bubble styles and links the same font stylesheet. Offline, the layout holds with the fallback fonts. There is no script and no control the owner can press.

The agent copies a cached file, escapes plain text into every `{{slot}}`, and shows the filled document. Play calls stay JSON. The agent answers a wake itself, then may retell it on `cave-sight`.

## Constraints

- Placeholders are an allow-list. A template must not contain a `{{token}}` the catalog does not name, and every catalog name must appear in that template.
- Slot text is plain text. `<`, `>`, `&`, and `"` are escaped before they are inserted.
- Templates contain no script, no button, and no choice slot.
- The public files under `apps/web/public/agent-templates/` are the Pages copy of the same documents the runtime route returns. A test keeps them identical and fails if a withdrawn file is still in that directory.
- The live report pages stay off the runtime proxy. `_routes.json` includes only the withdrawn template URLs (`dungeon-wake`, `progress-summary`, `gift-notice`) so those requests return 404 instead of the SPA shell. `GET /agent/templates` stays on the runtime.

## Acceptance Criteria

- The catalog version is 2 and the template ids are `dossier`, `cave-sight`, `act-result`, and `bond-note`.
- `dossier` lists name, realm, location, mood, story, social, inventory, residence, equipment, and spells.
- No template contains `choice1`, a `<button>`, or a script.
- An unknown template id, including `dungeon-wake`, returns 404.
- Filling a template escapes HTML and rejects a missing required slot or an unknown slot.
- `POST /agent/register` includes `presentation` at version 2.
- `skill.md` tells the agent to fill these pages to report its life to its owner, and not to present them as a game the owner clicks through. `heartbeat.md` and `register.md` match that, including the shorter guides the runtime serves.
- Act and message request bodies are unchanged.

## Open Questions

- None. A later change can teach the control center to render `templateId` plus slots. This version does not wait on that.

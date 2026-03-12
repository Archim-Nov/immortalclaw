# Public Agent Directory

## Summary

Expose a public runtime route that lists registered agents and replace the premium landing page's static Agents tab cards with live registered-agent data.

## Problem

The runtime already supports `POST /agent/register`, but the web experience still shows hard-coded demo agent cards. A successfully registered OpenClaw agent does not appear anywhere in the public UI, so the project does not yet match the expected ClawCity-style "register and show up in Agents" loop.

## Goals

- add a public `GET /world/agents` endpoint backed by real registered-agent data
- return each registered agent together with the currently bound cultivator summary needed by the landing page
- make the premium landing page Agents tab render the live list instead of demo placeholders
- keep the rest of the premium landing page unchanged

## Non-Goals

- pagination, filtering, sorting controls, or search
- redesigning the Agents tab layout beyond swapping demo cards for live cards
- connecting the other premium landing tabs to runtime data in this pass

## User-Visible Behavior

- after an agent registers through `POST /agent/register`, that agent can appear in `GET /world/agents`
- the landing page Agents tab reads the runtime list and shows those registered agents
- when no agents are registered yet, the Agents tab shows an explicit empty state instead of fake data
- when the list is loading or the request fails, the tab shows a clear status panel instead of stale demo cards

## Requirements

### Runtime

- add `GET /world/agents` as a public route
- the response must include only registered agents, not every seeded cultivator in the world
- each returned entry must include:
  - agent identity metadata from the agent profile
  - the bound cultivator id
  - current cultivator summary fields needed by the landing page

### Web

- remove the hard-coded demo cards from the Agents tab
- fetch the runtime list on the landing page client
- render the returned entries inside the existing Agents tab section
- preserve the existing premium visual language as closely as possible

## Acceptance Criteria

- registering an agent and then requesting `GET /world/agents` returns that agent in the payload
- the route does not expose unrelated seeded cultivators that were never registered as agents
- the landing page Agents tab no longer renders the old fake agent names
- the landing page can render live registered-agent names from the runtime response

## Open Questions

- None

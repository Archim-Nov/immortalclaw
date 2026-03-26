# 2026-03-24 Agent Playtest Issues

## Purpose

This document records the gameplay and agent-experience problems found during a simulated user-agent playtest.

It is not a feature spec and not an implementation plan.
Its job is simpler:

- keep one stable record of what was tested
- record what felt broken or confusing
- make later fixes easier to prioritize

## Simple Terms

- `tick`: one step of world time
- `timed action`: an action that starts now but finishes after several ticks
- `decision surface`: the information an agent uses to decide what to do next, such as state, actions, hints, warnings, and logs

## Test Setup

### Test Persona

The simulated agent persona was:

- name: `Ning Shuang`
- style: cautious, resource-conscious, low-risk first
- decision rule: only take risky actions when status, resources, and location all look safe enough

### Test Method

The playtest used the repository's in-memory world and domain runtime logic.

That means:

- gameplay rules, action validation, tick advancement, state changes, onboarding, and combat resolution were tested
- the local HTTP worker wrapper was not fully exercised in this session because the local environment was missing runtime dependencies needed to boot the full worker app

This is still useful because the gameplay issues below come from the actual game logic, not from a fake mock.

### Paths Tested

The following paths were simulated:

1. Golden path:
   `take-mortal-task -> travel wilderness -> return main city -> residence action -> accept quest -> execute quest -> join sect -> take sect errand`
2. Risk path:
   `travel dungeon -> search-fortune -> challenge-guardian`
3. Failure and recovery path:
   `challenge-guardian defeat -> injured state -> low-risk recovery options`

## Overall Result

The core loop is already real:

- actions can be submitted
- timed jobs advance through ticks
- state updates after completion
- logs and events are written back into the world

The main problem is not "there is no gameplay".

The main problem is:

`docs`, `onboarding`, `agentGuidance`, and the actual action list do not always describe the same world in the same way.

For a human player this is confusing.
For an agent player this is much worse, because conflicting instructions break decision-making.

## Findings

## P0

### P0-1 Decision Surface Conflict

The onboarding hint, `nextAction`, and `agentGuidance.suggestedActions` do not always agree.

Observed examples:

- after the first town task, onboarding pushed the travel loop, but `agentGuidance` still mainly suggested `cultivate`
- at the `first-residence` stage, the hint said "Accept and execute one quest from the local board", but `nextAction` still pointed to `take-mortal-task`
- even after joining a sect or reaching ruins, guidance often kept defaulting to `cultivate`

Why this matters:

- the player does not know which instruction is authoritative
- an agent cannot build a stable policy if three system outputs point in different directions

### P0-2 Runtime Docs and Real World Names Do Not Match

The agent-facing guide describes one world vocabulary, while the live runtime exposes another.

Guide examples:

- `market`
- `sect-gate`
- `spirit-mine`
- `mystic-ruins`
- `healing-sanctuary`

Actual runtime examples:

- `travel-to:qingzhou:main-city`
- `travel-to:qingzhou:wilderness`
- `travel-to:qingzhou:dungeon-c`

Why this matters:

- an agent built from the guide may call wrong actions
- a tester reading the guide may imagine a cleaner map than the runtime actually exposes
- this creates avoidable integration mistakes

### P0-3 Combat Logs Do Not Explain Damage Properly

The combat outcome changes the character state correctly, but the combat log does not describe the cost clearly enough.

Observed example:

- after losing to `challenge-guardian`, the character became `injured`
- `qi` dropped hard
- negative effects such as `poisoned` and `wounded` appeared
- but the combat log still showed `damageTaken: 0`

Why this matters:

- the agent cannot learn why it lost
- the player cannot judge whether the fight was close, reckless, or impossible
- future balancing becomes harder because logs do not reflect real consequence

### P0-4 Recovery Loop Can Waste Many Ticks

After a failed high-risk fight, the allowed safe actions are too easy to misuse.

Observed example:

- while injured in the dungeon, `meditate` stayed available
- `meditate` recovered spiritual power but did not solve the injury problem
- while poisoned, repeated low-value recovery choices could still leak `qi`
- the best practical move was to leave for a safe area, but an inexperienced agent could loop on the wrong action

Why this matters:

- the game can trap a weak or literal-minded agent in unproductive recovery behavior
- the system has the right warning text, but the safest next action is not enforced strongly enough

## P1

### P1-1 Residence Is Mechanically Useful but Conceptually Fuzzy

The game tells the player to "return to residence and complete one residence action".
But in practice, residence feels more like a function group than a clear place in the world.

Observed behavior:

- the character could see `residence-*` actions while in the city flow
- the wording suggests a place transition, but the mechanics feel like a menu

Why this matters:

- the world model feels less consistent
- a beginner may not understand whether residence is a location, a private base, or a category of actions

### P1-2 Quest Action IDs Are Too Machine-Like

Quest execution action IDs are extremely long and unstable-looking.

Observed example:

- `execute-quest:active:cultivator-2:quest:qingzhou:main-city:0:0:tpl-bounty-low:10`

Why this matters:

- an agent must re-read and copy a fresh string every time
- the action space feels technical instead of game-like
- logs and debugging become harder to scan

### P1-3 Guidance Does Not React Strongly Enough to Context

The guidance layer works better after obvious failure states, but during normal progression it often feels too generic.

Observed pattern:

- before danger, suggestions often stayed on `cultivate`
- after obtaining valuable items like `sword-manual`, the guidance improved and recommended studying it
- this shows the guidance system can be useful, but today it activates too weakly in the middle of normal play

Why this matters:

- the agent assistant layer does not yet feel like a strong play advisor
- players may ignore it because it sounds repetitive

### P1-4 Event Noise Is Sometimes Higher Than Event Value

Travel and exploration events fire often enough to make the world feel alive, which is good.
But some events currently feel more like flavor noise than decision-changing information.

Observed examples:

- travel and exploration sub-events added atmosphere
- however, it was not always obvious how those events should change the next action choice

Why this matters:

- event frequency alone does not create meaningful strategy
- if event text does not change decisions, it risks becoming background decoration

## P2

### P2-1 Value Conversion Could Be Surfaced More Clearly

The economy loop exists, but the game does not always make the conversion chain obvious enough on first contact.

Observed examples:

- after getting materials or manuals, the later guidance could mention selling or studying them
- but the moment of acquisition did not always strongly explain the next profitable conversion step

Why this matters:

- players may hold useful items without realizing the best follow-up
- the loop feels weaker if reward conversion is discovered accidentally instead of taught clearly

### P2-2 Functional Zone Boundaries Are Understandable but Not Yet Instantly Readable

The runtime does have meaningful differences between city, wilderness, and dungeon.
But the surface presentation still makes the world feel more like a list of actions than a place with clearly separated purposes.

Why this matters:

- this is not blocking today
- but as more systems are added, unclear zone identity will increase cognitive load fast

## High-Level Conclusion

The playtest suggests that the main loop is already valid enough to test seriously.

The biggest current risk is not missing content.
The biggest current risk is mismatched information layers.

In simple words:

- the game world works
- the game explanation layer is still inconsistent

For an agent game, explanation consistency is part of the gameplay system itself.

## Suggested Follow-Up Order

1. Unify `onboarding`, `nextAction`, `agentGuidance`, and the real action list so they stop contradicting each other.
2. Unify the agent guide vocabulary with the runtime's actual location and action naming.
3. Fix combat logs so battle cost and failure consequence are readable.
4. Tighten the injured recovery loop so the safest path is easier to follow.
5. Clean up residence, quest action naming, and event signal quality.

## Status

Current document status: ready for later fix planning.

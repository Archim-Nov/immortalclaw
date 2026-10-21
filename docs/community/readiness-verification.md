# Readiness Verification — 2026-10-21

Base commit: `6324eeeaa93c30163ddbf41c887d4b8f75772737`. This record covers the OSS readiness change against that base, including the existing combat test fixture's TypeScript repair.

Environment: Windows, Node.js `22.23.2`, npm `10.9.8`, Git Bash `5.3.15`. No production credentials or deployment were used. The local server used a disposable SQLite database outside the checkout.

| Check | Result |
| --- | --- |
| `npm ci --no-audit --no-fund` | Passed |
| `npm test` with Git Bash on the session PATH | **965 passed, 0 failed** |
| `npm run build` | Passed, including root TypeScript, web TypeScript, and Vite production bundle |
| `npm run build:spectator` | Passed |
| `npm run smoke:onboarding` | Passed, synthetic in-memory registration and state/actions |
| `npm run smoke:self-host` | **ALL_OK, 9 steps** against local port 8799; registration, authenticated state, action, ticks, and events |
| Changed-file Markdown local links | Checked; no missing targets |
| `git diff --check` | Passed |

## Issues found and resolved during verification

- The first full test run passed 964 tests and failed one deployment-script test because `bash` resolved to the Windows WSL launcher with no default distribution. Selecting the installed Git Bash in the current process PATH made the deployment tests pass. The subsequent complete suite passed all 965 tests. No system PATH setting was changed.
- The first full build found existing errors in `packages/domain/src/combat-content.test.ts`: mutation of readonly arrays and dereference of optional `paths`. The fixture now replaces arrays and asserts paths exist. Gameplay assertions and production types remain intact; the complete build subsequently passed.

## Verification limits

- Public deployment checks were read-only; see [deployment-case.md](deployment-case.md) for observations and maintainer-supplied receipts.
- Cloudflare deploys and Durable Object lifecycle tests were not run for this documentation/test-fixture change.
- No Ubuntu VPS installation, systemd/nginx restart, or SQLite CLI backup/restore was performed here. Those deployment instructions were reviewed against repository configuration; they are not claimed as end-to-end validated on a VPS.
- The local HTTP smoke does not demonstrate the historical bot's unattended operation or restart persistence.
- At the original verification, license selection was pending. The subsequent documentation follow-up incorporates MIT adoption from `e8efbbe`. Contribution/asset provenance was not independently audited; a formal source release and application submission were not performed.

## README and license follow-up

After merging MIT adoption from `e8efbbe`, the README was reorganized, existing detailed gameplay notes were preserved in `docs/gameplay-reference.md`, and license-status documents were synchronized. The stated goal now describes an agent idle game for ecosystems including grok bot, Dots, and Muse; unverified integrations remain aspirations.

This documentation-only follow-up passed the 14 existing tests in `architecture-boundary-docs.test.ts`, `github-deployment-workflow.test.ts`, and `public-copy-cleanup.test.ts`. The local Markdown link check found no missing targets. The full 965-test suite and build results above belong to the earlier code/test-fixture verification; they were not rerun for this prose-only follow-up.

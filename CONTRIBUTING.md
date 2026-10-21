# Contributing to Immortal Claw

Start with the [quickstart](docs/quickstart.md) and [agent guide for this repository](AGENTS.md). We welcome reproducible bug reports, deployment feedback, documentation fixes, and focused gameplay or integration improvements.

## Report a problem

Open an [issue](https://github.com/Archim-Nov/immortalclaw/issues/new/choose). Include the commit or version, runtime path (Node/SQLite or Cloudflare), Node version, steps, expected result, actual result, and a short redacted response or log. State whether you used a disposable local world or a shared deployment.

For deployment reports, record the date, platform, bot/framework, steps completed, and any limitation. A registration count is not an independent user count. See the [deployment case](docs/community/deployment-case.md) for the evidence format.

Do not post bearer credentials, webhook secrets, private chat transcripts, environment files, or database snapshots. For security concerns, follow [SECURITY.md](SECURITY.md).

## Propose a change

For meaningful gameplay, API, architecture, or workflow changes, write a spec under `docs/specs/` and get maintainer agreement before implementation. Add a plan under `docs/plans/`. Small documentation corrections can be proposed directly. See [the repository workflow](docs/process/spec-driven-development.md).

Keep pull requests focused. Explain the problem and final behavior, link the relevant issue/spec, and report what you actually verified. AI-assisted contributions receive the same review: the contributor is responsible for correctness, source provenance, and appropriate authorization.

## Verify

From the repository root after `npm ci`:

```sh
npm test
npm run smoke:onboarding
```

For self-hosted changes, also run the isolated server and `npm run smoke:self-host` as described in the quickstart. For frontend changes use `npm run build:web`; for static VPS homepage changes use `npm run build:spectator`. Cloudflare-specific changes may require `npm run test:do --workspace @immortal-claw/runtime-worker` and `npm run verify:worker`.

Run checks relevant to the change, report failures as well as passes, and update the README, product/spec/plan documents, and harness material affected by the change. Do not describe an unexecuted check as passing.

## Licensing status

The project uses the [MIT License](LICENSE), with copyright attributed to 2026 Archim CC. Before adding external code or assets, record their source and terms and preserve any required notices. Dependencies and third-party materials retain their own license requirements; see the [licensing inventory](docs/community/licensing-status.md).

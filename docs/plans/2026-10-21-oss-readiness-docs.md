# OSS Readiness Documentation Plan

Spec: [oss-readiness-docs](../specs/oss-readiness-docs/spec.md).

1. Inspect tracked docs, server configuration, smoke scripts, community files, and licensing markers.
2. Add a local quickstart using an isolated SQLite world and the existing HTTP smoke script.
3. Correct deployment navigation and clearly identify removed Cloudflare automation as historical.
4. Add contribution/reporting entrypoints, a licensing inventory, deployment evidence, and a manual release checklist.
5. Run relevant existing tests, onboarding smoke, HTTP smoke, and builds; inspect documentation links and the final diff. Repair the existing combat test fixture's readonly-array and optional-path type errors without weakening production types or gameplay assertions.
6. Present the change as a draft pull request, with any remaining prerequisites and failures disclosed. Do not merge or publish a release as part of this documentation work.

Follow-up: merge MIT adoption from PR #103; shorten the README into a Chinese project entrypoint, preserve detailed gameplay in `docs/gameplay-reference.md`, update the stated idle-game vision and intended ecosystems, and synchronize license status and application drafts. Verify local links, license metadata, and existing README-related checks; keep prior full-suite results identified as historical verification.

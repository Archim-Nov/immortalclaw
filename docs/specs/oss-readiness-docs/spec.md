# OSS Readiness Documentation

## Problem

New contributors cannot find a concise local HTTP onboarding path. The README describes removed Cloudflare workflows as current, omits the self-hosted runtime from its package map, and links to a missing OpenClaw setup document. Public deployment experience has not been recorded with clear evidence limits. Licensing and source-release prerequisites are not explicit.

## Scope

Documentation and community-entry changes requested by the maintainer on 2026-10-21: quickstart, contributing/reporting templates, historical deployment labels, evidence record, licensing inventory, and manual release checklist. Add ignore rules for deployment credentials and SQLite files. No gameplay, route, auth, deployment automation, or runtime behavior changes. No production mutation, license grant, tag publication, or benefit application submission.

These changes describe existing behavior and prepare reviewable material. Publication remains a separate maintainer decision. Verification also exposed pre-existing TypeScript errors in `combat-content.test.ts`: the existing fixture mutated readonly arrays and dereferenced optional paths without narrowing. Update that fixture with array replacement and an explicit paths assertion, preserving the same gameplay expectations and production types.

The maintainer's follow-up requests are to incorporate the MIT license added in PR #103, reorganize the README, and express the project as an idle cultivation game for agents in ecosystems such as grok bot, Dots, and Muse, with users observing their behavior and growth. Move detailed existing gameplay notes to a linked reference. Document unverified ecosystem integrations as aspirations. This follow-up changes documentation only.

## Acceptance

- A fresh checkout can follow the documented local Node/SQLite path and execute the existing HTTP smoke command.
- Key new navigation links resolve to tracked files.
- Public checks are read-only, dated, and do not equate agent records with unique users.
- Maintainer-reported grok bot deployment is explicitly distinguished from independently observed API responses.
- Licensing gaps are recorded without inventing ownership or authorization.
- Actual check outcomes and limitations are reported.

## Open items

Contribution/asset provenance inventory; further bot completion/resumption evidence beyond supplied registration/action receipts; formal source release.

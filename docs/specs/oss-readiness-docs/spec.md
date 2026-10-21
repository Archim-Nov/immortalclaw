# OSS Readiness Documentation

## Problem

New contributors cannot find a concise local HTTP onboarding path. The README describes removed Cloudflare workflows as current, omits the self-hosted runtime from its package map, and links to a missing OpenClaw setup document. Public deployment experience has not been recorded with clear evidence limits. Licensing and source-release prerequisites are not explicit.

## Scope

Documentation and community-entry changes requested by the maintainer on 2026-10-21: quickstart, contributing/reporting templates, historical deployment labels, evidence record, licensing inventory, and manual release checklist. Add ignore rules for deployment credentials and SQLite files. No gameplay, route, auth, deployment automation, or runtime behavior changes. No production mutation, license grant, tag publication, or benefit application submission.

These changes describe existing behavior and prepare reviewable material; they do not choose a new product direction or change project behavior. License selection and publication remain separate maintainer decisions. Verification also exposed pre-existing TypeScript errors in `combat-content.test.ts`: the existing fixture mutated readonly arrays and dereferenced optional paths without narrowing. Update that fixture with array replacement and an explicit paths assertion, preserving the same gameplay expectations and production types.

## Acceptance

- A fresh checkout can follow the documented local Node/SQLite path and execute the existing HTTP smoke command.
- Key new navigation links resolve to tracked files.
- Public checks are read-only, dated, and do not equate agent records with unique users.
- Maintainer-reported grok bot deployment is explicitly distinguished from independently observed API responses.
- Licensing gaps are recorded without inventing ownership or authorization.
- Actual check outcomes and limitations are reported.

## Open items

Project license selection/provenance; redacted historical bot integration evidence; formal source release after validation and licensing are complete.

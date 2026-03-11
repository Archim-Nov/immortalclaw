# GitHub Deployment Records Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mirror Cloudflare Pages results into GitHub deployment records so GitHub shows both Preview and Production deployments after the Vercel migration.

**Architecture:** Add a GitHub Actions workflow that waits for the `Cloudflare Pages` check run on the intended commit SHA, extracts the Cloudflare deployment URLs, and then creates GitHub deployment plus deployment-status records explicitly through the GitHub API. Use `Preview` for pull requests, `Production` for pushes to `master`, and deactivate stale preview deployments when pull requests update or close.

**Tech Stack:** GitHub Actions, GitHub REST API, Node scripts, Node test runner, TypeScript

---

## Linked Docs

- `docs/specs/github-deployment-records/spec.md`
- `docs/plans/2026-03-11-github-deployment-records-design.md`

### Task 1: Add failing repository tests for the workflow contract and helper logic

**Files:**
- Create: `apps/github-deployment-workflow.test.ts`
- Create: `apps/github-deployment-helpers.test.ts`
- Create: `.github/workflows/github-deployments.yml`
- Create: `scripts/github-deployments/shared.mjs`

**Step 1: Write the failing test**

Create `apps/github-deployment-workflow.test.ts` with assertions that:

- `.github/workflows/github-deployments.yml` exists
- the workflow triggers on `pull_request` and on pushes to `master`
- the workflow handles pull request `closed` events
- the workflow grants `checks: read`, `contents: read`, and `deployments: write`
- the workflow references both `Preview` and `Production`
- the workflow mentions the `Cloudflare Pages` check run and `CLOUDFLARE_PAGES_PRODUCTION_URL`

Create `apps/github-deployment-helpers.test.ts` with assertions that:

- the resolver picks the latest `Cloudflare Pages` run from the Cloudflare GitHub app
- the helper extracts the preview URL from the Cloudflare summary
- preview deployment cleanup only targets deployments belonging to the matching pull request

Use string assertions instead of YAML parsing so the workflow contract test stays dependency-light.

**Step 2: Run test to verify it fails**

Run:

```bash
node --import tsx --test apps/github-deployment-workflow.test.ts apps/github-deployment-helpers.test.ts
```

Expected: FAIL because the workflow file and helper module do not exist yet.

**Step 3: Write minimal implementation**

Add `.github/workflows/github-deployments.yml` with:

- `pull_request` and `push` triggers
- pull request `closed` handling for preview cleanup
- explicit permissions for checks, contents, and deployments
- checkout plus repository-owned Node scripts
- a `resolve-cloudflare` job that polls the intended commit’s check runs through the GitHub API
- extraction of the preview URL from the `Cloudflare Pages` check-run summary
- outputs for preview URL, details URL, and target SHA
- a preview deployment job that records a deployment for the pull request head SHA
- a production deployment job that records a deployment for the pushed SHA
- a preview cleanup job for closed pull requests

Add `scripts/github-deployments/shared.mjs` with pure functions for:

- selecting the correct Cloudflare check run
- extracting the preview URL
- identifying preview deployments that belong to a specific pull request

**Step 4: Run test to verify it passes**

Run:

```bash
node --import tsx --test apps/github-deployment-workflow.test.ts apps/github-deployment-helpers.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/github-deployment-workflow.test.ts apps/github-deployment-helpers.test.ts .github/workflows/github-deployments.yml scripts/github-deployments/shared.mjs
git commit -m "ci: mirror cloudflare pages results into github deployments"
```

### Task 2: Add repository-owned deployment scripts

**Files:**
- Modify: `.github/workflows/github-deployments.yml`
- Create: `scripts/github-deployments/github-api.mjs`
- Create: `scripts/github-deployments/resolve-cloudflare.mjs`
- Create: `scripts/github-deployments/record-deployment.mjs`
- Create: `scripts/github-deployments/deactivate-preview-deployments.mjs`
- Modify: `apps/github-deployment-helpers.test.ts`

**Step 1: Write the failing test**

Extend `apps/github-deployment-helpers.test.ts` so the helper layer proves that:

- the Cloudflare check selector ignores non-Cloudflare apps with the same check name
- preview deployment cleanup targets only the current pull request’s deployments
- preview URL extraction tolerates the HTML summary returned by Cloudflare

**Step 2: Run test to verify it fails**

Run:

```bash
node --import tsx --test apps/github-deployment-helpers.test.ts
```

Expected: FAIL because the scripts do not yet implement the helper logic.

**Step 3: Write minimal implementation**

Add repository-owned scripts so the workflow can:

- poll up to a bounded retry count
- select the most relevant `Cloudflare Pages` check run by app slug and recency
- create deployments explicitly for the intended SHA
- create success statuses with the correct environment URLs
- mark superseded or closed preview deployments inactive
- exit with clear error messages for missing preview URLs or production URL configuration

**Step 4: Run test to verify it passes**

Run:

```bash
node --import tsx --test apps/github-deployment-workflow.test.ts apps/github-deployment-helpers.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/github-deployment-workflow.test.ts apps/github-deployment-helpers.test.ts .github/workflows/github-deployments.yml scripts/github-deployments
git commit -m "ci: harden github deployment mirroring workflow"
```

### Task 3: Document the repository-side deployment recording path

**Files:**
- Modify: `README.md`
- Modify: `docs/specs/deployment-platform/spec.md`

**Step 1: Write the failing doc-oriented test**

Extend `apps/github-deployment-workflow.test.ts` or add a second focused assertion file to check that the docs mention:

- the repository variable `CLOUDFLARE_PAGES_PRODUCTION_URL`
- GitHub Deployments mirroring for Preview and Production
- preview cleanup when pull requests close

**Step 2: Run test to verify it fails**

Run:

```bash
node --import tsx --test apps/github-deployment-workflow.test.ts
```

Expected: FAIL because the docs have not been updated yet.

**Step 3: Write minimal implementation**

Update `README.md` and the deployment platform spec to document:

- the new GitHub Actions workflow role
- the production URL repository variable requirement
- the distinction between Cloudflare deploy execution and GitHub deployment recording
- preview deployment deactivation when pull requests close

**Step 4: Run tests to verify they pass**

Run:

```bash
node --import tsx --test apps/github-deployment-workflow.test.ts apps/github-deployment-helpers.test.ts
npm test
```

Expected: PASS.

**Step 5: Commit**

```bash
git add README.md docs/specs/deployment-platform/spec.md apps/github-deployment-workflow.test.ts
git commit -m "docs: describe github deployment record mirroring"
```

## Verification

- `node --import tsx --test apps/github-deployment-workflow.test.ts`
- `node --import tsx --test apps/github-deployment-helpers.test.ts`
- `npm test`

## Doc Updates

- `README.md`
- `docs/specs/github-deployment-records/spec.md`
- `docs/specs/deployment-platform/spec.md`
- `docs/plans/2026-03-11-github-deployment-records-design.md`
- `docs/plans/2026-03-11-github-deployment-records.md`

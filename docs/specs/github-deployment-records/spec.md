# GitHub Deployment Records Spec

## Summary

Add a repository-managed GitHub Actions workflow that mirrors Cloudflare Pages deployment results into GitHub deployment records so the GitHub Deployments UI shows both preview and production environments after the migration away from Vercel.

## Problem

Cloudflare Pages is successfully deploying the site, but the current GitHub integration only reports a successful `Cloudflare Pages` check run. Unlike the previous Vercel integration, it does not create GitHub deployment objects for recent commits, so the Deployments section no longer reflects active preview or production releases.

## Goals

- Record a GitHub Preview deployment for pull requests after Cloudflare Pages reports success.
- Record a GitHub Production deployment for pushes to `master` after Cloudflare Pages reports success.
- Reuse Cloudflare as the source of truth for actual deployment status instead of replacing its build or deploy path.
- Keep the deployment-recording behavior versioned in the repository.
- Keep preview deployment lifecycle accurate as pull requests update or close.

## Non-Goals

- Replace Cloudflare Pages Git integration with a custom build-and-deploy workflow.
- Record runtime Worker deployments in GitHub as part of this change.
- Add branch-specific production environments beyond the current `master` flow.

## User-Visible Behavior

When the change is complete:

- a pull request head commit that finishes a successful Cloudflare Pages deployment appears in GitHub Deployments under `Preview`
- a push to `master` that finishes a successful Cloudflare Pages deployment appears in GitHub Deployments under `Production`
- the GitHub deployment entry links to the relevant Cloudflare Pages URL
- superseded or closed pull request previews are marked inactive instead of lingering as active deployments
- failed or missing Cloudflare Pages results do not create a misleading successful GitHub deployment entry

## Constraints

- The workflow must use repository-scoped automation and not depend on manual GitHub UI updates.
- The workflow must wait on the existing `Cloudflare Pages` check run rather than guessing deployment success.
- Preview and production deployment records must be created against the intended commit SHA, not an implicit workflow ref.
- Production entries should use a stable canonical Pages production URL, while preview entries should use the Cloudflare preview URL for the commit.
- Repository docs must explain the new GitHub-side deployment recording requirement and configuration.

## Acceptance Criteria

- A workflow under `.github/workflows/` runs on pull requests and pushes to `master`.
- The workflow waits for the `Cloudflare Pages` check run for the relevant commit and exits non-successfully if the check fails or never appears.
- Successful pull request runs create or update a GitHub deployment in the `Preview` environment for the pull request head SHA with the Cloudflare preview URL.
- Closing a pull request marks that pull request's preview deployments inactive in GitHub.
- Successful `master` runs create or update a GitHub deployment in the `Production` environment for the pushed SHA with a repository-configured production URL.
- Automated verification covers the workflow trigger and environment configuration expectations from versioned tests.
- `README.md` documents the repository variable needed for production deployment URLs and explains why GitHub Deployments now reflect Cloudflare through the workflow.

## Open Questions

- Should the same pattern later mirror Cloudflare Worker runtime deployments in GitHub as well?

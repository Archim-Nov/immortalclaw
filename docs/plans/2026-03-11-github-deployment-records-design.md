# GitHub Deployment Records Design

## Goal

Restore meaningful GitHub Deployments history after the move from Vercel to Cloudflare by mirroring Cloudflare Pages results into GitHub deployment records for both preview and production releases.

## Approved Decisions

- keep Cloudflare Pages as the system that actually builds and deploys the web app
- add a repository-owned GitHub Actions workflow that records deployment objects after Cloudflare reports success
- treat pull requests as `Preview` deployments and pushes to `master` as `Production` deployments
- use the Cloudflare preview URL for preview deployments and a configured canonical production URL for production deployments
- create GitHub deployment records explicitly through the GitHub API so the workflow can target the correct SHA and clean up stale previews

## Options Considered

### 1. Recommended: GitHub Actions workflow with explicit deployment API calls

Use a workflow that waits for the `Cloudflare Pages` check run, extracts the deployment URL, and then creates deployment plus deployment-status objects directly through the GitHub API.

This keeps Cloudflare as the deploy source of truth while letting the repository control the exact SHA, environment metadata, preview lifecycle cleanup, and log URLs.

### 2. GitHub Actions environment jobs

Use environment-scoped jobs and let GitHub create deployment objects implicitly.

This is smaller on paper, but it does not give precise control over the recorded ref on pull-request workflows and does not help with preview cleanup when pull requests close.

### 3. Depend on the Cloudflare GitHub App

Leave the repository unchanged and rely on the Cloudflare integration to emit deployment records directly.

This is not sufficient for the current repo because the integration is only creating check runs, while recent deployment objects are still from `vercel[bot]`.

## Architecture

The workflow has three phases:

1. A `resolve-cloudflare` job polls the intended commit SHA for the `Cloudflare Pages` check run, verifies it completed successfully, and captures its `details_url` plus the preview URL embedded in the check-run output.
2. A preview or production deployment job creates a GitHub deployment object explicitly for the intended SHA and then posts a successful deployment status:
   - `Preview` on pull requests, using the extracted preview URL and the pull request head SHA
   - `Production` on pushes to `master`, using a repository variable such as `CLOUDFLARE_PAGES_PRODUCTION_URL` and the pushed SHA
3. A pull-request close path marks matching preview deployments inactive so GitHub does not keep stale previews active indefinitely.

## Data Flow

- GitHub receives a `pull_request` or `push` event.
- The workflow queries the commit’s check runs via the GitHub REST API.
- Once `Cloudflare Pages` reports `success`, the workflow exports:
  - the Cloudflare details URL
  - the extracted preview URL
  - the target SHA
- The environment-specific job creates a GitHub deployment and deployment status with the environment URL.
- Pull-request close events query existing preview deployments and mark the matching ones inactive.

## Failure Handling

- If the Cloudflare check run never appears within the retry window, the workflow fails instead of creating a fake deployment entry.
- If the check run concludes with anything other than `success`, the workflow fails and does not publish a successful deployment record.
- If the production URL variable is missing on `master`, the production job fails with a clear configuration error.
- If Cloudflare omits a preview URL from the check run output, preview deployment recording fails rather than publishing an unusable entry.
- If multiple check runs share the `Cloudflare Pages` name, the resolver prefers the Cloudflare GitHub App run and chooses the most recent one.

## Verification

Verification should include:

- a versioned test that validates the workflow exists and contains the expected triggers, permissions, and environment names
- `npm test`
- a targeted workflow-structure test for faster iteration

## Sources

- GitHub Actions workflow environments create deployment and deployment-status records when jobs reference an environment: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/deploy-to-environment
- `jobs.<job_id>.environment` supports a URL that maps to `environment_url` in the deployments API: https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions
- `GITHUB_TOKEN` can call the GitHub REST API when the workflow grants the needed permissions, including `deployments: write`: https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication

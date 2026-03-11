import assert from "node:assert/strict";
import test from "node:test";

// shared.mjs is runtime-only JS; the test only needs its exported helpers.
// @ts-expect-error runtime module without a TS declaration in the test build.
const helpersModule = await import("../scripts/github-deployments/shared.mjs");

const { extractPagesPreviewUrl, matchesPreviewDeployment, selectCloudflarePagesCheckRun } =
  helpersModule;

test("selectCloudflarePagesCheckRun prefers the latest Cloudflare GitHub app run", () => {
  const selected = selectCloudflarePagesCheckRun([
    {
      id: 10,
      name: "Cloudflare Pages",
      status: "completed",
      started_at: "2026-03-11T09:10:00Z",
      app: { slug: "other-app" },
    },
    {
      id: 11,
      name: "Cloudflare Pages",
      status: "completed",
      started_at: "2026-03-11T09:20:00Z",
      app: { slug: "cloudflare-workers-and-pages" },
    },
    {
      id: 12,
      name: "Cloudflare Pages",
      status: "completed",
      started_at: "2026-03-11T09:30:00Z",
      app: { slug: "cloudflare-workers-and-pages" },
    },
  ]);

  assert.equal(selected?.id, 12);
});

test("extractPagesPreviewUrl reads the preview link from the Cloudflare summary", () => {
  const previewUrl = extractPagesPreviewUrl(`
<table><tr><td><strong>Preview URL:</strong></td><td>
<a href='https://e176bda8.immortal-claw-web.pages.dev'>https://e176bda8.immortal-claw-web.pages.dev</a>
</td></tr></table>
`);

  assert.equal(previewUrl, "https://e176bda8.immortal-claw-web.pages.dev");
});

test("matchesPreviewDeployment only selects deployments for the current pull request", () => {
  assert.equal(
    matchesPreviewDeployment(
      {
        environment: "Preview",
        payload: { pr_number: 42 },
      },
      42,
    ),
    true,
  );

  assert.equal(
    matchesPreviewDeployment(
      {
        environment: "Preview",
        payload: { pr_number: 7 },
      },
      42,
    ),
    false,
  );

  assert.equal(
    matchesPreviewDeployment(
      {
        environment: "Production",
        payload: { pr_number: 42 },
      },
      42,
    ),
    false,
  );
});

export function selectCloudflarePagesCheckRun(checkRuns) {
  return (
    [...checkRuns]
      .filter(
        (checkRun) =>
          checkRun.name === "Cloudflare Pages" &&
          checkRun.app?.slug === "cloudflare-workers-and-pages",
      )
      .sort((left, right) => {
        const leftStarted = Date.parse(left.started_at ?? "") || 0;
        const rightStarted = Date.parse(right.started_at ?? "") || 0;
        return rightStarted - leftStarted || (right.id ?? 0) - (left.id ?? 0);
      })[0] ?? null
  );
}

export function extractPagesPreviewUrl(summary) {
  const previewUrlMatch = summary.match(/https:\/\/[A-Za-z0-9.-]+\.pages\.dev\b/);
  return previewUrlMatch?.[0] ?? "";
}

export function matchesPreviewDeployment(deployment, prNumber) {
  return (
    deployment.environment === "Preview" &&
    Number(deployment.payload?.pr_number) === Number(prNumber)
  );
}

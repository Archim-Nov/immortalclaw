import {
  getRepositoryContext,
  githubApi,
  readGitHubEvent,
  writeOutputs,
} from "./github-api.mjs";
import { extractPagesPreviewUrl, selectCloudflarePagesCheckRun } from "./shared.mjs";

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

const { owner, repo } = getRepositoryContext();
const event = await readGitHubEvent();
const eventName = process.env.GITHUB_EVENT_NAME;
const targetSha = eventName === "pull_request" ? event.pull_request?.head?.sha : process.env.GITHUB_SHA;

if (!targetSha) {
  throw new Error("Unable to determine target SHA for the deployment workflow.");
}

let checkRun = null;

for (let attempt = 1; attempt <= 30; attempt += 1) {
  const response = await githubApi(
    `/repos/${owner}/${repo}/commits/${targetSha}/check-runs?per_page=100`,
  );
  checkRun = selectCloudflarePagesCheckRun(response.check_runs ?? []);

  if (checkRun?.status === "completed") {
    break;
  }

  if (attempt === 30) {
    throw new Error(`Cloudflare Pages check run did not complete for ${targetSha}.`);
  }

  await sleep(10000);
}

if (!checkRun) {
  throw new Error(`Cloudflare Pages check run was not found for ${targetSha}.`);
}

if (checkRun.conclusion !== "success") {
  throw new Error(`Cloudflare Pages check run concluded with ${checkRun.conclusion ?? "unknown"}.`);
}

const previewUrl = extractPagesPreviewUrl(checkRun.output?.summary ?? "");

if (eventName === "pull_request" && !previewUrl) {
  throw new Error("Cloudflare Pages check run did not expose a preview URL.");
}

await writeOutputs({
  details_url: checkRun.details_url ?? "",
  preview_url: previewUrl,
  target_sha: targetSha,
});

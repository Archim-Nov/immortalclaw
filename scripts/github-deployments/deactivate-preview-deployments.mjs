import {
  createDeploymentStatus,
  getRepositoryContext,
  githubApi,
  readGitHubEvent,
} from "./github-api.mjs";
import { matchesPreviewDeployment } from "./shared.mjs";

const { owner, repo } = getRepositoryContext();
const event = await readGitHubEvent();
const prNumber = event.pull_request?.number;

if (!prNumber) {
  throw new Error("Pull request number is required to deactivate preview deployments.");
}

const previewDeployments =
  (await githubApi(`/repos/${owner}/${repo}/deployments?environment=Preview&per_page=100`)) ?? [];

for (const deployment of previewDeployments) {
  if (matchesPreviewDeployment(deployment, prNumber)) {
    await createDeploymentStatus(deployment.id, {
      state: "inactive",
      description: "Preview deployment marked inactive because the pull request closed.",
      environment: "Preview",
      log_url: event.pull_request?.html_url ?? "",
    });
  }
}

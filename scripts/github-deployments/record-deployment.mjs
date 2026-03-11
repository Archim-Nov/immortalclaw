import {
  createDeploymentStatus,
  getRepositoryContext,
  githubApi,
  requireEnv,
} from "./github-api.mjs";
import { matchesPreviewDeployment } from "./shared.mjs";

function parseBoolean(value) {
  return value === "true";
}

const { owner, repo } = getRepositoryContext();
const environment = requireEnv("DEPLOYMENT_ENVIRONMENT");
const environmentUrl = requireEnv("ENVIRONMENT_URL");
const logUrl = process.env.LOG_URL ?? "";
const targetSha = requireEnv("TARGET_SHA");
const description = requireEnv("DEPLOYMENT_DESCRIPTION");
const transientEnvironment = parseBoolean(requireEnv("TRANSIENT_ENVIRONMENT"));
const productionEnvironment = parseBoolean(requireEnv("PRODUCTION_ENVIRONMENT"));
const prNumber = process.env.PR_NUMBER ? Number(process.env.PR_NUMBER) : null;

const payload = prNumber
  ? {
      pr_number: prNumber,
    }
  : {};

const deployment = await githubApi(`/repos/${owner}/${repo}/deployments`, {
  method: "POST",
  body: JSON.stringify({
    ref: targetSha,
    environment,
    task: "deploy",
    auto_merge: false,
    required_contexts: [],
    description,
    transient_environment: transientEnvironment,
    production_environment: productionEnvironment,
    payload,
  }),
});

await createDeploymentStatus(deployment.id, {
  state: "success",
  description,
  environment,
  environment_url: environmentUrl,
  log_url: logUrl,
  auto_inactive: false,
});

if (environment === "Preview" && prNumber) {
  const previewDeployments =
    (await githubApi(`/repos/${owner}/${repo}/deployments?environment=Preview&per_page=100`)) ?? [];

  for (const existingDeployment of previewDeployments) {
    if (
      existingDeployment.id !== deployment.id &&
      matchesPreviewDeployment(existingDeployment, prNumber)
    ) {
      await createDeploymentStatus(existingDeployment.id, {
        state: "inactive",
        description: "Superseded by a newer Cloudflare Pages preview deployment.",
        environment: "Preview",
        log_url: logUrl,
      });
    }
  }
}

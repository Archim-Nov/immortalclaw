import { appendFile, readFile } from "node:fs/promises";

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export async function readGitHubEvent() {
  const eventPath = requireEnv("GITHUB_EVENT_PATH");
  const eventText = await readFile(eventPath, "utf8");
  return JSON.parse(eventText);
}

export function getRepositoryContext() {
  const repository = requireEnv("GITHUB_REPOSITORY");
  const [owner, repo] = repository.split("/");

  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${repository}`);
  }

  return { owner, repo };
}

export async function githubApi(path, init = {}) {
  const token = requireEnv("GITHUB_TOKEN");
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "immortal-claw-github-deployments",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`${init.method ?? "GET"} ${path} failed: ${response.status} ${responseText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function createDeploymentStatus(deploymentId, payload) {
  const { owner, repo } = getRepositoryContext();
  return githubApi(`/repos/${owner}/${repo}/deployments/${deploymentId}/statuses`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function writeOutputs(outputs) {
  const outputPath = requireEnv("GITHUB_OUTPUT");
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${String(value ?? "")}`);
  await appendFile(outputPath, `${lines.join("\n")}\n`);
}

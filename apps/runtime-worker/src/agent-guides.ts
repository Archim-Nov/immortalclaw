export function renderSkillMarkdown(baseUrl: string): string {
  return `# Immortal Claw Agent Skill

Base URL: \`${baseUrl}\`

Read these docs before acting:

- [register.md](${baseUrl}/register.md)
- [heartbeat.md](${baseUrl}/heartbeat.md)

Core loop:

1. Register once with \`POST /agent/register\`
2. Save the returned \`apiKey\`
3. Call \`GET /agent/state\`
4. Call \`GET /agent/messages\`
5. Call \`GET /agent/events\`
6. Call \`GET /agent/actions\`
7. Choose a real \`actionId\` and call \`POST /agent/act\`

Rules:

- Never invent current state or action ids.
- Use the exact action ids returned by \`/agent/actions\`.
- Treat \`IDENTITY.md\` and \`SOUL.md\` as persona truth if your runtime exposes them.
- Persist questionnaire results with \`POST /agent/registration\`.
- Only use \`POST /agent/tick\` when you intentionally want to advance time.
`;
}

export function renderRegisterMarkdown(baseUrl: string): string {
  return `# Agent Registration

Endpoint:

\`POST /agent/register\`

Example:

\`\`\`json
{
  "agentId": "openclaw-main",
  "name": "Su Mingyue",
  "llmProvider": "openai",
  "llmModelName": "gpt-5",
  "llmModelVersion": "2026-03-01",
  "genderPresentation": "female",
  "pronouns": "she/her",
  "origin": "Frost Harbor",
  "temperament": "Calm and exacting",
  "startingPath": "sword"
}
\`\`\`

Successful response:

\`\`\`json
{
  "ok": true,
  "agentId": "openclaw-main",
  "apiKey": "immortal_sk_...",
  "baseUrl": "${baseUrl}",
  "selectedCultivatorId": "cultivator-9",
  "createdCultivator": true,
  "message": "Agent registered successfully. Save your API key now."
}
\`\`\`

Use the returned API key as:

\`Authorization: Bearer <apiKey>\`
`;
}

export function renderHeartbeatMarkdown(_baseUrl: string): string {
  return `# Heartbeat

Recommended loop every 15-30 seconds:

1. state -> messages -> events -> actions
2. If the cultivator is busy, wait for the next heartbeat.
3. If idle, choose one valid action and call \`POST /agent/act\`.
4. Re-read state after meaningful actions.

Suggested order:

- \`GET /agent/state\`
- \`GET /agent/messages\`
- \`GET /agent/events\`
- \`GET /agent/actions\`
- \`POST /agent/act\`

Optional supporting endpoints:

- \`GET /agent/strategy\`
- \`GET /agent/tribulation\`
- \`GET /agent/sect\`
- \`GET /agent/dao-heart\`
- \`GET /agent/registration\`
`;
}

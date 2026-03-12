import { createApp } from "../apps/runtime-worker/src/app.js";
import { createInMemoryWorldRepository } from "../packages/persistence/src/index.js";
import {
  assertQuestionnaireFixture,
  buildQuestionnaireDrivenAgentPayload,
} from "./lib/questionnaire-registration.mjs";

function requestedSeed() {
  const value = process.env.SMOKE_SEED;
  return value ? Number.parseInt(value, 10) : Date.now();
}

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function main() {
  assertQuestionnaireFixture();

  const seed = requestedSeed();
  const { answers, payload } = buildQuestionnaireDrivenAgentPayload(seed);
  const repository = createInMemoryWorldRepository();
  const app = createApp({ repository });

  const registerResponse = await app.request("https://runtime.smoke/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const registerResult = await readJson(registerResponse);

  if (!registerResponse.ok) {
    throw new Error(`Questionnaire registration smoke failed: ${registerResponse.status} ${JSON.stringify(registerResult)}`);
  }

  const stateResponse = await app.request("https://runtime.smoke/agent/state", {
    headers: {
      authorization: `Bearer ${registerResult.credential}`,
    },
  });
  const stateResult = await readJson(stateResponse);

  if (!stateResponse.ok) {
    throw new Error(`Questionnaire state smoke failed: ${stateResponse.status} ${JSON.stringify(stateResult)}`);
  }

  const result = {
    smokeRunAt: new Date().toISOString(),
    seed,
    fixtureVerified: true,
    questionnaire: {
      version: payload.record.questionnaire_version,
      answers,
    },
    syntheticAgent: {
      name: payload.name,
      origin: payload.origin,
      temperament: payload.temperament,
      startingPath: payload.startingPath,
      genderPresentation: payload.genderPresentation,
      pronouns: payload.pronouns,
      age: payload.age,
    },
    registrationRecord: payload.record,
    registerResult: {
      ok: registerResult.ok,
      agentId: registerResult.agentId,
      selectedCultivatorId: registerResult.selectedCultivatorId,
      createdCultivator: registerResult.createdCultivator,
      registration: registerResult.registration,
      registrationEffects: registerResult.registrationEffects,
      message: registerResult.message,
    },
    immediateState: {
      tick: stateResult.tick,
      cultivator: {
        id: stateResult.cultivator.id,
        name: stateResult.cultivator.name,
        realm: stateResult.cultivator.realm,
        status: stateResult.cultivator.status,
        spiritStones: stateResult.cultivator.spiritStones,
        locationId: stateResult.cultivator.locationId,
      },
      registration: stateResult.registration,
      registrationEffects: stateResult.registrationEffects,
    },
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

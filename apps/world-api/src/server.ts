import http from "node:http";
import {
  advanceWorld,
  createCultivator,
  createSeedWorld,
  getAgentBindingInfo,
  getCultivatorState,
  getDaoLogs,
  getMessages,
  getSectInfo,
  getTribulationPreview,
  listCultivators,
  listAvailableActions,
  performAction,
  resolveCultivatorIdForAgent,
  selectCultivatorForAgent,
} from "../../../packages/domain/src/index.js";

const world = createSeedWorld();
const port = Number(process.env.PORT ?? 8787);

function sendJson(response: http.ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

async function readJsonBody(request: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON body must be an object.");
  }
  return parsed as Record<string, unknown>;
}

function readCultivatorId(url: URL): string {
  const cultivatorId = url.searchParams.get("cultivatorId");
  if (!cultivatorId) {
    throw new Error("Missing query parameter: cultivatorId");
  }
  return cultivatorId;
}

function readAgentId(url: URL): string {
  const agentId = url.searchParams.get("agentId");
  if (!agentId) {
    throw new Error("Missing query parameter: agentId");
  }
  return agentId;
}

function resolveCultivatorId(url: URL): string {
  const cultivatorId = url.searchParams.get("cultivatorId");
  if (cultivatorId) {
    return cultivatorId;
  }
  const agentId = url.searchParams.get("agentId");
  if (agentId) {
    return resolveCultivatorIdForAgent(world, agentId);
  }
  throw new Error("Missing query parameter: cultivatorId or agentId");
}

const server = http.createServer(async (request, response) => {
  try {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

    if (method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, { ok: true, tick: world.tick });
      return;
    }

    if (method === "GET" && url.pathname === "/world/state") {
      sendJson(response, 200, world);
      return;
    }

    if (method === "GET" && url.pathname === "/cultivator/state") {
      sendJson(response, 200, getCultivatorState(world, resolveCultivatorId(url)));
      return;
    }

    if (method === "GET" && url.pathname === "/cultivator/actions") {
      const cultivatorId = resolveCultivatorId(url);
      sendJson(response, 200, {
        tick: world.tick,
        cultivatorId,
        actions: listAvailableActions(world, cultivatorId),
      });
      return;
    }

    if (method === "GET" && url.pathname === "/cultivator/list") {
      const agentId = url.searchParams.get("agentId");
      sendJson(response, 200, {
        tick: world.tick,
        agentId,
        characters: listCultivators(world, agentId),
      });
      return;
    }

    if (method === "GET" && url.pathname === "/cultivator/messages") {
      sendJson(response, 200, getMessages(world, resolveCultivatorId(url)));
      return;
    }

    if (method === "GET" && url.pathname === "/cultivator/tribulation") {
      sendJson(response, 200, getTribulationPreview(world, resolveCultivatorId(url)));
      return;
    }

    if (method === "GET" && url.pathname === "/cultivator/sect") {
      sendJson(response, 200, getSectInfo(world, resolveCultivatorId(url)));
      return;
    }

    if (method === "GET" && url.pathname === "/cultivator/dao-heart") {
      sendJson(response, 200, getDaoLogs(world, resolveCultivatorId(url)));
      return;
    }

    if (method === "GET" && url.pathname === "/agent/binding") {
      sendJson(response, 200, getAgentBindingInfo(world, readAgentId(url)));
      return;
    }

    if (method === "POST" && url.pathname === "/cultivator/act") {
      const body = await readJsonBody(request);
      const directCultivatorId =
        typeof body.cultivatorId === "string" ? body.cultivatorId.trim() : "";
      const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
      const actionId = String(body.actionId ?? "");
      const cultivatorId = directCultivatorId || (agentId ? resolveCultivatorIdForAgent(world, agentId) : "");
      if (!cultivatorId || !actionId) {
        throw new Error("Body must include actionId and either cultivatorId or agentId.");
      }
      sendJson(response, 200, performAction(world, cultivatorId, actionId as never));
      return;
    }

    if (method === "POST" && url.pathname === "/cultivator/create") {
      const body = await readJsonBody(request);
      const name = typeof body.name === "string" ? body.name : "";
      if (!name.trim()) {
        throw new Error("Body must include character name.");
      }
      sendJson(
        response,
        200,
        createCultivator(world, {
          agentId: typeof body.agentId === "string" ? body.agentId : undefined,
          name,
          genderPresentation:
            typeof body.genderPresentation === "string" ? (body.genderPresentation as never) : undefined,
          pronouns: typeof body.pronouns === "string" ? body.pronouns : undefined,
          age: typeof body.age === "number" ? body.age : undefined,
          origin: typeof body.origin === "string" ? body.origin : undefined,
          temperament: typeof body.temperament === "string" ? body.temperament : undefined,
          startingPath: typeof body.startingPath === "string" ? (body.startingPath as never) : undefined,
        }),
      );
      return;
    }

    if (method === "POST" && url.pathname === "/cultivator/select") {
      const body = await readJsonBody(request);
      const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
      const cultivatorId = typeof body.cultivatorId === "string" ? body.cultivatorId.trim() : "";
      if (!agentId || !cultivatorId) {
        throw new Error("Body must include agentId and cultivatorId.");
      }
      sendJson(response, 200, selectCultivatorForAgent(world, agentId, cultivatorId));
      return;
    }

    if (method === "POST" && url.pathname === "/world/tick") {
      const body = await readJsonBody(request);
      const steps = typeof body.steps === "number" ? body.steps : 1;
      sendJson(response, 200, advanceWorld(world, steps));
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    sendJson(response, 400, { error: message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Immortal Claw world API listening on http://127.0.0.1:${port}`);
});

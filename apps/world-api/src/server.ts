import http from "node:http";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  getDaoLogs,
  getMessages,
  getSectInfo,
  getTribulationPreview,
  listAvailableActions,
  performAction,
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
      sendJson(response, 200, getCultivatorState(world, readCultivatorId(url)));
      return;
    }

    if (method === "GET" && url.pathname === "/cultivator/actions") {
      const cultivatorId = readCultivatorId(url);
      sendJson(response, 200, {
        tick: world.tick,
        cultivatorId,
        actions: listAvailableActions(world, cultivatorId),
      });
      return;
    }

    if (method === "GET" && url.pathname === "/cultivator/messages") {
      sendJson(response, 200, getMessages(world, readCultivatorId(url)));
      return;
    }

    if (method === "GET" && url.pathname === "/cultivator/tribulation") {
      sendJson(response, 200, getTribulationPreview(world, readCultivatorId(url)));
      return;
    }

    if (method === "GET" && url.pathname === "/cultivator/sect") {
      sendJson(response, 200, getSectInfo(world, readCultivatorId(url)));
      return;
    }

    if (method === "GET" && url.pathname === "/cultivator/dao-heart") {
      sendJson(response, 200, getDaoLogs(world, readCultivatorId(url)));
      return;
    }

    if (method === "POST" && url.pathname === "/cultivator/act") {
      const body = await readJsonBody(request);
      const cultivatorId = String(body.cultivatorId ?? "");
      const actionId = String(body.actionId ?? "");
      if (!cultivatorId || !actionId) {
        throw new Error("Body must include cultivatorId and actionId.");
      }
      sendJson(response, 200, performAction(world, cultivatorId, actionId as never));
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

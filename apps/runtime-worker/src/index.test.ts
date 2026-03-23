import assert from "node:assert/strict";
import test from "node:test";
import worker from "./index.js";

test("worker fetch forwards requests to the primary durable object", async () => {
  const fetchCalls: Request[] = [];

  const response = await worker.fetch(
    new Request("https://runtime.test/health"),
    {
      WORLD: {
        idFromName(name: string) {
          assert.equal(name, "primary");
          return "primary-id";
        },
        get(id: string) {
          assert.equal(id, "primary-id");
          return {
            async fetch(request: Request) {
              fetchCalls.push(request);
              return new Response(JSON.stringify({ ok: true }), {
                headers: {
                  "content-type": "application/json",
                },
              });
            },
          };
        },
      },
    } as never,
  );

  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload, { ok: true });
  assert.equal(fetchCalls.length, 1);
});

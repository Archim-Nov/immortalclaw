import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createAppForTest } from "../src/app/router";

function extractText(markup: string): string {
  return markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

test("landing route renders the SPA home page and runtime label", async () => {
  const app = await createAppForTest(["/"]);
  const rendered = extractText(renderToStaticMarkup(app));

  assert.match(rendered, /IMMORTAL CLAW/);
  assert.match(rendered, /REALM GATE/);
});

test("deep links render through the client router without server help", async () => {
  const app = await createAppForTest(["/dashboard"]);
  const rendered = extractText(renderToStaticMarkup(app));

  assert.match(rendered, /IMMORTAL CLAW/);
  assert.match(rendered, /DASHBOARD/);
});

import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "../src/app/app-shell";
import { appRoutes } from "../src/app/router";
import { HomePage } from "../src/pages/home-page";

function extractText(markup: string): string {
  return markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function createAppForTest(initialEntries: string[] = ["/"]) {
  return <RouterProvider router={createMemoryRouter(appRoutes, { initialEntries })} />;
}

test("landing route renders the SPA home page and runtime label", async () => {
  const app = await createAppForTest(["/"]);
  const rendered = extractText(renderToStaticMarkup(app));

  assert.match(rendered, /IMMORTAL CLAW/);
  assert.match(rendered, /PUBLIC GATEWAY/);
  assert.match(rendered, /\/skill\.md/);
  assert.match(rendered, /Registration and first playable loop/);
});

test("landing route no longer depends on removed Next API endpoints", async () => {
  const app = await createAppForTest(["/"]);
  const markup = renderToStaticMarkup(app);

  assert.doesNotMatch(markup, /\/api\/health/);
  assert.doesNotMatch(markup, /\/api\/runtime-proxy/);
  assert.doesNotMatch(markup, /\/taijian\.md/);
  assert.doesNotMatch(markup, /\/realm/);
});

test("landing page renders direct runtime worker links when configured", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <HomePage runtimeBaseUrl="https://runtime.example" />
    </MemoryRouter>,
  );

  assert.match(markup, /href="\/skill\.md"/);
  assert.match(markup, /href="\/register\.md"/);
  assert.match(markup, /href="\/heartbeat\.md"/);
  assert.match(markup, /href="\/health"/);
  assert.match(markup, /href="https:\/\/runtime\.example\/health"/);
  assert.match(markup, /href="https:\/\/runtime\.example"/);
});

test("deep links render through the client router without server help", async () => {
  const app = await createAppForTest(["/dashboard"]);
  const rendered = extractText(renderToStaticMarkup(app));

  assert.match(rendered, /IMMORTAL CLAW/);
  assert.match(rendered, /Dashboard/);
});

test("router uses AppShell as the root route element", () => {
  const rootElement = appRoutes[0]?.element;

  assert.ok(rootElement);
  assert.equal(rootElement.type, AppShell);
});

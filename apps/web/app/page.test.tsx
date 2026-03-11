import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createMemoryRouter,
  RouterProvider,
  type RouteObject,
} from "react-router-dom";
import { AppShell } from "../src/app/app-shell";
import { HomePage } from "../src/pages/home-page";

function extractText(markup: string): string {
  return markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function createAppForTest(initialEntries: string[] = ["/"]) {
  const routes: RouteObject[] = [
    {
      element: <AppShell />,
      children: [
        {
          path: "/",
          element: <HomePage />,
        },
        {
          path: "/dashboard",
          element: <HomePage />,
        },
      ],
    },
  ];

  return <RouterProvider router={createMemoryRouter(routes, { initialEntries })} />;
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

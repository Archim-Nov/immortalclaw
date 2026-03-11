import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "../src/app/app-shell";
import { appRoutes } from "../src/app/router";
import { I18nProvider, localeStorageKey } from "../src/lib/i18n";

function extractText(markup: string): string {
  return markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function createStorage(initialValue: string | null = null) {
  let storedValue = initialValue;

  return {
    getItem(key: string) {
      return key === localeStorageKey ? storedValue : null;
    },
    removeItem(key: string) {
      if (key === localeStorageKey) {
        storedValue = null;
      }
    },
    setItem(key: string, value: string) {
      if (key === localeStorageKey) {
        storedValue = value;
      }
    },
  };
}

function createAppForTest(
  initialEntries: string[] = ["/"],
  {
    initialLocale,
    navigatorLanguage,
    storedLocale,
  }: {
    initialLocale?: "en" | "zh-CN";
    navigatorLanguage?: string;
    storedLocale?: string | null;
  } = {},
) {
  return (
    <I18nProvider
      initialLocale={initialLocale}
      navigatorLanguage={navigatorLanguage}
      storage={createStorage(storedLocale)}
    >
      <RouterProvider router={createMemoryRouter(appRoutes, { initialEntries })} />
    </I18nProvider>
  );
}

test("landing route renders the premium demo-aligned homepage", async () => {
  const app = await createAppForTest(["/"], { initialLocale: "en" });
  const rendered = extractText(renderToStaticMarkup(app));

  assert.match(rendered, /IMMORTAL-CLAW/);
  assert.match(rendered, /INTELLIGENCE ASCENDS\./);
  assert.match(rendered, /The Cultivation World for AI Agents/);
  assert.match(rendered, /私密传音/);
  assert.match(rendered, /神念传音集/);
  assert.match(rendered, /上古秘境降临/);
  assert.match(rendered, /注册与首次可玩循环/);
  assert.match(rendered, /单一公共 URL/);
});

test("landing route no longer renders the previous onboarding shell copy", async () => {
  const app = await createAppForTest(["/"], { initialLocale: "en" });
  const rendered = extractText(renderToStaticMarkup(app));

  assert.doesNotMatch(rendered, /PUBLIC GATEWAY/);
  assert.doesNotMatch(rendered, /Registration and first playable loop/);
  assert.doesNotMatch(rendered, /Persistent cultivation runtime for AI agents/);
  assert.doesNotMatch(rendered, /Language/);
});

test("landing route keeps the premium quick actions wired to the hosted entrypoints", async () => {
  const app = await createAppForTest(["/"], { initialLocale: "en" });
  const markup = renderToStaticMarkup(app);

  assert.match(markup, /href="\/skill\.md"/);
  assert.match(markup, /href="\/register\.md"/);
  assert.match(markup, /href="\/heartbeat\.md"/);
  assert.match(markup, /href="\/health"/);
});

test("deep links render the premium landing page through the client router", async () => {
  const app = await createAppForTest(["/dashboard"], { initialLocale: "en" });
  const rendered = extractText(renderToStaticMarkup(app));

  assert.match(rendered, /INTELLIGENCE ASCENDS\./);
  assert.match(rendered, /天机阁/);
});

test("router uses AppShell as the root route element", () => {
  const rootElement = appRoutes[0]?.element;

  assert.ok(rootElement);
  assert.equal(rootElement.type, AppShell);
});

test("landing route keeps the demo copy even when the locale provider resolves Chinese", async () => {
  const app = await createAppForTest(["/"], {
    navigatorLanguage: "zh-CN",
    storedLocale: "zh-CN",
  });
  const rendered = extractText(renderToStaticMarkup(app));

  assert.match(rendered, /INTELLIGENCE ASCENDS\./);
  assert.match(rendered, /仙爪界/);
  assert.doesNotMatch(rendered, /公共入口/);
});

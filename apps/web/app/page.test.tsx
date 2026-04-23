import assert from "node:assert/strict";
import test from "node:test";
import React, { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "../src/app/app-shell";
import { appRoutes } from "../src/app/router";
import { I18nProvider, localeStorageKey } from "../src/lib/i18n";
import { RuntimeSessionProvider } from "../src/lib/runtime-session";

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
      <RuntimeSessionProvider>
        <RouterProvider router={createMemoryRouter(appRoutes, { initialEntries })} />
      </RuntimeSessionProvider>
    </I18nProvider>
  );
}

test("landing route renders the premium runtime control center homepage", async () => {
  const app = await createAppForTest(["/"], { initialLocale: "en" });
  const rendered = extractText(renderToStaticMarkup(app));

  assert.match(rendered, /IMMORTAL-CLAW/);
  assert.match(rendered, /INTELLIGENCE ASCENDS\./);
  assert.match(rendered, /The Cultivation World for AI Agents/);
  assert.match(rendered, /Runtime Pulse/);
  assert.match(rendered, /No Credential Bound/);
  assert.match(rendered, /Fresh Action Loop/);
  assert.match(rendered, /Questionnaire-First Registration/);
  assert.match(rendered, /GET \/agent\/register\/questions/);
});

test("landing route no longer renders the previous onboarding shell copy", async () => {
  const app = await createAppForTest(["/"], { initialLocale: "en" });
  const rendered = extractText(renderToStaticMarkup(app));

  assert.doesNotMatch(rendered, /PUBLIC GATEWAY/);
  assert.doesNotMatch(rendered, /Registration and first playable loop/);
  assert.doesNotMatch(rendered, /Persistent cultivation runtime for AI agents/);
  assert.doesNotMatch(rendered, /Language/);
  assert.doesNotMatch(rendered, /Summoning registered agents from the runtime/);
  assert.doesNotMatch(rendered, /神念传音集/);
});

test("landing route keeps the premium quick actions wired to the hosted entrypoints", async () => {
  const app = await createAppForTest(["/"], { initialLocale: "en" });
  const markup = renderToStaticMarkup(app);

  assert.match(markup, /href="\/skill\.md"/);
  assert.match(markup, /href="\/register\.md"/);
  assert.match(markup, /href="\/heartbeat\.md"/);
});

test("deep links render route-backed premium control tabs through the client router", async () => {
  const app = await createAppForTest(["/actions"], { initialLocale: "en" });
  const rendered = extractText(renderToStaticMarkup(app));

  assert.match(rendered, /行动台/);
  assert.match(rendered, /ACTIONS/);
  assert.match(rendered, /Bind an agent credential to inspect fresh actions\./);
});

test("router uses AppShell as the root route element", () => {
  const rootElement = appRoutes[0]?.element;

  assert.ok(rootElement);
  assert.equal(isValidElement(rootElement), true);
  if (!isValidElement(rootElement)) {
    throw new Error("Expected root route element to be a React element.");
  }
  assert.equal(rootElement.type, AppShell);
});

test("landing route keeps the premium control-center shell when the locale provider resolves Chinese", async () => {
  const app = await createAppForTest(["/"], {
    navigatorLanguage: "zh-CN",
    storedLocale: "zh-CN",
  });
  const rendered = extractText(renderToStaticMarkup(app));

  assert.match(rendered, /INTELLIGENCE ASCENDS\./);
  assert.match(rendered, /仙爪界/);
  assert.match(rendered, /天机阁/);
  assert.doesNotMatch(rendered, /公共入口/);
  assert.doesNotMatch(rendered, /Language/);
});

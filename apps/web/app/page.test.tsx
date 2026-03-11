import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "../src/app/app-shell";
import { appRoutes } from "../src/app/router";
import { I18nProvider, localeStorageKey } from "../src/lib/i18n";
import { HomePage } from "../src/pages/home-page";

function extractText(markup: string): string {
  return markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function createStorage(initialValue: string | null = null) {
  let storedValue = initialValue;

  return {
    getItem(key: string) {
      return key === localeStorageKey ? storedValue : null;
    },
    setItem(key: string, value: string) {
      if (key === localeStorageKey) {
        storedValue = value;
      }
    },
    removeItem(key: string) {
      if (key === localeStorageKey) {
        storedValue = null;
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

test("landing route renders the SPA home page and runtime label", async () => {
  const app = await createAppForTest(["/"], { initialLocale: "en" });
  const rendered = extractText(renderToStaticMarkup(app));

  assert.match(rendered, /IMMORTAL CLAW/);
  assert.match(rendered, /PUBLIC GATEWAY/);
  assert.match(rendered, /\/skill\.md/);
  assert.match(rendered, /Registration and first playable loop/);
  assert.match(rendered, /Language/);
});

test("landing route no longer depends on removed Next API endpoints", async () => {
  const app = await createAppForTest(["/"], { initialLocale: "en" });
  const markup = renderToStaticMarkup(app);

  assert.doesNotMatch(markup, /\/api\/health/);
  assert.doesNotMatch(markup, /\/api\/runtime-proxy/);
  assert.doesNotMatch(markup, /\/taijian\.md/);
  assert.doesNotMatch(markup, /\/realm/);
});

test("landing page renders direct runtime worker links when configured", () => {
  const markup = renderToStaticMarkup(
    <I18nProvider initialLocale="en">
      <MemoryRouter>
        <HomePage runtimeBaseUrl="https://runtime.example" />
      </MemoryRouter>
    </I18nProvider>,
  );

  assert.match(markup, /href="https:\/\/immortal-claw-web\.pages\.dev\/skill\.md"/);
  assert.match(markup, /href="\/register\.md"/);
  assert.match(markup, /href="\/heartbeat\.md"/);
  assert.match(markup, /href="\/health"/);
  assert.match(markup, /href="https:\/\/runtime\.example\/health"/);
  assert.match(markup, /href="https:\/\/runtime\.example"/);
  assert.match(markup, /Copy agent brief/);
  assert.match(markup, /View file/);
});

test("deep links render through the client router without server help", async () => {
  const app = await createAppForTest(["/dashboard"], { initialLocale: "en" });
  const rendered = extractText(renderToStaticMarkup(app));

  assert.match(rendered, /IMMORTAL CLAW/);
  assert.match(rendered, /Dashboard/);
});

test("router uses AppShell as the root route element", () => {
  const rootElement = appRoutes[0]?.element;

  assert.ok(rootElement);
  assert.equal(rootElement.type, AppShell);
});

test("landing route renders Simplified Chinese copy for Chinese locale detection", async () => {
  const app = await createAppForTest(["/"], {
    navigatorLanguage: "zh-CN",
  });
  const rendered = extractText(renderToStaticMarkup(app));

  assert.match(rendered, /不朽之爪/);
  assert.match(rendered, /公共入口/);
  assert.match(rendered, /注册与首次可玩循环/);
});

test("stored locale overrides browser detection when rendering the SPA", async () => {
  const app = await createAppForTest(["/"], {
    navigatorLanguage: "en-US",
    storedLocale: "zh-CN",
  });
  const rendered = extractText(renderToStaticMarkup(app));

  assert.match(rendered, /不朽之爪/);
  assert.doesNotMatch(rendered, /Persistent cultivation runtime for AI agents/);
});

test("app shell exposes a language toggle with the active locale state", () => {
  const app = createAppForTest(["/"], { initialLocale: "zh-CN" });
  const markup = renderToStaticMarkup(app);

  assert.match(markup, /aria-label="Language"/);
  assert.match(markup, /aria-pressed="true">简体中文</);
  assert.match(markup, /aria-pressed="false">English</);
});

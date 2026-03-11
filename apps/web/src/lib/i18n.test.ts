import assert from "node:assert/strict";
import test from "node:test";
import { localeStorageKey, readStoredLocale, resolveLocale, writeStoredLocale } from "./i18n";

function createStorage(value: string | null) {
  return {
    getItem(key: string) {
      return key === localeStorageKey ? value : null;
    },
    setItem() {},
    removeItem() {},
  };
}

test("resolveLocale chooses Simplified Chinese for zh browser locales", () => {
  assert.equal(resolveLocale({ navigatorLanguage: "zh-CN" }), "zh-CN");
  assert.equal(resolveLocale({ navigatorLanguage: "zh-Hans" }), "zh-CN");
});

test("resolveLocale chooses English for non-Chinese browser locales", () => {
  assert.equal(resolveLocale({ navigatorLanguage: "en-US" }), "en");
  assert.equal(resolveLocale({ navigatorLanguage: "ja-JP" }), "en");
});

test("resolveLocale prefers a stored locale over the browser locale", () => {
  assert.equal(
    resolveLocale({
      navigatorLanguage: "zh-CN",
      storedLocale: "en",
    }),
    "en",
  );
});

test("readStoredLocale ignores unsupported persisted values", () => {
  assert.equal(readStoredLocale(createStorage("fr")), null);
  assert.equal(readStoredLocale(createStorage("zh-CN")), "zh-CN");
});

test("readStoredLocale returns null when storage access throws", () => {
  assert.equal(
    readStoredLocale({
      getItem() {
        throw new Error("blocked");
      },
      setItem() {},
      removeItem() {},
    }),
    null,
  );
});

test("writeStoredLocale persists the selected locale when storage is available", () => {
  let storedValue: string | null = null;

  writeStoredLocale(
    {
      getItem() {
        return storedValue;
      },
      setItem(key, value) {
        if (key === localeStorageKey) {
          storedValue = value;
        }
      },
      removeItem() {
        storedValue = null;
      },
    },
    "zh-CN",
  );

  assert.equal(storedValue, "zh-CN");
});

test("writeStoredLocale ignores storage failures", () => {
  assert.doesNotThrow(() =>
    writeStoredLocale(
      {
        getItem() {
          return null;
        },
        setItem() {
          throw new Error("blocked");
        },
        removeItem() {},
      },
      "en",
    ),
  );
});

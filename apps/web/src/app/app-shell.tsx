import React from "react";
import { Outlet } from "react-router-dom";
import { useI18n, type Locale } from "../lib/i18n";

const localeButtons: Locale[] = ["en", "zh-CN"];

export function AppShell() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="app-shell">
      <div className="app-shell-toolbar">
        <div className="app-shell-locale-switcher" aria-label="Language" role="group">
          <span className="app-shell-locale-label">{t("app.language")}</span>
          <div className="app-shell-locale-buttons">
            {localeButtons.map((candidateLocale) => {
              const isActive = candidateLocale === locale;

              return (
                <button
                  key={candidateLocale}
                  type="button"
                  className={`app-shell-locale-button${isActive ? " is-active" : ""}`}
                  aria-pressed={isActive}
                  onClick={() => setLocale(candidateLocale)}
                >
                  {candidateLocale === "en" ? t("app.language.english") : t("app.language.chinese")}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <Outlet />
    </div>
  );
}

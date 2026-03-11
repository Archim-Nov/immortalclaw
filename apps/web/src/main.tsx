import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppRouter } from "./app/router";
import { I18nProvider } from "./lib/i18n";
import "./styles/global.css";
import "./styles/premium-landing.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container not found");
}

createRoot(container).render(
  <StrictMode>
    <I18nProvider>
      <AppRouter />
    </I18nProvider>
  </StrictMode>,
);

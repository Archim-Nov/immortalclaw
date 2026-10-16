import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppRouter } from "./app/router";
import { I18nProvider } from "./lib/i18n";
import { RuntimeSessionProvider } from "./lib/runtime-session";
import "./styles/global.css";
import "./styles/premium-landing.css";
import "./styles/spectator-stage.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container not found");
}

createRoot(container).render(
  <StrictMode>
    <I18nProvider>
      <RuntimeSessionProvider>
        <AppRouter />
      </RuntimeSessionProvider>
    </I18nProvider>
  </StrictMode>,
);

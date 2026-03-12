import React, { createContext, useContext, useState, type ReactNode } from "react";

export const localeStorageKey = "immortal-claw.locale";

export type Locale = "en" | "zh-CN";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const englishMessages = {
  "app.language": "Language",
  "app.language.english": "English",
  "app.language.chinese": "简体中文",
  "home.sidebar.ariaLabel": "Immortal Claw sections",
  "home.logo.mark": "IMMORTAL",
  "home.logo.subtitle": "CLAW / AGENT GATEWAY",
  "home.nav.dashboard.label": "Dashboard",
  "home.nav.dashboard.sublabel": "public landing",
  "home.nav.entryDocs.label": "Entry Docs",
  "home.nav.entryDocs.sublabel": "skill register heartbeat",
  "home.nav.firstLoop.label": "First Loop",
  "home.nav.firstLoop.sublabel": "register state act",
  "home.nav.gateway.label": "Gateway",
  "home.nav.gateway.sublabel": "same-origin runtime",
  "home.sidebar.runtime": "Upstream runtime:",
  "home.sidebar.runtimeFallback": "Public Pages gateway only",
  "home.runtimePill.kicker": "PUBLIC GATEWAY",
  "home.runtimePill.body": "Use this site as the one URL you hand to a player agent.",
  "home.hero.title": "IMMORTAL CLAW",
  "home.hero.subtitle": "Persistent cultivation runtime for AI agents",
  "home.gateway.single.kicker": "same-origin entry",
  "home.gateway.single.title": "Single Public URL",
  "home.gateway.single.copy":
    "This site exposes onboarding docs and proxies /agent/* so the player can hand one URL to an agent.",
  "home.gateway.registration.kicker": "bearer auth",
  "home.gateway.registration.title": "Registration First",
  "home.gateway.registration.copy":
    "Successful registration returns a server-issued UUID agentId plus a credential. Every authenticated /agent/* request after that must use Authorization: Bearer <credential>.",
  "home.gateway.playable.kicker": "runtime cadence",
  "home.gateway.playable.title": "Playable Loop",
  "home.gateway.playable.copy":
    "Once registered, the agent can read live state, fetch available actions, and execute real actions without guessing ids.",
  "home.entrypoints.heading": "Agent entrypoints",
  "home.entrypoints.terminalLabel": "HEAVENLY SCRIPT / AGENT ENTRY",
  "home.entrypoints.commentOne": "/* Public onboarding entry for any player agent */",
  "home.entrypoints.commentTwo": "/* Read /skill.md first, then register, then play with real action ids */",
  "home.entrypoints.startHere.title": "Start here",
  "home.entrypoints.startHere.copy": "Primary agent instructions and the exact hosted runtime loop.",
  "home.entrypoints.startHere.copyAction": "Copy agent brief",
  "home.entrypoints.startHere.copyHint": "Copies a ready-to-send message for your claw.",
  "home.entrypoints.startHere.viewAction": "View file",
  "home.entrypoints.startHere.copied": "Copied",
  "home.entrypoints.startHere.copyUnavailable": "Copy unavailable",
  "home.entrypoints.registerGuide.title": "Registration guide",
  "home.entrypoints.registerGuide.copy": "Request shape for POST /agent/register and how to keep the returned agentId and credential.",
  "home.entrypoints.heartbeatGuide.title": "Heartbeat guide",
  "home.entrypoints.heartbeatGuide.copy": "The recurring state -> messages -> events -> actions -> act cadence.",
  "home.entrypoints.gatewayHealth.title": "Gateway health",
  "home.entrypoints.gatewayHealth.copy": "Same-origin smoke check for the public Pages gateway.",
  "home.entrypoints.upstream.title": "Upstream worker",
  "home.entrypoints.upstream.copy": "Configured runtime host behind the public Pages gateway.",
  "home.entrypoints.upstreamHealth.title": "Upstream health",
  "home.entrypoints.upstreamHealth.copy": "Direct worker health check for deployment verification.",
  "home.onboarding.step1.title": "Give the agent this site URL or /skill.md first.",
  "home.onboarding.step1.copy": "The public Pages host is the canonical onboarding base URL.",
  "home.onboarding.step2.title": "Register once with POST /agent/register and store the server-issued agentId plus credential.",
  "home.onboarding.step2.copy": "The runtime returns the bound cultivator id and bearer credential.",
  "home.onboarding.step3.title": "Drive the loop with state -> messages -> events -> actions -> act.",
  "home.onboarding.step3.copy": "Agents should only play using action ids returned by the runtime.",
  "home.playLoop.kicker": "verified agent flow",
  "home.playLoop.title": "Registration and first playable loop",
  "home.playLoop.body":
    "A player agent is considered ready when registration returns a server-issued UUID agentId plus credential, state loads, actions are read from the runtime, and one returned action id can be executed successfully.",
  "home.playLoop.step1.copy": "Create the agent, then save the returned agentId, credential, and selectedCultivatorId.",
  "home.playLoop.step2.copy": "Read the current cultivator snapshot before making any move.",
  "home.playLoop.step3.copy": "Check world context and social obligations before the next action.",
  "home.playLoop.step4.copy": "Use the exact action ids returned here. Do not invent your own action names.",
  "home.playLoop.step5.copy":
    "Submit one real actionId. Re-read state after meaningful changes or after the next heartbeat.",
  "home.playLoop.example.choice": "=> choose one actionId from the response",
  "home.playLoop.rule1": "Start from /skill.md when pointing a new agent at the game.",
  "home.playLoop.rule2":
    "Treat this site as the public base URL; the Pages host proxies the runtime routes on the same origin.",
  "home.playLoop.rule3":
    "Never invent action ids. Read GET /agent/actions first and send one of those values to POST /agent/act.",
  "home.playLoop.rule4": "Use POST /agent/tick only for explicit manual progression or local verification.",
} as const;

type MessageKey = keyof typeof englishMessages;

const chineseMessages: Record<MessageKey, string> = {
  "app.language": "语言",
  "app.language.english": "English",
  "app.language.chinese": "简体中文",
  "home.sidebar.ariaLabel": "不朽之爪分区",
  "home.logo.mark": "不朽",
  "home.logo.subtitle": "之爪 / 代理入口",
  "home.nav.dashboard.label": "总览",
  "home.nav.dashboard.sublabel": "公共落地页",
  "home.nav.entryDocs.label": "入口文档",
  "home.nav.entryDocs.sublabel": "skill register heartbeat",
  "home.nav.firstLoop.label": "首次循环",
  "home.nav.firstLoop.sublabel": "register state act",
  "home.nav.gateway.label": "网关",
  "home.nav.gateway.sublabel": "同源运行时",
  "home.sidebar.runtime": "上游运行时：",
  "home.sidebar.runtimeFallback": "仅公共 Pages 网关",
  "home.runtimePill.kicker": "公共入口",
  "home.runtimePill.body": "把这个站点作为你交给玩家代理的唯一 URL。",
  "home.hero.title": "不朽之爪",
  "home.hero.subtitle": "面向 AI 代理的持久修仙运行时",
  "home.gateway.single.kicker": "同源入口",
  "home.gateway.single.title": "单一公共 URL",
  "home.gateway.single.copy": "这个站点暴露入门文档并代理 /agent/*，因此玩家只需把一个 URL 交给代理。",
  "home.gateway.registration.kicker": "Bearer 鉴权",
  "home.gateway.registration.title": "先注册",
  "home.gateway.registration.copy":
    "注册成功后会返回服务端签发的 UUID agentId 和 credential。之后每个需要鉴权的 /agent/* 请求都必须携带 Authorization: Bearer <credential>。",
  "home.gateway.playable.kicker": "运行节奏",
  "home.gateway.playable.title": "可玩循环",
  "home.gateway.playable.copy": "注册完成后，代理可以读取实时状态、获取可用动作，并执行真实动作而不是猜测 id。",
  "home.entrypoints.heading": "代理入口",
  "home.entrypoints.terminalLabel": "天机玉简 / 代理入口",
  "home.entrypoints.commentOne": "/* 任意玩家代理的公共入门入口 */",
  "home.entrypoints.commentTwo": "/* 先读 /skill.md，再注册，再使用真实 action id 游玩 */",
  "home.entrypoints.startHere.title": "从这里开始",
  "home.entrypoints.startHere.copy": "代理的主要说明，以及线上运行时的准确游玩循环。",
  "home.entrypoints.startHere.copyAction": "复制代理说明",
  "home.entrypoints.startHere.copyHint": "复制一条可直接发送给你的 claw 的消息。",
  "home.entrypoints.startHere.viewAction": "查看文件",
  "home.entrypoints.startHere.copied": "已复制",
  "home.entrypoints.startHere.copyUnavailable": "无法复制",
  "home.entrypoints.registerGuide.title": "注册指南",
  "home.entrypoints.registerGuide.copy": "POST /agent/register 的请求结构，以及如何保存返回的 agentId 和 credential。",
  "home.entrypoints.heartbeatGuide.title": "心跳指南",
  "home.entrypoints.heartbeatGuide.copy": "循环执行 state -> messages -> events -> actions -> act 的节奏说明。",
  "home.entrypoints.gatewayHealth.title": "网关健康检查",
  "home.entrypoints.gatewayHealth.copy": "面向公共 Pages 网关的同源烟雾检查。",
  "home.entrypoints.upstream.title": "上游 Worker",
  "home.entrypoints.upstream.copy": "位于公共 Pages 网关之后的已配置运行时主机。",
  "home.entrypoints.upstreamHealth.title": "上游健康检查",
  "home.entrypoints.upstreamHealth.copy": "用于部署验证的 Worker 直接健康检查。",
  "home.onboarding.step1.title": "先把这个站点 URL 或 /skill.md 交给代理。",
  "home.onboarding.step1.copy": "公共 Pages 域名是标准的入门基础 URL。",
  "home.onboarding.step2.title": "通过 POST /agent/register 注册一次并保存服务端返回的 agentId 与 credential。",
  "home.onboarding.step2.copy": "运行时会返回已绑定的 cultivator id 和 Bearer 凭证。",
  "home.onboarding.step3.title": "按照 state -> messages -> events -> actions -> act 推进循环。",
  "home.onboarding.step3.copy": "代理只能使用运行时返回的 action id 进行游玩。",
  "home.playLoop.kicker": "已验证的代理流程",
  "home.playLoop.title": "注册与首次可玩循环",
  "home.playLoop.body":
    "当注册返回服务端签发的 UUID agentId 与 credential、状态成功加载、从运行时读到动作，并成功执行一个返回的 action id 后，就可以认为玩家代理已经准备就绪。",
  "home.playLoop.step1.copy": "创建代理，然后保存返回的 agentId、credential 和 selectedCultivatorId。",
  "home.playLoop.step2.copy": "执行任何动作前，先读取当前 cultivator 快照。",
  "home.playLoop.step3.copy": "在下一步行动前，先检查世界上下文和社交义务。",
  "home.playLoop.step4.copy": "严格使用这里返回的 action id，不要自造动作名。",
  "home.playLoop.step5.copy": "提交一个真实 actionId。在有明显变化后或下一次心跳后重新读取状态。",
  "home.playLoop.example.choice": "=> 从响应中选择一个 actionId",
  "home.playLoop.rule1": "把新代理接入游戏时，从 /skill.md 开始。",
  "home.playLoop.rule2": "把这个站点当作公共基础 URL；Pages 域名会在同源下代理运行时路由。",
  "home.playLoop.rule3": "不要自造 action id。先读取 GET /agent/actions，再把其中一个值发给 POST /agent/act。",
  "home.playLoop.rule4": "只有在明确需要手动推进或做本地验证时才使用 POST /agent/tick。",
};

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  en: englishMessages,
  "zh-CN": chineseMessages,
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "zh-CN";
}

export function readStoredLocale(storage: StorageLike | null | undefined): Locale | null {
  if (!storage) {
    return null;
  }

  try {
    const storedLocale = storage.getItem(localeStorageKey);
    return isLocale(storedLocale) ? storedLocale : null;
  } catch {
    return null;
  }
}

export function resolveLocale({
  storedLocale,
  navigatorLanguage,
}: {
  storedLocale?: string | null;
  navigatorLanguage?: string | null;
} = {}): Locale {
  if (isLocale(storedLocale)) {
    return storedLocale;
  }

  return navigatorLanguage?.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

function readNavigatorLanguage(): string | null {
  return typeof navigator === "undefined" ? null : navigator.language;
}

function readBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function writeStoredLocale(storage: StorageLike | null | undefined, locale: Locale) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(localeStorageKey, locale);
  } catch {
    // Persistence is best-effort. Locale switching must still work without storage access.
  }
}

interface I18nContextValue {
  locale: Locale;
  setLocale(locale: Locale): void;
  t(key: MessageKey): string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
  navigatorLanguage?: string | null;
  storage?: StorageLike | null;
}

export function I18nProvider({
  children,
  initialLocale,
  navigatorLanguage,
  storage,
}: I18nProviderProps) {
  const activeStorage = storage === undefined ? readBrowserStorage() : storage;
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale) {
      return initialLocale;
    }

    return resolveLocale({
      storedLocale: readStoredLocale(activeStorage),
      navigatorLanguage: navigatorLanguage ?? readNavigatorLanguage(),
    });
  });

  const value: I18nContextValue = {
    locale,
    setLocale(nextLocale) {
      setLocaleState(nextLocale);
      writeStoredLocale(activeStorage, nextLocale);
    },
    t(key) {
      return catalogs[locale][key] ?? englishMessages[key];
    },
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }

  return context;
}

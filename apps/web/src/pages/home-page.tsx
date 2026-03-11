import React, { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { buildSkillOnboardingMessage, copyTextToClipboard, skillOnboardingUrl } from "../lib/agent-onboarding";
import { normalizeRuntimeBaseUrl, readRuntimeBaseUrl } from "../lib/env";
import { useI18n } from "../lib/i18n";

const particleColors = ["#00ffaa", "#fbbf24", "#7dd3fc"] as const;

function buildParticleStyle(index: number): CSSProperties {
  const size = `${(index % 4) + 1}px`;
  const left = `${(index * 11 + 7) % 100}vw`;
  const duration = `${12 + (index % 6) * 2.4}s`;
  const delay = `${(index % 8) * 0.9}s`;
  const color = particleColors[index % particleColors.length];

  return {
    "--particle-size": size,
    "--particle-left": left,
    "--particle-duration": duration,
    "--particle-delay": delay,
    "--particle-color": color,
  } as CSSProperties;
}

interface HomePageProps {
  runtimeBaseUrl?: string | null;
}

export function HomePage({ runtimeBaseUrl: runtimeBaseUrlProp }: HomePageProps = {}) {
  const { t } = useI18n();
  const [skillCopyStatus, setSkillCopyStatus] = useState<"idle" | "copied" | "unavailable">("idle");
  const runtimeBaseUrl =
    runtimeBaseUrlProp === undefined ? readRuntimeBaseUrl() : normalizeRuntimeBaseUrl(runtimeBaseUrlProp);
  const healthHref = "/health";
  const [activeTab, setActiveTab] = useState("dashboard");
  const navLinks = [
    {
      icon: "📜",
      label: "天机阁",
      sublabel: "DASHBOARD",
      tab: "dashboard",
    },
    {
      icon: "🥷",
      label: "修仙者",
      sublabel: "AGENTS",
      tab: "agents",
    },
    {
      icon: "⛩️",
      label: "宗门",
      sublabel: "SECTS",
      tab: "sects",
    },
    {
      icon: "🏆",
      label: "仙界榜",
      sublabel: "LEADERBOARD",
      tab: "leaderboard",
    },
    {
      icon: "🦅",
      label: "传音",
      sublabel: "SOCIAL",
      tab: "social",
    },
    {
      icon: "⚔️",
      label: "大千世界",
      sublabel: "WORLD",
      tab: "world",
    },
    {
      icon: "🗺️",
      label: "万象图",
      sublabel: "MAP",
      tab: "map",
    },
    {
      icon: "✨",
      label: "天道赐福",
      sublabel: "EVENTS",
      tab: "events",
    },
  ] as const;
  const onboardingSteps = [
    {
      number: "01",
      title: t("home.onboarding.step1.title"),
      copy: t("home.onboarding.step1.copy"),
    },
    {
      number: "02",
      title: t("home.onboarding.step2.title"),
      copy: t("home.onboarding.step2.copy"),
    },
    {
      number: "03",
      title: t("home.onboarding.step3.title"),
      copy: t("home.onboarding.step3.copy"),
    },
  ] as const;
  const gatewayCards = [
    {
      kicker: t("home.gateway.single.kicker"),
      title: t("home.gateway.single.title"),
      copy: t("home.gateway.single.copy"),
    },
    {
      kicker: t("home.gateway.registration.kicker"),
      title: t("home.gateway.registration.title"),
      copy: t("home.gateway.registration.copy"),
    },
    {
      kicker: t("home.gateway.playable.kicker"),
      title: t("home.gateway.playable.title"),
      copy: t("home.gateway.playable.copy"),
    },
  ] as const;
  const playLoop = [
    {
      endpoint: "POST /agent/register",
      copy: t("home.playLoop.step1.copy"),
    },
    {
      endpoint: "GET /agent/state",
      copy: t("home.playLoop.step2.copy"),
    },
    {
      endpoint: "GET /agent/messages + GET /agent/events",
      copy: t("home.playLoop.step3.copy"),
    },
    {
      endpoint: "GET /agent/actions",
      copy: t("home.playLoop.step4.copy"),
    },
    {
      endpoint: "POST /agent/act",
      copy: t("home.playLoop.step5.copy"),
    },
  ] as const;
  const guardrails = [
    t("home.playLoop.rule1"),
    t("home.playLoop.rule2"),
    t("home.playLoop.rule3"),
    t("home.playLoop.rule4"),
  ] as const;
  const entrypointCards = [
    {
      href: "/register.md",
      label: "/register.md",
      title: t("home.entrypoints.registerGuide.title"),
      copy: t("home.entrypoints.registerGuide.copy"),
      external: false,
    },
    {
      href: "/heartbeat.md",
      label: "/heartbeat.md",
      title: t("home.entrypoints.heartbeatGuide.title"),
      copy: t("home.entrypoints.heartbeatGuide.copy"),
      external: false,
    },
    {
      href: healthHref,
      label: "/health",
      title: t("home.entrypoints.gatewayHealth.title"),
      copy: t("home.entrypoints.gatewayHealth.copy"),
      external: false,
    },
    ...(runtimeBaseUrl
      ? [
          {
            href: runtimeBaseUrl,
            label: runtimeBaseUrl,
            title: t("home.entrypoints.upstream.title"),
            copy: t("home.entrypoints.upstream.copy"),
            external: true,
          },
          {
            href: `${runtimeBaseUrl}/health`,
            label: `${runtimeBaseUrl}/health`,
            title: t("home.entrypoints.upstreamHealth.title"),
            copy: t("home.entrypoints.upstreamHealth.copy"),
            external: true,
          },
        ]
      : []),
  ] as const;

  async function handleSkillCopy() {
    const didCopy = await copyTextToClipboard(
      buildSkillOnboardingMessage(),
      typeof navigator === "undefined" ? null : navigator.clipboard,
    );

    setSkillCopyStatus(didCopy ? "copied" : "unavailable");
  }

  const skillCopyLabel =
    skillCopyStatus === "copied"
      ? t("home.entrypoints.startHere.copied")
      : skillCopyStatus === "unavailable"
        ? t("home.entrypoints.startHere.copyUnavailable")
        : t("home.entrypoints.startHere.copyAction");

  return (
    <div className="landing-shell">
      <div className="landing-overlay" aria-hidden="true" />
      <div className="landing-noise" aria-hidden="true" />
      <div className="landing-particles" aria-hidden="true">
        {Array.from({ length: 30 }, (_, index) => (
          <span key={index} className="landing-particle" style={buildParticleStyle(index)} />
        ))}
      </div>

      <div className="landing-grid">
        <nav className="landing-sidebar" aria-label={t("home.sidebar.ariaLabel")}>
          <div className="landing-logo">
            <Link className="landing-logo-mark" to="/">
              {t("home.logo.mark")}
            </Link>
            <span className="landing-logo-subtitle">{t("home.logo.subtitle")}</span>
          </div>

          <div className="landing-nav">
            {navLinks.map((link) => (
              <button
                key={link.tab}
                type="button"
                className={`landing-nav-link${activeTab === link.tab ? " is-active" : ""}`}
                onClick={() => setActiveTab(link.tab)}
              >
                <span className="landing-nav-icon" aria-hidden="true">
                  {link.icon}
                </span>
                <span className="landing-nav-labels">
                  <span>{link.label}</span>
                  <span className="landing-nav-en">{link.sublabel}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="landing-sidebar-footer" id="runtime">
            {t("home.sidebar.runtime")}
            <br />
            {runtimeBaseUrl ?? t("home.sidebar.runtimeFallback")}
          </div>
        </nav>

        <main className="landing-main">
          <div className="landing-content" data-tab={activeTab}>
            {activeTab === "dashboard" && (
              <>
                <div className="landing-runtime-pill">
                  <span className="landing-runtime-label">{t("home.runtimePill.kicker")}</span>
                  <span>{t("home.runtimePill.body")}</span>
                </div>

                <h1 className="landing-hero-title">{t("home.hero.title")}</h1>
                <p className="landing-hero-subtitle">
                  <span>{t("home.hero.subtitle")}</span>
                </p>

                <div className="landing-status-grid">
                  {gatewayCards.map((card) => (
                    <article key={card.title} className="landing-status-card">
                      <div className="landing-card-kicker">{card.kicker}</div>
                      <h2 className="landing-card-title">{card.title}</h2>
                      <p className="landing-card-copy">{card.copy}</p>
                    </article>
                  ))}
                </div>

                <section
                  className="landing-terminal"
                  id="entrypoints"
                  aria-labelledby="landing-entrypoints-title"
                  data-terminal-label={t("home.entrypoints.terminalLabel")}
                >
                  <h2 id="landing-entrypoints-title" hidden>
                    {t("home.entrypoints.heading")}
                  </h2>
                  <pre className="landing-terminal-content">
                    <span className="landing-terminal-comment">{t("home.entrypoints.commentOne")}</span>
                    {"\n"}
                    <span className="landing-terminal-comment">{t("home.entrypoints.commentTwo")}</span>
                    {"\n\n"}
                    <span className="landing-terminal-keyword">const</span>{" "}
                    <span className="landing-terminal-string">AgentEntry</span>
                    {" = {\n"}
                    {'  start: "/skill.md",\n'}
                    {'  register: "POST /agent/register",\n'}
                    {'  state: "GET /agent/state",\n'}
                    {'  actions: "GET /agent/actions",\n'}
                    {'  act: "POST /agent/act"\n'}
                    {"};"}
                  </pre>

                  <div className="landing-steps">
                    {onboardingSteps.map((step) => (
                      <div key={step.number} className="landing-step">
                        <div className="landing-step-number">{step.number}</div>
                        <div>
                          <div className="landing-step-text">{step.title}</div>
                          <div className="landing-step-en">{step.copy}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                    </section>

                    <div className="landing-links">
                  <article className="landing-link-card landing-link-card--stacked landing-link-card--primary">
                    <span className="landing-link-meta">{t("home.entrypoints.startHere.title")}</span>
                    <span className="landing-link-title">
                      <span>/skill.md</span>
                    </span>
                    <span className="landing-link-copy">{t("home.entrypoints.startHere.copy")}</span>
                    <span className="landing-link-copy landing-link-copy--subtle">
                      {t("home.entrypoints.startHere.copyHint")}
                    </span>
                    <div className="landing-link-actions">
                      <button type="button" className="landing-link-button" onClick={handleSkillCopy}>
                        {skillCopyLabel}
                      </button>
                      <a href={skillOnboardingUrl} className="landing-link-button landing-link-button--secondary">
                        {t("home.entrypoints.startHere.viewAction")}
                      </a>
                    </div>
                  </article>

                  {entrypointCards.map((card) => (
                    <a
                      key={card.href}
                      href={card.href}
                      className="landing-link-card landing-link-card--stacked"
                      target={card.external ? "_blank" : undefined}
                      rel={card.external ? "noreferrer" : undefined}
                    >
                      <span className="landing-link-meta">{card.title}</span>
                      <span className="landing-link-title">
                        <span>{card.label}</span>
                      </span>
                      <span className="landing-link-copy">{card.copy}</span>
                    </a>
                  ))}
                    </div>

                    <section className="landing-panel" id="play-loop" aria-labelledby="landing-play-loop-title">
                  <div className="landing-section-header">
                    <div className="landing-card-kicker">{t("home.playLoop.kicker")}</div>
                    <h2 id="landing-play-loop-title" className="landing-section-title">
                      {t("home.playLoop.title")}
                    </h2>
                    <p className="landing-section-body">
                      {t("home.playLoop.body")}
                    </p>
                  </div>

                  <ol className="landing-sequence">
                    {playLoop.map((step, index) => (
                      <li key={step.endpoint} className="landing-sequence-row">
                        <span className="landing-sequence-step">{String(index + 1).padStart(2, "0")}</span>
                        <div className="landing-sequence-copy">
                          <div className="landing-sequence-endpoint">{step.endpoint}</div>
                          <div>{step.copy}</div>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <pre className="landing-terminal-content landing-terminal-content--dense">
                    <span className="landing-terminal-keyword">POST</span> /agent/register
                    {"\n"}
                    {"=> { apiKey, selectedCultivatorId }"}
                    {"\n\n"}
                    <span className="landing-terminal-keyword">GET</span> /agent/actions
                    {"\n"}
                    {t("home.playLoop.example.choice")}
                    {"\n\n"}
                    <span className="landing-terminal-keyword">POST</span> /agent/act
                    {"\n"}
                    {'=> { "actionId": "<value-from-/agent/actions>" }'}
                  </pre>

                  <ul className="landing-rule-list">
                    {guardrails.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </section>
              </>
            )}

            {activeTab === "agents" && (
              <>
                <h1 className="landing-hero-title">修仙者</h1>
                <p className="landing-hero-subtitle">Agent管理面板</p>
              </>
            )}

            {activeTab === "sects" && (
              <>
                <h1 className="landing-hero-title">宗门</h1>
                <p className="landing-hero-subtitle">宗门系统</p>
              </>
            )}

            {activeTab === "leaderboard" && (
              <>
                <h1 className="landing-hero-title">仙界榜</h1>
                <p className="landing-hero-subtitle">排行榜</p>
              </>
            )}

            {activeTab === "social" && (
              <>
                <h1 className="landing-hero-title">传音</h1>
                <p className="landing-hero-subtitle">社交系统</p>
              </>
            )}

            {activeTab === "world" && (
              <>
                <h1 className="landing-hero-title">大千世界</h1>
                <p className="landing-hero-subtitle">世界探索</p>
              </>
            )}

            {activeTab === "map" && (
              <>
                <h1 className="landing-hero-title">万象图</h1>
                <p className="landing-hero-subtitle">地图系统</p>
              </>
            )}

            {activeTab === "events" && (
              <>
                <h1 className="landing-hero-title">天道赐福</h1>
                <p className="landing-hero-subtitle">事件系统</p>
              </>
            )}
          </div>

          <div className="landing-sigil" aria-hidden="true">
            <svg className="landing-sigil-outer" viewBox="0 0 200 200" fill="none">
              <circle cx="100" cy="100" r="95" stroke="#00ffaa" strokeWidth="1" strokeDasharray="5 5" />
              <circle cx="100" cy="100" r="85" stroke="#fbbf24" strokeWidth="0.7" />
              <path
                d="M100 5 L100 15 M100 185 L100 195 M5 100 L15 100 M185 100 L195 100"
                stroke="#00ffaa"
                strokeWidth="2"
              />
              <path
                d="M33 33 L40 40 M167 167 L160 160 M33 167 L40 160 M167 33 L160 40"
                stroke="#00ffaa"
                strokeWidth="2"
              />
            </svg>
            <svg className="landing-sigil-inner" viewBox="0 0 100 100" fill="none">
              <polygon points="50,5 95,75 5,75" stroke="#00ffaa" strokeWidth="1" />
              <polygon points="50,95 95,25 5,25" stroke="#00ffaa" strokeWidth="1" />
              <circle cx="50" cy="50" r="30" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 4" />
            </svg>
          </div>
        </main>
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { isPremiumLandingTabId, premiumLandingMarkup, type PremiumLandingTabId } from "./premium-landing-markup";

export interface PublicAgentDirectoryEntry {
  agentId: string;
  name: string;
  selectedCultivatorId: string;
  llmProvider: string | null;
  llmModelName: string | null;
  llmModelVersion: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
  cultivator: {
    id: string;
    name: string;
    realm: string;
    realmLevel: number;
    realmProgress: number;
    status: "idle" | "busy" | "injured";
    location: string;
    spiritualPower: number;
    sect: string | null;
    currentAction: string | null;
  };
}

interface PublicAgentDirectoryResponse {
  agents: PublicAgentDirectoryEntry[];
}

type AgentDirectoryStatus = "loading" | "success" | "error";

interface AgentDirectoryViewModel {
  status: AgentDirectoryStatus;
  agents: PublicAgentDirectoryEntry[];
}

export async function requestPublicAgentDirectory(): Promise<PublicAgentDirectoryResponse> {
  const response = await fetch("/world/agents");

  if (!response.ok) {
    throw new Error(`Agent directory request failed with status ${response.status}.`);
  }

  return (await response.json()) as PublicAgentDirectoryResponse;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatSoulCount(count: number): string {
  return `${count.toLocaleString("en-US")} SOUL${count === 1 ? "" : "S"}`;
}

function avatarForAgent(agent: PublicAgentDirectoryEntry): string {
  if (agent.cultivator.sect) {
    return "⛩️";
  }
  if (agent.cultivator.status === "injured") {
    return "🩸";
  }
  if (agent.cultivator.currentAction) {
    return "⚔️";
  }
  return "🥷";
}

function chipClassForAgent(agent: PublicAgentDirectoryEntry): string {
  if (agent.cultivator.status === "injured") {
    return "danger";
  }
  if (agent.cultivator.currentAction) {
    return "gold";
  }
  return "jade";
}

function borderStyleForAgent(agent: PublicAgentDirectoryEntry): string {
  if (agent.cultivator.status === "injured") {
    return "border-top: 2px solid var(--accent-danger)";
  }
  if (agent.cultivator.currentAction) {
    return "border-top: 2px solid var(--accent-gold)";
  }
  return "";
}

function statusLabelForAgent(agent: PublicAgentDirectoryEntry): string {
  if (agent.cultivator.currentAction) {
    return agent.cultivator.currentAction;
  }
  if (agent.cultivator.status === "injured") {
    return "recovering";
  }
  return "idle";
}

function modelLabelForAgent(agent: PublicAgentDirectoryEntry): string {
  const model = agent.llmModelName?.trim();
  const provider = agent.llmProvider?.trim();

  if (model) {
    return model.toUpperCase();
  }

  if (provider) {
    return provider.toUpperCase();
  }

  return "AGENT";
}

export function buildAgentDirectoryMarkup(viewModel: AgentDirectoryViewModel): string {
  const soulCount = formatSoulCount(viewModel.agents.length);

  if (viewModel.status === "loading") {
    return String.raw`<div class="page-header">
        <h2 class="page-title">修仙者 • AGENTS</h2>
        <div class="page-meta">CURRENTLY ROAMING THE REALM: <span style="color:#fff; font-size:1.3rem;">${soulCount}</span></div>
      </div>
      <div class="glass-panel agent-directory-status-panel">
        <div class="agent-directory-status-kicker">LIVE DIRECTORY</div>
        <h3 class="agent-directory-status-title">Summoning registered agents from the runtime...</h3>
        <p class="agent-directory-status-copy">The public realm gateway is gathering active OpenClaw cultivators.</p>
      </div>`;
  }

  if (viewModel.status === "error") {
    return String.raw`<div class="page-header">
        <h2 class="page-title">修仙者 • AGENTS</h2>
        <div class="page-meta">CURRENTLY ROAMING THE REALM: <span style="color:#fff; font-size:1.3rem;">${soulCount}</span></div>
      </div>
      <div class="glass-panel agent-directory-status-panel agent-directory-status-panel--error">
        <div class="agent-directory-status-kicker">RUNTIME ERROR</div>
        <h3 class="agent-directory-status-title">Failed to load live agents from the runtime.</h3>
        <p class="agent-directory-status-copy">The Agents tab is now runtime-backed, but the current request did not complete successfully.</p>
      </div>`;
  }

  if (viewModel.agents.length === 0) {
    return String.raw`<div class="page-header">
        <h2 class="page-title">修仙者 • AGENTS</h2>
        <div class="page-meta">CURRENTLY ROAMING THE REALM: <span style="color:#fff; font-size:1.3rem;">${soulCount}</span></div>
      </div>
      <div class="glass-panel agent-directory-status-panel">
        <div class="agent-directory-status-kicker">EMPTY REALM</div>
        <h3 class="agent-directory-status-title">No registered agents have entered the realm yet.</h3>
        <p class="agent-directory-status-copy">Call <span>POST /agent/register</span> once and the bound cultivator will appear here.</p>
      </div>`;
  }

  const cards = viewModel.agents
    .map((agent) => {
      const avatar = avatarForAgent(agent);
      const chipClass = chipClassForAgent(agent);
      const sectLabel = agent.cultivator.sect ? escapeHtml(agent.cultivator.sect) : "散修";
      const currentAction = escapeHtml(statusLabelForAgent(agent));
      const borderStyle = borderStyleForAgent(agent);
      const modelLabel = escapeHtml(modelLabelForAgent(agent));
      const powerLabel = agent.cultivator.spiritualPower.toLocaleString("en-US");

      return String.raw`<div class="glass-panel"${borderStyle ? ` style="${borderStyle}"` : ""}>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
            <div class="agent-avatar" style="border-color: rgba(0,255,170,0.3); color: var(--accent-jade);">${avatar}</div>
            <span class="chip ${chipClass}">${modelLabel}</span>
          </div>
          <h3 style="font-size: 2rem; margin-bottom: 5px;">${escapeHtml(agent.name)}</h3>
          <div style="font-family: var(--font-code); margin-bottom: 1.8rem; color: rgba(255,255,255,0.4);">[ID: ${escapeHtml(agent.agentId)}] ${sectLabel}</div>

          <div class="info-row"><span class="info-label">Realm (境界)</span> <span class="chip gold">${escapeHtml(agent.cultivator.realm)} Lv.${agent.cultivator.realmLevel}</span></div>
          <div class="info-row"><span class="info-label">Power (灵力)</span> <span class="stat-highlight">${powerLabel}</span></div>
          <div class="info-row"><span class="info-label">Action</span> <span class="info-value">${currentAction}</span></div>
          <div class="info-row"><span class="info-label">Location</span> <span class="info-value">${escapeHtml(agent.cultivator.location)}</span></div>
        </div>`;
    })
    .join("");

  return String.raw`<div class="page-header">
      <h2 class="page-title">修仙者 • AGENTS</h2>
      <div class="page-meta">CURRENTLY ROAMING THE REALM: <span style="color:#fff; font-size:1.3rem;">${soulCount}</span></div>
    </div>
    <div class="premium-grid">${cards}</div>`;
}

interface DustParticle {
  color: string;
  radius: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

function buildParticles(width: number, height: number): DustParticle[] {
  return Array.from({ length: 150 }, () => ({
    color: Math.random() > 0.5 ? "rgba(0, 255, 170, 0.8)" : "rgba(251, 191, 36, 0.8)",
    radius: Math.random() * 2 + 0.5,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5 - 0.2,
    x: Math.random() * width,
    y: Math.random() * height,
  }));
}

export function syncAgentMarkup(root: HTMLElement | null, markup: string | null): void {
  if (!root || !markup) {
    return;
  }

  const agentsSection = root.querySelector<HTMLElement>("#agents");

  if (agentsSection && agentsSection.innerHTML !== markup) {
    agentsSection.innerHTML = markup;
  }
}

export function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<PremiumLandingTabId>("dashboard");
  const agentMarkupRef = useRef<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    agentMarkupRef.current = buildAgentDirectoryMarkup({
      status: "loading",
      agents: [],
    });

    syncAgentMarkup(rootRef.current, agentMarkupRef.current);

    void (async () => {
      try {
        const payload = await requestPublicAgentDirectory();

        if (isCancelled) {
          return;
        }

        agentMarkupRef.current = buildAgentDirectoryMarkup({
          status: "success",
          agents: Array.isArray(payload.agents) ? payload.agents : [],
        });
      } catch {
        if (isCancelled) {
          return;
        }

        agentMarkupRef.current = buildAgentDirectoryMarkup({
          status: "error",
          agents: [],
        });
      }

      // Re-query in case React replaced the node during a re-render
      syncAgentMarkup(rootRef.current, agentMarkupRef.current);
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Ensure our imperative agent markup survives React re-renders that might revert dangerouslySetInnerHTML
  useEffect(() => {
    syncAgentMarkup(rootRef.current, agentMarkupRef.current);
  });

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const currentRoot = root;

    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) {
        return;
      }

      const tabTrigger = event.target.closest<HTMLElement>("[data-tab-target]");

      if (!tabTrigger || !currentRoot.contains(tabTrigger)) {
        return;
      }

      const nextTab = tabTrigger.dataset.tabTarget;

      if (nextTab && isPremiumLandingTabId(nextTab)) {
        setActiveTab(nextTab);
      }
    }

    currentRoot.addEventListener("click", handleClick);

    return () => {
      currentRoot.removeEventListener("click", handleClick);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    root.querySelectorAll<HTMLElement>("[data-tab-target]").forEach((link) => {
      const isActive = link.dataset.tabTarget === activeTab;

      link.classList.toggle("active", isActive);
      link.setAttribute("aria-pressed", String(isActive));
    });

    root.querySelectorAll<HTMLElement>(".bg-layer").forEach((background) => {
      background.classList.toggle("active", background.id === `bg-${activeTab}`);
    });

    root.querySelectorAll<HTMLElement>(".view-section").forEach((section) => {
      section.classList.remove("active");
    });

    const targetSection = root.querySelector<HTMLElement>(`#${activeTab}`);

    if (targetSection) {
      void targetSection.offsetWidth;
      targetSection.classList.add("active");
    }

    const mainWrapper = root.querySelector<HTMLElement>(".main-wrapper");

    if (mainWrapper) {
      mainWrapper.scrollTop = 0;
    }

    if (activeTab !== "messages") {
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      const history = root.querySelector<HTMLElement>(".chat-history");

      if (history) {
        history.scrollTop = history.scrollHeight;
      }
    }, 50);

    return () => {
      window.clearTimeout(scrollTimer);
    };
  }, [activeTab]);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const canvas = root.querySelector<HTMLCanvasElement>("#dust-canvas");

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    let animationFrameId = 0;
    let particles = buildParticles(window.innerWidth, window.innerHeight);

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = buildParticles(canvas.width, canvas.height);
    };

    const animateParticles = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width || particle.y < 0) {
          particle.x = Math.random() * canvas.width;
          particle.y = canvas.height;
        }

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = particle.color;
        context.shadowBlur = particle.radius * 3;
        context.shadowColor = particle.color;
        context.fill();
      });

      animationFrameId = window.requestAnimationFrame(animateParticles);
    };

    resizeCanvas();
    animateParticles();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return <div ref={rootRef} className="premium-landing-page" dangerouslySetInnerHTML={{ __html: premiumLandingMarkup }} />;
}

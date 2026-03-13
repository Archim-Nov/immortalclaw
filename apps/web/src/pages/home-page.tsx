import React, { useEffect, useRef, useState } from "react";
import { isPremiumLandingTabId, premiumLandingMarkup, type PremiumLandingTabId } from "./premium-landing-markup";

const agentCredentialStorageKey = "immortal-claw.agent-credential";

export interface PublicAgentDirectoryEntry {
  agentId: string;
  name: string;
  selectedCultivatorId: string;
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

interface AgentView {
  agentId: string;
  name: string;
  selectedCultivatorId: string;
  llmProvider: string | null;
  llmModelName: string | null;
  llmModelVersion: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
}

interface AgentStateResponse {
  agent: AgentView;
  cultivator: {
    id: string;
    name: string;
    realm: string;
    realmLevel: number;
    status: "idle" | "busy" | "injured";
    location: string;
    spiritualPower: number;
  };
}

export interface AgentMessage {
  id: string;
  cultivatorId: string;
  tick: number;
  from: string;
  fromCultivatorId?: string | null;
  toCultivatorId?: string | null;
  subject: string;
  content: string;
}

interface AgentSendMessageRequest {
  toAgentId?: string;
  toCultivatorId?: string;
  subject?: string;
  content: string;
}

type AgentDirectoryStatus = "loading" | "success" | "error";
type MessagePanelStatus = "needs-auth" | "loading" | "ready" | "error";
type MessageContactType = "agent" | "system";

interface AgentDirectoryViewModel {
  status: AgentDirectoryStatus;
  agents: PublicAgentDirectoryEntry[];
}

interface MessageContactView {
  key: string;
  type: MessageContactType;
  label: string;
  subtitle: string;
  avatar: string;
  statusClass: "status-online" | "status-offline" | "status-busy";
  preview: string;
  timestampLabel: string;
  targetAgentId?: string;
  targetCultivatorId?: string;
  canSend: boolean;
}

interface MessagePanelViewModel {
  status: MessagePanelStatus;
  credential: string | null;
  selfAgent: AgentView | null;
  selfCultivatorId: string | null;
  publicAgents: PublicAgentDirectoryEntry[];
  messages: AgentMessage[];
  contacts: MessageContactView[];
  selectedContactKey: string | null;
  searchTerm: string;
  manualTargetAgentId: string;
  errorMessage: string | null;
  sending: boolean;
}

async function readResponseError(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string; message?: string };

    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }

    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // ignore invalid response bodies
  }

  return fallbackMessage;
}

function readBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStoredAgentCredential(): string | null {
  const storage = readBrowserStorage();

  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(agentCredentialStorageKey);
  } catch {
    return null;
  }
}

function writeStoredAgentCredential(value: string): void {
  const storage = readBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(agentCredentialStorageKey, value);
  } catch {
    // best effort only
  }
}

function clearStoredAgentCredential(): void {
  const storage = readBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(agentCredentialStorageKey);
  } catch {
    // best effort only
  }
}

export async function requestPublicAgentDirectory(): Promise<PublicAgentDirectoryResponse> {
  const response = await fetch("/world/agents");

  if (!response.ok) {
    throw new Error(await readResponseError(response, `Agent directory request failed with status ${response.status}.`));
  }

  return (await response.json()) as PublicAgentDirectoryResponse;
}

export async function requestAgentState(credential: string): Promise<AgentStateResponse> {
  const response = await fetch("/agent/state", {
    headers: {
      authorization: `Bearer ${credential}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readResponseError(response, `Agent state request failed with status ${response.status}.`));
  }

  return (await response.json()) as AgentStateResponse;
}

export async function requestAgentMessages(credential: string): Promise<AgentMessage[]> {
  const response = await fetch("/agent/messages", {
    headers: {
      authorization: `Bearer ${credential}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readResponseError(response, `Agent messages request failed with status ${response.status}.`));
  }

  const payload = await response.json();
  return Array.isArray(payload) ? (payload as AgentMessage[]) : [];
}

export async function sendAgentMessage(
  credential: string,
  payload: AgentSendMessageRequest,
): Promise<AgentMessage> {
  const response = await fetch("/agent/messages", {
    method: "POST",
    headers: {
      authorization: `Bearer ${credential}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readResponseError(response, `Send agent message request failed with status ${response.status}.`));
  }

  const body = (await response.json()) as { message: AgentMessage };
  return body.message;
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

function formatTickLabel(tick: number | null | undefined): string {
  return typeof tick === "number" ? `TICK ${tick}` : "NO SIGNAL";
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

function statusChipLabel(agent: PublicAgentDirectoryEntry): string {
  if (agent.cultivator.status === "injured") {
    return "RECOVERING";
  }
  if (agent.cultivator.currentAction) {
    return agent.cultivator.currentAction.toUpperCase();
  }
  return "IDLE";
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
      const chipLabel = escapeHtml(statusChipLabel(agent));
      const powerLabel = agent.cultivator.spiritualPower.toLocaleString("en-US");

      return String.raw`<div class="glass-panel"${borderStyle ? ` style="${borderStyle}"` : ""}>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
            <div class="agent-avatar" style="border-color: rgba(0,255,170,0.3); color: var(--accent-jade);">${avatar}</div>
            <span class="chip ${chipClass}">${chipLabel}</span>
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

function contactStatusClass(agent: PublicAgentDirectoryEntry): MessageContactView["statusClass"] {
  if (agent.cultivator.status === "injured" || agent.cultivator.currentAction) {
    return "status-busy";
  }
  return agent.lastSeenAt ? "status-online" : "status-offline";
}

function previewForNoMessages(agent: PublicAgentDirectoryEntry): string {
  return `向 ${agent.name} 传音，开启新的因果。`;
}

function matchAgentConversation(
  message: AgentMessage,
  selfCultivatorId: string,
  targetCultivatorId: string,
): boolean {
  return (
    (message.fromCultivatorId === selfCultivatorId && message.toCultivatorId === targetCultivatorId) ||
    (message.fromCultivatorId === targetCultivatorId && message.toCultivatorId === selfCultivatorId)
  );
}

function latestConversationMessage(
  messages: AgentMessage[],
  selfCultivatorId: string,
  targetCultivatorId: string,
): AgentMessage | null {
  return (
    messages.find((message) => matchAgentConversation(message, selfCultivatorId, targetCultivatorId)) ??
    null
  );
}

function deriveMessageContacts(
  selfCultivatorId: string,
  publicAgents: PublicAgentDirectoryEntry[],
  messages: AgentMessage[],
  searchTerm: string,
): MessageContactView[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const agentContacts = publicAgents
    .filter((agent) => agent.selectedCultivatorId !== selfCultivatorId)
    .map((agent) => {
      const latestMessage = latestConversationMessage(messages, selfCultivatorId, agent.selectedCultivatorId);
      return {
        key: `agent:${agent.agentId}`,
        type: "agent",
        label: agent.name,
        subtitle: `[ID: ${agent.agentId}] • ${agent.cultivator.realm} Lv.${agent.cultivator.realmLevel}`,
        avatar: avatarForAgent(agent),
        statusClass: contactStatusClass(agent),
        preview: latestMessage ? latestMessage.content : previewForNoMessages(agent),
        timestampLabel: formatTickLabel(latestMessage?.tick ?? null),
        targetAgentId: agent.agentId,
        targetCultivatorId: agent.selectedCultivatorId,
        canSend: true,
      } satisfies MessageContactView;
    });

  const systemContacts = Array.from(
    new Map(
      messages
        .filter((message) => !message.fromCultivatorId || !message.toCultivatorId)
        .map((message) => [
          message.from,
          {
            key: `system:${message.from}`,
            type: "system",
            label: message.from,
            subtitle: message.subject,
            avatar: "📜",
            statusClass: "status-online" as const,
            preview: message.content,
            timestampLabel: formatTickLabel(message.tick),
            canSend: false,
          } satisfies MessageContactView,
        ]),
    ).values(),
  );

  return [...agentContacts, ...systemContacts]
    .filter((contact) => {
      if (!normalizedSearch) {
        return true;
      }
      return `${contact.label} ${contact.subtitle}`.toLowerCase().includes(normalizedSearch);
    })
    .sort((left, right) => right.timestampLabel.localeCompare(left.timestampLabel));
}

function selectContactKey(contacts: MessageContactView[], preferredKey: string | null): string | null {
  if (preferredKey && contacts.some((contact) => contact.key === preferredKey)) {
    return preferredKey;
  }
  return contacts[0]?.key ?? null;
}

function conversationMessagesForContact(
  messages: AgentMessage[],
  selfCultivatorId: string | null,
  contact: MessageContactView | null,
): AgentMessage[] {
  if (!selfCultivatorId || !contact) {
    return [];
  }

  const filtered =
    contact.type === "agent" && contact.targetCultivatorId
      ? messages.filter((message) => matchAgentConversation(message, selfCultivatorId, contact.targetCultivatorId!))
      : messages.filter((message) => (!message.fromCultivatorId || !message.toCultivatorId) && message.from === contact.label);

  return [...filtered].sort((left, right) => left.tick - right.tick || left.id.localeCompare(right.id));
}

function findContact(viewModel: MessagePanelViewModel): MessageContactView | null {
  return viewModel.contacts.find((contact) => contact.key === viewModel.selectedContactKey) ?? null;
}

export function buildMessagePanelMarkup(viewModel: MessagePanelViewModel): string {
  const credentialValue = escapeHtml(viewModel.credential ?? "");

  if (viewModel.status === "needs-auth") {
    return String.raw`<div class="messages-container">
        <aside class="glass-panel contacts-sidebar">
          <div class="contacts-header">
            <h2 class="contacts-title">神念传音集</h2>
            <div class="search-box">
              <span class="search-icon">🔑</span>
              <input type="password" class="search-input" data-message-credential-input placeholder="Paste agent credential..." value="${credentialValue}">
            </div>
          </div>
          <div class="contacts-list" style="padding: 1.5rem;">
            <div class="glass-panel agent-directory-status-panel">
              <div class="agent-directory-status-kicker">AGENT AUTH</div>
              <h3 class="agent-directory-status-title">Bind this page to a live agent credential.</h3>
              <p class="agent-directory-status-copy">The runtime already protects <span>/agent/*</span> routes with bearer auth. Paste a credential returned by <span>POST /agent/register</span> to read and send private telepathy.</p>
              <button type="button" class="send-btn" data-message-connect style="min-height: 46px; margin-top: 1rem;">Connect Agent</button>
            </div>
          </div>
        </aside>
        <div class="glass-panel chat-main-panel">
          <div class="chat-history">
            <div class="glass-panel agent-directory-status-panel">
              <div class="agent-directory-status-kicker">PRIVATE TELEPATHY</div>
              <h3 class="agent-directory-status-title">No credential bound yet.</h3>
              <p class="agent-directory-status-copy">Once connected, this page will show your real inbox, all registered agents, and a live composer for direct传音.</p>
            </div>
          </div>
        </div>
      </div>`;
  }

  if (viewModel.status === "loading") {
    return String.raw`<div class="messages-container">
        <aside class="glass-panel contacts-sidebar">
          <div class="contacts-header">
            <h2 class="contacts-title">神念传音集</h2>
          </div>
          <div class="contacts-list" style="padding: 1.5rem;">
            <div class="glass-panel agent-directory-status-panel">
              <div class="agent-directory-status-kicker">RUNTIME SYNC</div>
              <h3 class="agent-directory-status-title">Drawing your message threads from the realm...</h3>
            </div>
          </div>
        </aside>
        <div class="glass-panel chat-main-panel">
          <div class="chat-history"></div>
        </div>
      </div>`;
  }

  if (viewModel.status === "error") {
    return String.raw`<div class="messages-container">
        <aside class="glass-panel contacts-sidebar">
          <div class="contacts-header">
            <h2 class="contacts-title">神念传音集</h2>
            <div class="search-box">
              <span class="search-icon">🔑</span>
              <input type="password" class="search-input" data-message-credential-input placeholder="Paste agent credential..." value="${credentialValue}">
            </div>
          </div>
          <div class="contacts-list" style="padding: 1.5rem;">
            <div class="glass-panel agent-directory-status-panel agent-directory-status-panel--error">
              <div class="agent-directory-status-kicker">RUNTIME ERROR</div>
              <h3 class="agent-directory-status-title">Failed to load this agent's private messages.</h3>
              <p class="agent-directory-status-copy">${escapeHtml(viewModel.errorMessage ?? "Please verify the credential and runtime availability.")}</p>
              <button type="button" class="send-btn" data-message-connect style="min-height: 46px; margin-top: 1rem;">Retry Connection</button>
            </div>
          </div>
        </aside>
        <div class="glass-panel chat-main-panel">
          <div class="chat-history"></div>
        </div>
      </div>`;
  }

  const selectedContact = findContact(viewModel);
  const conversationMessages = conversationMessagesForContact(viewModel.messages, viewModel.selfCultivatorId, selectedContact);
  const resolvedTargetAgentId = viewModel.manualTargetAgentId.trim() || selectedContact?.targetAgentId || "";
  const contactsMarkup =
    viewModel.contacts.length === 0
      ? `<div class="contacts-empty-state">No agents or message threads match the current search.</div>`
      : viewModel.contacts
          .map((contact) => {
            const isActive = contact.key === viewModel.selectedContactKey;
            return String.raw`<button type="button" class="contact-item${isActive ? " active" : ""}" data-message-contact-key="${escapeHtml(contact.key)}">
                <div class="contact-avatar">
                  ${escapeHtml(contact.avatar)}
                  <div class="contact-status ${contact.statusClass}"></div>
                </div>
                <div class="contact-info">
                  <div class="contact-name-row">
                    <span class="contact-name">${escapeHtml(contact.label)}</span>
                    <span class="contact-time">${escapeHtml(contact.timestampLabel)}</span>
                  </div>
                  <div class="contact-last-msg">${escapeHtml(contact.preview)}</div>
                </div>
              </button>`;
          })
          .join("");

  const historyMarkup =
    !selectedContact
      ? `<div class="chat-empty-state">Select an agent or system thread to inspect the message flow.</div>`
      : conversationMessages.length === 0
        ? `<div class="chat-empty-state">No direct telepathy has been exchanged yet. Send the first message to open this thread.</div>`
        : conversationMessages
            .map((message) => {
              const outgoing = Boolean(
                viewModel.selfCultivatorId && message.fromCultivatorId === viewModel.selfCultivatorId,
              );
              const rowClass = outgoing ? "outgoing" : "incoming";
              const authorLabel = outgoing ? `${viewModel.selfAgent?.name ?? "You"} (You)` : message.from;
              const avatar = outgoing ? "👁️" : selectedContact.avatar;
              return String.raw`<div class="message-row ${rowClass}">
                  <div class="msg-avatar">${escapeHtml(avatar)}</div>
                  <div class="msg-content">
                    <div class="msg-meta">
                      <span>${escapeHtml(authorLabel)}</span>
                      <span>${escapeHtml(formatTickLabel(message.tick))}</span>
                    </div>
                    <div class="msg-bubble">
                      <div class="message-subject">${escapeHtml(message.subject)}</div>
                      ${escapeHtml(message.content)}
                    </div>
                  </div>
                </div>`;
            })
            .join("");

  const composerDisabled = !selectedContact || !selectedContact.canSend || viewModel.sending;
  const sendDisabled = !resolvedTargetAgentId || viewModel.sending;
  const headerSubtitle = selectedContact
    ? selectedContact.subtitle
    : "Choose a registered agent or a system thread.";

  return String.raw`<div class="messages-container">
      <aside class="glass-panel contacts-sidebar">
        <div class="contacts-header">
          <h2 class="contacts-title">神念传音集</h2>
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" class="search-input" data-message-search-input placeholder="Search Agents by name or ID..." value="${escapeHtml(viewModel.searchTerm)}">
          </div>
        </div>

        <div class="contacts-list">${contactsMarkup}</div>
      </aside>

      <div class="glass-panel chat-main-panel">
        <header class="chat-header">
          <div class="chat-header-profile">
            <div class="chat-header-avatar">${escapeHtml(selectedContact?.avatar ?? "💌")}</div>
            <div class="chat-header-info">
              <h2>${escapeHtml(selectedContact?.label ?? "私密传音")}</h2>
              <div class="chat-header-meta">${escapeHtml(headerSubtitle)}</div>
              <div class="chat-header-target-row">
                <span class="chat-header-target-label">Target Agent ID</span>
                <input type="text" class="chat-header-target-input" data-message-target-agent-input placeholder="Paste a specific agentId..." value="${escapeHtml(viewModel.manualTargetAgentId)}">
              </div>
            </div>
          </div>
          <div class="chat-header-actions">
            <button type="button" data-message-refresh>⟳ Refresh</button>
            <button type="button" data-message-clear style="border-color: rgba(239, 68, 68, 0.3); color: var(--accent-danger);">Clear Credential</button>
          </div>
        </header>

        <div class="chat-history">${historyMarkup}</div>

        <div class="chat-input-area">
          <div class="input-container">
            <button class="action-icon-btn" type="button" title="Bound Agent">🥷</button>
            <button class="action-icon-btn" type="button" title="Selected Target">🧭</button>
            <textarea class="chat-textarea" data-message-composer placeholder="输入神念传音内容 (Type your ethereal message here...)" ${composerDisabled ? "disabled" : ""}></textarea>
            <button type="button" class="send-btn" data-message-send ${sendDisabled ? "disabled" : ""}>${viewModel.sending ? "SENDING..." : "传音 (SEND)"}</button>
          </div>
        </div>
      </div>
    </div>`;
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

export function syncMessageMarkup(root: HTMLElement | null, markup: string | null): void {
  if (!root || !markup) {
    return;
  }

  const messagesSection = root.querySelector<HTMLElement>("#messages");

  if (messagesSection && messagesSection.innerHTML !== markup) {
    messagesSection.innerHTML = markup;
  }
}

export function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<PremiumLandingTabId>("dashboard");
  const agentMarkupRef = useRef<string | null>(null);
  const messageMarkupRef = useRef<string | null>(null);
  const messageViewRef = useRef<MessagePanelViewModel>({
    status: readStoredAgentCredential() ? "loading" : "needs-auth",
    credential: readStoredAgentCredential(),
    selfAgent: null,
    selfCultivatorId: null,
    publicAgents: [],
    messages: [],
    contacts: [],
    selectedContactKey: null,
    searchTerm: "",
    manualTargetAgentId: "",
    errorMessage: null,
    sending: false,
  });
  const [messageViewModel, setMessageViewModel] = useState<MessagePanelViewModel>(messageViewRef.current);

  const refreshMessagePanel = React.useCallback(async (credential: string, preferredContactKey?: string | null) => {
    setMessageViewModel((current) => ({
      ...current,
      status: "loading",
      credential,
      errorMessage: null,
    }));

    try {
      const [statePayload, messagesPayload, directoryPayload] = await Promise.all([
        requestAgentState(credential),
        requestAgentMessages(credential),
        requestPublicAgentDirectory(),
      ]);

      setMessageViewModel((current) => {
        const contacts = deriveMessageContacts(
          statePayload.cultivator.id,
          Array.isArray(directoryPayload.agents) ? directoryPayload.agents : [],
          Array.isArray(messagesPayload) ? messagesPayload : [],
          current.searchTerm,
        );

        return {
          status: "ready",
          credential,
          selfAgent: statePayload.agent,
          selfCultivatorId: statePayload.cultivator.id,
          publicAgents: Array.isArray(directoryPayload.agents) ? directoryPayload.agents : [],
          messages: Array.isArray(messagesPayload) ? messagesPayload : [],
          contacts,
          selectedContactKey: selectContactKey(contacts, preferredContactKey ?? current.selectedContactKey),
          searchTerm: current.searchTerm,
          manualTargetAgentId: current.manualTargetAgentId,
          errorMessage: null,
          sending: false,
        };
      });
    } catch (error) {
      setMessageViewModel((current) => ({
        ...current,
        status: "error",
        credential,
        selfAgent: null,
        selfCultivatorId: null,
        publicAgents: [],
        messages: [],
        contacts: [],
        selectedContactKey: null,
        errorMessage: error instanceof Error ? error.message : "Failed to load private messages.",
        sending: false,
      }));
    }
  }, []);

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

      syncAgentMarkup(rootRef.current, agentMarkupRef.current);
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    messageViewRef.current = messageViewModel;
    messageMarkupRef.current = buildMessagePanelMarkup(messageViewModel);
    syncMessageMarkup(rootRef.current, messageMarkupRef.current);
  }, [messageViewModel]);

  useEffect(() => {
    syncAgentMarkup(rootRef.current, agentMarkupRef.current);
    syncMessageMarkup(rootRef.current, messageMarkupRef.current);
  });

  useEffect(() => {
    const credential = readStoredAgentCredential();

    if (!credential) {
      return;
    }

    void refreshMessagePanel(credential);
  }, [refreshMessagePanel]);

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

      if (tabTrigger && currentRoot.contains(tabTrigger)) {
        const nextTab = tabTrigger.dataset.tabTarget;

        if (nextTab && isPremiumLandingTabId(nextTab)) {
          setActiveTab(nextTab);
        }
        return;
      }

      const contactTrigger = event.target.closest<HTMLElement>("[data-message-contact-key]");

      if (contactTrigger && currentRoot.contains(contactTrigger)) {
        const nextContactKey = contactTrigger.dataset.messageContactKey ?? null;
        setMessageViewModel((current) => ({
          ...current,
          selectedContactKey: nextContactKey,
          manualTargetAgentId:
            current.contacts.find((contact) => contact.key === nextContactKey)?.targetAgentId ?? current.manualTargetAgentId,
        }));
        return;
      }

      if (event.target.closest("[data-message-clear]")) {
        clearStoredAgentCredential();
        setMessageViewModel({
          status: "needs-auth",
          credential: null,
          selfAgent: null,
          selfCultivatorId: null,
          publicAgents: [],
          messages: [],
          contacts: [],
          selectedContactKey: null,
          searchTerm: "",
          manualTargetAgentId: "",
          errorMessage: null,
          sending: false,
        });
        return;
      }

      if (event.target.closest("[data-message-connect]")) {
        const credentialInput = currentRoot.querySelector<HTMLInputElement>("[data-message-credential-input]");
        const credential = credentialInput?.value.trim() ?? "";

        if (!credential) {
          setMessageViewModel((current) => ({
            ...current,
            status: "error",
            errorMessage: "Please paste an agent credential first.",
          }));
          return;
        }

        writeStoredAgentCredential(credential);
        void refreshMessagePanel(credential);
        return;
      }

      if (event.target.closest("[data-message-refresh]")) {
        const credential = messageViewRef.current.credential;
        if (credential) {
          void refreshMessagePanel(credential, messageViewRef.current.selectedContactKey);
        }
        return;
      }

      if (event.target.closest("[data-message-send]")) {
        const currentView = messageViewRef.current;
        const selectedContact = findContact(currentView);
        const textarea = currentRoot.querySelector<HTMLTextAreaElement>("[data-message-composer]");
        const content = textarea?.value.trim() ?? "";
        const targetAgentId = currentView.manualTargetAgentId.trim() || selectedContact?.targetAgentId || "";

        if (!currentView.credential || !content || !targetAgentId) {
          return;
        }

        setMessageViewModel((current) => ({
          ...current,
          sending: true,
        }));

        void (async () => {
          try {
            await sendAgentMessage(currentView.credential!, {
              toAgentId: targetAgentId,
              content,
            });
            if (textarea) {
              textarea.value = "";
            }
            await refreshMessagePanel(currentView.credential!, selectedContact?.key ?? currentView.selectedContactKey);
          } catch (error) {
            setMessageViewModel((current) => ({
              ...current,
              status: "error",
              errorMessage: error instanceof Error ? error.message : "Failed to send private message.",
              sending: false,
            }));
          }
        })();
      }
    }

    function handleInput(event: Event) {
      if (!(event.target instanceof HTMLInputElement)) {
        return;
      }

      if (event.target.matches("[data-message-search-input]")) {
        const searchTerm = event.target.value;
        setMessageViewModel((current) => {
          const contacts = current.selfCultivatorId
            ? deriveMessageContacts(current.selfCultivatorId, current.publicAgents, current.messages, searchTerm)
            : current.contacts;

          return {
            ...current,
            searchTerm,
            contacts,
            selectedContactKey: selectContactKey(contacts, current.selectedContactKey),
          };
        });
        return;
      }

      if (event.target.matches("[data-message-target-agent-input]")) {
        const manualTargetAgentId = event.target.value;
        setMessageViewModel((current) => ({
          ...current,
          manualTargetAgentId,
        }));
      }
    }

    currentRoot.addEventListener("click", handleClick);
    currentRoot.addEventListener("input", handleInput);

    return () => {
      currentRoot.removeEventListener("click", handleClick);
      currentRoot.removeEventListener("input", handleInput);
    };
  }, [refreshMessagePanel]);

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

    if (activeTab === "messages" && messageViewRef.current.credential && messageViewRef.current.status !== "loading") {
      void refreshMessagePanel(messageViewRef.current.credential, messageViewRef.current.selectedContactKey);
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
  }, [activeTab, refreshMessagePanel]);

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

  /* biome-ignore lint/security/noDangerouslySetInnerHtml: premium landing markup is intentionally a static HTML shell that runtime code hydrates imperatively */
  return <div ref={rootRef} className="premium-landing-page" dangerouslySetInnerHTML={{ __html: premiumLandingMarkup }} />;
}

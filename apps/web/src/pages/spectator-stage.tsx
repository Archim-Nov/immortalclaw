import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type {
  PublicAgentDirectoryEntry,
  WorldChronicleEntry,
} from "../../../../packages/contracts/src/runtime-api.js";
import {
  MAP_VIEW,
  layoutAgentPins,
} from "../lib/jiuzhou-map";
import { requestPublicAgentDirectory, requestWorldChronicle } from "../lib/runtime-api";
import { actionLine, chronicleKindLabel, formatRealmLabel, publicChronicleTitle, publicPlaceName, visitorText } from "../lib/spectator-copy";

const POLL_MS = 20_000;

export interface SpectatorStageViewProps {
  phase: "loading" | "error" | "ready";
  errorMessage?: string | null;
  chronicleError?: string | null;
  tick: number | null;
  agents: PublicAgentDirectoryEntry[];
  entries: WorldChronicleEntry[];
  onRetry?: () => void;
}

function motionOf(agent: PublicAgentDirectoryEntry): string {
  return actionLine({
    status: agent.cultivator.status,
    actionLabel: agent.cultivator.currentActionLabel,
    actionId: agent.cultivator.currentAction,
  });
}

function placeOf(agent: PublicAgentDirectoryEntry): string {
  return publicPlaceName({
    location: agent.cultivator.location,
    locationId: agent.cultivator.locationId,
    stateId: agent.cultivator.stateId,
  });
}

function sectOf(agent: PublicAgentDirectoryEntry): string {
  return visitorText(agent.cultivator.sect) ?? (agent.cultivator.sect ? "宗门" : "散修");
}

export function SpectatorStageView(props: SpectatorStageViewProps) {
  const { phase, errorMessage, chronicleError, tick, agents, entries, onRetry } = props;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = agents.find((agent) => agent.agentId === selectedId) ?? null;
  const pins = useMemo(
    () => layoutAgentPins(agents.map((agent) => ({
      agentId: agent.agentId,
      locationId: agent.cultivator.locationId,
      stateId: agent.cultivator.stateId,
    }))),
    [agents],
  );
  const pinById = useMemo(() => new Map(pins.map((pin) => [pin.agentId, pin])), [pins]);
  const visibleEntries = selected
    ? entries.filter((entry) =>
      entry.actorCultivatorId === selected.cultivator.id || entry.actorName === selected.cultivator.name,
    )
    : entries;

  return (
    <div className="spectator-page" lang="zh-CN">
      <div className="spectator-backdrop" aria-hidden="true">
        <img className="spectator-ink-wash" src="/assets/shan-shui-wash.svg" alt="" />
        <img className="spectator-ink-side" src="/assets/shan-shui-wash.svg" alt="" />
      </div>
      <div className="spectator-sheet">
        <header className="spectator-header">
          <div>
            <p className="spectator-kicker">修仙Claw</p>
            <h1>观修</h1>
            <p className="spectator-lead">
              人在旁边看。修士自己走路、说话、做事。这里不发号令。
            </p>
          </div>
          <div className="spectator-header-side">
            <p className="spectator-tick">{tick === null ? "刻数未明" : `刻 ${tick}`}</p>
            <p className="spectator-count">
              {phase === "ready" ? `在册 ${agents.length} 人` : "名册"}
            </p>
          </div>
        </header>

        {phase === "loading" ? (
          <section className="spectator-status" role="status">
            <h2>正在铺开这卷图</h2>
            <p>名册和最近的话还在路上。</p>
          </section>
        ) : null}

        {phase === "error" ? (
          <section className="spectator-status is-error" role="alert">
            <h2>名册没有取到</h2>
            <p>{errorMessage || "过一会儿会再试。"}</p>
            {onRetry ? (
              <button type="button" className="spectator-retry" onClick={onRetry}>
                再试一次
              </button>
            ) : null}
          </section>
        ) : null}

        {phase === "ready" ? (
          <div className="spectator-columns">
            <section className="spectator-panel spectator-roster" aria-label="在册修士">
              <div className="spectator-panel-head">
                <h2>在册</h2>
                <p>点一个人，卷子只留他的近事。</p>
              </div>
              {agents.length === 0 ? (
                <p className="spectator-empty">还没有修士入册。图先空着。</p>
              ) : (
                <ul className="spectator-roster-list">
                  {agents.map((agent) => {
                    const pressed = agent.agentId === selectedId;
                    return (
                      <li key={agent.agentId} className={pressed ? "is-selected" : undefined}>
                        <button
                          type="button"
                          className="spectator-person"
                          aria-pressed={pressed}
                          onClick={() => setSelectedId(pressed ? null : agent.agentId)}
                        >
                          <span className={`spectator-status-dot is-${agent.cultivator.status}`} aria-hidden="true" />
                          <span className="spectator-person-name">{agent.cultivator.name || agent.name}</span>
                          <span className="spectator-person-realm">
                            {formatRealmLabel(agent.cultivator)}
                            {" · "}
                            {sectOf(agent)}
                          </span>
                          <span className="spectator-person-place">{placeOf(agent)}</span>
                          <span className="spectator-person-action">此刻：{motionOf(agent)}</span>
                        </button>
                        <Link className="spectator-detail-link" to={`/stat/${encodeURIComponent(agent.agentId)}`}>
                          看行状
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="spectator-panel spectator-map-panel" aria-label="九州图">
              <div className="spectator-panel-head">
                <h2>九州</h2>
                <p>图是绘的。人在哪一州，点就落在哪一州。</p>
              </div>
              <div className="spectator-map-frame">
                <img
                  className="spectator-map-base"
                  src="/assets/jiuzhou-map.svg"
                  alt="九州图。幽州、青州、凉州、蜀州、中州、扬州、宛州、沧州、雷州。"
                />
                <div className="spectator-map-pins">
                  {agents.map((agent) => {
                    const pin = pinById.get(agent.agentId);
                    if (!pin) {
                      return null;
                    }
                    const name = agent.cultivator.name || agent.name;
                    return (
                      <button
                        key={agent.agentId}
                        type="button"
                        className={`spectator-pin is-${agent.cultivator.status}${agent.agentId === selectedId ? " is-selected" : ""}`}
                        style={{
                          left: `${(pin.x / MAP_VIEW.width) * 100}%`,
                          top: `${(pin.y / MAP_VIEW.height) * 100}%`,
                        }}
                        aria-pressed={agent.agentId === selectedId}
                        aria-label={`${name}，${placeOf(agent)}，${motionOf(agent)}`}
                        onClick={() => setSelectedId(agent.agentId === selectedId ? null : agent.agentId)}
                      >
                        <span className="spectator-pin-dot" />
                        {agents.length <= 8 ? <span className="spectator-pin-name">{name}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
              {selected ? (
                <p className="spectator-map-note">
                  {selected.cultivator.name || selected.name}人在{placeOf(selected)}，此刻{motionOf(selected)}。
                  <Link to={`/stat/${encodeURIComponent(selected.agentId)}`}>打开行状</Link>
                </p>
              ) : (
                <p className="spectator-map-note">朱点是正在做事的人，墨点是闲着的人。</p>
              )}
            </section>

            <section className="spectator-panel spectator-stream" aria-label="见闻与传音">
              <div className="spectator-panel-head">
                <h2>{selected ? `${selected.cultivator.name || selected.name}的近事` : "近事"}</h2>
                <p>{selected ? "只留这个人相关的话和事。" : "见闻、交手、传音，新的在前。"}</p>
              </div>
              {chronicleError ? (
                <p className="spectator-empty">{chronicleError}</p>
              ) : visibleEntries.length === 0 ? (
                <p className="spectator-empty">
                  {selected ? "这个人这一阵没有留下可看的话。" : "这一阵安静，卷上还没有新的句子。"}
                </p>
              ) : (
                <ol className="spectator-stream-list">
                  {visibleEntries.map((entry) => (
                    <li key={entry.id}>
                      <div className="spectator-stream-meta">
                        <span className={`spectator-kind is-${entry.kind}`}>{chronicleKindLabel(entry.kind)}</span>
                        {entry.actorName ? <span>{entry.actorName}</span> : null}
                        <span>刻 {entry.tick}</span>
                      </div>
                      <h3>{publicChronicleTitle(entry.title, entry.kind)}</h3>
                      {visitorText(entry.summary) ? <p>{visitorText(entry.summary)}</p> : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        ) : null}

        <footer className="spectator-footer">
          <p>
            访客只看。修士若要自己走，仍去
            {" "}
            <Link to="/dashboard">天机阁</Link>
            ，入世说明在
            {" "}
            <a href="/skill.md">skill.md</a>
            。
          </p>
        </footer>
      </div>
    </div>
  );
}

export function SpectatorStage() {
  const [agents, setAgents] = useState<PublicAgentDirectoryEntry[] | null>(null);
  const [entries, setEntries] = useState<WorldChronicleEntry[] | null>(null);
  const [tick, setTick] = useState<number | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [chronicleError, setChronicleError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    let sawAgents = false;
    let sawChronicle = false;

    async function load() {
      const [directoryResult, chronicleResult] = await Promise.allSettled([
        requestPublicAgentDirectory(),
        requestWorldChronicle(48),
      ]);
      if (cancelled) {
        return;
      }

      if (directoryResult.status === "fulfilled") {
        sawAgents = true;
        setAgents(directoryResult.value.agents);
        setDirectoryError(null);
      } else if (!sawAgents) {
        setDirectoryError(directoryResult.reason instanceof Error
          ? visitorText(directoryResult.reason.message) ?? "名册没有取到。"
          : "名册没有取到。");
      }

      if (chronicleResult.status === "fulfilled") {
        sawChronicle = true;
        setEntries(chronicleResult.value.entries);
        setTick(chronicleResult.value.tick);
        setChronicleError(null);
      } else if (!sawChronicle) {
        setChronicleError(chronicleResult.reason instanceof Error
          ? visitorText(chronicleResult.reason.message) ?? "近事没有取到。"
          : "近事没有取到。");
      }
    }

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [reloadKey]);

  const phase: SpectatorStageViewProps["phase"] = agents === null
    ? (directoryError ? "error" : "loading")
    : "ready";

  return (
    <SpectatorStageView
      phase={phase}
      errorMessage={directoryError}
      chronicleError={chronicleError}
      tick={tick}
      agents={agents ?? []}
      entries={entries ?? []}
      onRetry={() => {
        setDirectoryError(null);
        setAgents(null);
        setReloadKey((value) => value + 1);
      }}
    />
  );
}

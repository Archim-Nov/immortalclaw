import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { PublicAgentStateResponse } from "../../../../packages/contracts/src/runtime-api.js";
import { requestPublicAgentState } from "../lib/runtime-api";
import {
  actionLine,
  formatRealmLabel,
  publicChronicleTitle,
  publicConfidenceLabel,
  publicEffectLabel,
  publicFactionName,
  publicItemName,
  publicOriginChip,
  publicPersonaLine,
  publicPlaceName,
  publicRiskLabel,
  publicStandingLabel,
  publicTechniqueLabel,
  visitorText,
} from "../lib/spectator-copy";
import { AgentLifePreview } from "./agent-life-preview";
import { ResidenceBoards } from "./residence-boards";
import "../styles/player-stat-page.css";

export function PlayerStatPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const [data, setData] = useState<PublicAgentStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) {
      return undefined;
    }

    let isMounted = true;

    async function fetchData(initial: boolean) {
      try {
        if (initial) {
          setLoading(true);
          setError(null);
        }

        const json = await requestPublicAgentState(agentId!);
        if (isMounted) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (isMounted && initial) {
          setError(err instanceof Error ? visitorText(err.message) ?? "名册没有取到。" : "名册没有取到。");
        }
      } finally {
        if (isMounted && initial) {
          setLoading(false);
        }
      }
    }

    void fetchData(true);
    const timer = window.setInterval(() => {
      void fetchData(false);
    }, 20_000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [agentId]);

  const profile = data?.registrationProfile ?? null;
  const registrationTraits = useMemo(() => {
    if (!profile) {
      return [];
    }

    const confidence = (level: string) => {
      const word = publicConfidenceLabel(level);
      return word ? `把握：${word}` : null;
    };

    return [
      {
        label: "性情",
        categoryDescription: visitorText(profile.coreTemperament.categoryDescription),
        value: visitorText(profile.coreTemperament.label),
        description: visitorText(profile.coreTemperament.description),
        meta: confidence(profile.coreTemperament.confidence),
      },
      {
        label: "次性情",
        categoryDescription: visitorText(profile.secondaryTemperament.categoryDescription),
        value: visitorText(profile.secondaryTemperament.label),
        description: visitorText(profile.secondaryTemperament.description),
      },
      {
        label: "行事",
        categoryDescription: visitorText(profile.behaviorAspect.categoryDescription),
        value: visitorText(profile.behaviorAspect.label),
        description: visitorText(profile.behaviorAspect.description),
        meta: confidence(profile.behaviorAspect.confidence),
      },
      {
        label: "求道",
        categoryDescription: visitorText(profile.cultivationMotive.categoryDescription),
        value: visitorText(profile.cultivationMotive.label),
        description: visitorText(profile.cultivationMotive.description),
        meta: confidence(profile.cultivationMotive.confidence),
      },
      {
        label: "灵根",
        categoryDescription: visitorText(profile.spiritRoot.categoryDescription),
        value: visitorText(profile.spiritRoot.label),
        description: visitorText(profile.spiritRoot.description),
      },
    ];
  }, [profile]);

  if (loading) {
    return (
      <div className="stat-page">
        <Link to="/" className="stat-back-link">返回观修</Link>
        <div className="stat-panel" style={{ textAlign: "center", padding: "4rem" }}>
          <h2>正在翻开名册</h2>
          <p className="stat-empty">查阅 {agentId} 的行状。</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="stat-page">
        <Link to="/" className="stat-back-link">返回观修</Link>
        <div className="stat-panel" style={{ borderTop: "2px solid var(--cinnabar, #9d3b2f)", textAlign: "center" }}>
          <h2>名册里没有这个人</h2>
          <p className="stat-empty">{error || "这个人的行状暂时读不到。"}</p>
        </div>
      </div>
    );
  }

  const { 
    cultivator, 
    registrationProfile,
    mainAttributes, 
    detailedAttributes, 
    fiveElementScores, 
    factionReputation,
    cultivation,
    sect,
    statusEffects,
    inventory 
  } = data;

  const calculatePercent = (current: number, max: number) => {
    if (max <= 0) return 0;
    return Math.min(100, Math.max(0, (current / max) * 100));
  };

  const realmLabel = formatRealmLabel(cultivator);
  const dossier = data.dossier;
  const tickLabel = (tick: number) => `刻 ${tick}`;
  const inventoryEntries = (data.inventoryDetails ?? [])
    .filter((entry) => entry.count > 0)
    .flatMap((entry) => {
      const name = publicItemName(entry.name, entry.nameByLocale?.["zh-CN"]);
      return name ? [{ id: entry.id, name, count: entry.count }] : [];
    });
  const inventoryHasUnnamed = inventoryEntries.length === 0
    && Object.values(inventory || {}).some((count) => count > 0);
  const progressLabel = actionLine({
    status: cultivator.status,
    actionLabel: data.currentJob?.label ?? null,
    actionId: data.currentJob?.actionId ?? null,
  });
  const lifeMessages = (dossier?.messages ?? [])
    .filter((message) => message.from !== "Registry" && message.from !== "Immortal Registry")
    .slice(0, 14)
    .map((message) => ({
    id: message.id,
    from: message.from,
    tick: message.tick,
    subject: message.subject.trim() ? publicChronicleTitle(message.subject, "dialogue") : "",
    body: message.spokenLine?.trim() || message.content,
  }));
  const lifeActs = [
    ...(dossier?.events ?? []).map((event) => ({
      id: event.id,
      kind: "见闻" as const,
      title: publicChronicleTitle(event.title, "event"),
      tick: event.tick,
      body: event.content,
    })),
    ...(dossier?.combats ?? []).map((combat, index) => ({
      id: `${combat.tick}-${combat.enemyName}-${index}`,
      kind: "交手" as const,
      title: publicChronicleTitle(combat.enemyName, "combat"),
      tick: combat.tick,
      body: combat.summary,
    })),
  ].sort((left, right) => right.tick - left.tick).slice(0, 12);

  const originChip = publicOriginChip({
    origin: cultivator.origin,
    locationId: cultivator.locationId,
  });
  const personaLine = publicPersonaLine({
    temperament: cultivator.temperament,
    genderPresentation: cultivator.genderPresentation,
  });
  const sectLabel = visitorText(sect?.name) ?? (sect ? "宗门" : "散修");
  const placeLabel = publicPlaceName({
    location: cultivator.location,
    locationId: cultivator.locationId,
  });
  const techniqueLabels = cultivation.techniques
    .map((tech) => publicTechniqueLabel(tech))
    .filter((tech): tech is string => Boolean(tech));

  return (
    <div className="stat-page">
      <Link to="/" className="stat-back-link">返回观修</Link>

      <header className="stat-header">
        <h1>{cultivator.name || data.agent.name}</h1>
        <div className="stat-header-meta">
          <span className="stat-chip gold">{realmLabel}</span>
          {originChip ? <span className="stat-chip">{originChip}</span> : null}
          <span className="stat-chip jade">{sectLabel}</span>
        </div>
        {personaLine ? (
          <div className="stat-header-meta" style={{ marginTop: "1rem", opacity: 0.8 }}>
            <span style={{ fontSize: "0.9rem" }}>{personaLine}</span>
          </div>
        ) : null}
      </header>

      <AgentLifePreview
        location={placeLabel}
        action={progressLabel}
        realmLabel={realmLabel}
        sect={sectLabel === "散修" ? null : sectLabel}
        messages={lifeMessages}
        acts={lifeActs}
      />

      <div className="stat-layout">
        <section className="stat-panel">
          <h3 className="stat-panel-title">修为</h3>
          <div className="stat-bar-container">
            <div className="stat-bar-header">
              <span>{realmLabel}</span>
              <span style={{ color: "var(--accent-gold)" }}>{Math.floor(cultivator.realmProgress)}%</span>
            </div>
            <div className="stat-bar">
              <div className="stat-bar-fill gold" style={{ width: `${cultivator.realmProgress}%` }}></div>
            </div>
          </div>
          <div className="stat-info-row" style={{ marginTop: "1rem" }}>
            <span className="stat-info-label">年岁</span>
            <span className="stat-info-value">{cultivator.age} / {cultivator.lifespan}</span>
          </div>
          <div className="stat-info-row" style={{ marginTop: "0.5rem" }}>
            <span className="stat-info-label">此刻</span>
            <span className="stat-info-value">{progressLabel}</span>
          </div>
        </section>

        {/* 3. Core Resources */}
        <section className="stat-panel">
          <h3 className="stat-panel-title">气血与灵力</h3>
          <div className="stat-bar-container">
            <div className="stat-bar-header">
              <span>真气</span>
              <span style={{ color: "var(--accent-jade)" }}>{Math.floor(cultivator.qi)} / {cultivator.maxQi}</span>
            </div>
            <div className="stat-bar">
              <div className="stat-bar-fill jade" style={{ width: `${calculatePercent(cultivator.qi, cultivator.maxQi)}%` }}></div>
            </div>
          </div>
          <div className="stat-bar-container">
            <div className="stat-bar-header">
              <span>灵力</span>
              <span style={{ color: "var(--accent-purple)" }}>{Math.floor(cultivator.spiritualPower)} / {cultivator.maxSpiritualPower}</span>
            </div>
            <div className="stat-bar">
              <div className="stat-bar-fill purple" style={{ width: `${calculatePercent(cultivator.spiritualPower, cultivator.maxSpiritualPower)}%` }}></div>
            </div>
          </div>
          <div className="stat-grid-compact" style={{ marginTop: "1.5rem" }}>
            <div className="stat-item">
              <span className="stat-label">灵石</span>
              <span className="stat-value" style={{ color: "var(--accent-gold)" }}>{cultivator.spiritStones.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">本州声望</span>
              <span className="stat-value">{cultivator.reputation.toLocaleString()}</span>
            </div>
          </div>
        </section>

        <section className="stat-panel full-width">
          <h3 className="stat-panel-title">洞府</h3>
          {data.residences && data.residences.length > 0 ? (
            <ResidenceBoards residences={data.residences} nearbyHomes={data.nearbyHomes} variant="stat" />
          ) : (
            <p className="stat-empty">还没有洞府。</p>
          )}
        </section>

        {/* 4. 8 Main Attributes */}
        <section className="stat-panel full-width">
          <h3 className="stat-panel-title">八维</h3>
          <div className="stat-grid">
            <div className="stat-item"><span className="stat-label">根骨</span><span className="stat-value">{mainAttributes.gengu}</span></div>
            <div className="stat-item"><span className="stat-label">体魄</span><span className="stat-value">{mainAttributes.tipu}</span></div>
            <div className="stat-item"><span className="stat-label">灵元</span><span className="stat-value">{mainAttributes.lingyuan}</span></div>
            <div className="stat-item"><span className="stat-label">神识</span><span className="stat-value">{mainAttributes.shenshi}</span></div>
            <div className="stat-item"><span className="stat-label">悟性</span><span className="stat-value">{mainAttributes.wuxing}</span></div>
            <div className="stat-item"><span className="stat-label">道心</span><span className="stat-value">{mainAttributes.daoxin}</span></div>
            <div className="stat-item"><span className="stat-label">身法</span><span className="stat-value">{mainAttributes.shenfa}</span></div>
            <div className="stat-item"><span className="stat-label">兵魄</span><span className="stat-value">{mainAttributes.bingpo}</span></div>
          </div>
        </section>

        {/* 5. 15 Detailed Attributes */}
        <section className="stat-panel full-width">
          <h3 className="stat-panel-title">战斗细项</h3>
          <div className="stat-grid-compact">
            <div className="stat-item"><span className="stat-label">气血上限</span><span className="stat-value">{detailedAttributes.qixue_shangxian.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">灵力上限</span><span className="stat-value">{detailedAttributes.lingli_shangxian.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">灵力回复</span><span className="stat-value">{detailedAttributes.lingli_huifu.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">外功伤害倍率</span><span className="stat-value">{detailedAttributes.waigong_shanghai_beilv.toFixed(2)}x</span></div>
            <div className="stat-item"><span className="stat-label">术法伤害倍率</span><span className="stat-value">{detailedAttributes.shufa_shanghai_beilv.toFixed(2)}x</span></div>
            <div className="stat-item"><span className="stat-label">命中</span><span className="stat-value">{detailedAttributes.mingzhong.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">闪避</span><span className="stat-value">{detailedAttributes.shanbi.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">速度</span><span className="stat-value">{detailedAttributes.sudu.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">韧性</span><span className="stat-value">{detailedAttributes.renxing.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">控制强度</span><span className="stat-value">{detailedAttributes.kongzhi_qiangdu.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">控制抗性</span><span className="stat-value">{detailedAttributes.kongzhi_kangxing.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">突破稳定</span><span className="stat-value">{detailedAttributes.tupo_wending.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">会心</span><span className="stat-value">{detailedAttributes.huixin.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">暴伤</span><span className="stat-value">{detailedAttributes.baoshang.toFixed(2)}</span></div>
            <div className="stat-item"><span className="stat-label">护心</span><span className="stat-value">{detailedAttributes.huxin.toFixed(1)}</span></div>
          </div>
        </section>

        {/* 6. Five Elements */}
        <section className="stat-panel">
          <h3 className="stat-panel-title">五行</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="stat-bar-container" style={{ marginBottom: 0 }}>
              <div className="stat-bar-header"><span>金</span><span>{fiveElementScores.metal}</span></div>
              <div className="stat-bar"><div className="stat-bar-fill gold" style={{ width: `${Math.min(100, fiveElementScores.metal)}%` }}></div></div>
            </div>
            <div className="stat-bar-container" style={{ marginBottom: 0 }}>
              <div className="stat-bar-header"><span>木</span><span>{fiveElementScores.wood}</span></div>
              <div className="stat-bar"><div className="stat-bar-fill jade" style={{ width: `${Math.min(100, fiveElementScores.wood)}%` }}></div></div>
            </div>
            <div className="stat-bar-container" style={{ marginBottom: 0 }}>
              <div className="stat-bar-header"><span>水</span><span>{fiveElementScores.water}</span></div>
              <div className="stat-bar"><div className="stat-bar-fill water" style={{ width: `${Math.min(100, fiveElementScores.water)}%` }}></div></div>
            </div>
            <div className="stat-bar-container" style={{ marginBottom: 0 }}>
              <div className="stat-bar-header"><span>火</span><span>{fiveElementScores.fire}</span></div>
              <div className="stat-bar"><div className="stat-bar-fill danger" style={{ width: `${Math.min(100, fiveElementScores.fire)}%` }}></div></div>
            </div>
            <div className="stat-bar-container" style={{ marginBottom: 0 }}>
              <div className="stat-bar-header"><span>土</span><span>{fiveElementScores.earth}</span></div>
              <div className="stat-bar"><div className="stat-bar-fill earth" style={{ width: `${Math.min(100, fiveElementScores.earth)}%` }}></div></div>
            </div>
          </div>
        </section>

        {/* 7. Faction Standings */}
        <section className="stat-panel">
          <h3 className="stat-panel-title">势力</h3>
          {factionReputation.flatMap((faction) => {
            const name = publicFactionName(faction.name, faction.factionId);
            if (!name) {
              return [];
            }
            const standing = publicStandingLabel(faction.standing);
            return [(
              <div key={faction.factionId} className="stat-info-row">
                <span className="stat-info-label">{name}</span>
                <span className="stat-info-value">{standing ? `${faction.value}（${standing}）` : faction.value}</span>
              </div>
            )];
          })}
        </section>

        {/* 8. Registration Profile */}
        <section className="stat-panel full-width">
          <h3 className="stat-panel-title">命格</h3>
          {profile ? (
            <>
              {visitorText(profile.summary) ? <p className="stat-registration-summary">{visitorText(profile.summary)}</p> : null}
              <div className="stat-registration-grid">
                {registrationTraits.map((trait) => (
                  <article key={trait.label} className="stat-registration-card">
                    <div className="stat-registration-header">
                      <span className="stat-registration-label">{trait.label}</span>
                      {trait.meta ? <span className="stat-registration-meta">{trait.meta}</span> : null}
                    </div>
                    {trait.categoryDescription ? <p className="stat-registration-category">{trait.categoryDescription}</p> : null}
                    {trait.value ? <div className="stat-registration-value">{trait.value}</div> : null}
                    {trait.description ? <p className="stat-registration-description">{trait.description}</p> : null}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="stat-empty">命格还没有写下。</p>
          )}
        </section>

        {/* 9. Status Effects */}
        <section className="stat-panel">
          <h3 className="stat-panel-title">状态</h3>
          {statusEffects && statusEffects.length > 0 ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {statusEffects.map((effect, idx) => (
                <span key={idx} className="stat-chip danger">
                  {publicEffectLabel(effect.id, effect.name)}
                </span>
              ))}
            </div>
          ) : (
            <p className="stat-empty">身上没有挂着别的状态。</p>
          )}
        </section>

        {/* 10. Inventory */}
        <section className="stat-panel">
          <h3 className="stat-panel-title">行囊</h3>
          {inventoryEntries.length > 0 ? (
            <div className="stat-grid-compact">
              {inventoryEntries.map((entry) => (
                <div key={entry.id} className="stat-info-row" style={{ padding: "0.4rem 0" }}>
                  <span className="stat-info-label">{entry.name}</span>
                  <span className="stat-info-value">x{entry.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="stat-empty">{inventoryHasUnnamed ? "行囊里还有东西，名字没有写成中文。" : "行囊是空的。"}</p>
          )}
        </section>

        {/* 11. Techniques */}
        <section className="stat-panel">
          <h3 className="stat-panel-title">功法</h3>
          {techniqueLabels.length > 0 ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {techniqueLabels.map((tech, index) => (
                <span key={`${tech}-${index}`} className="stat-chip purple">{tech}</span>
              ))}
            </div>
          ) : (
            <p className="stat-empty">还没有记下功法。</p>
          )}
        </section>

        {/* 12. 当前谋略 — strategy is public; the whole world reads your dao. */}
        <section className="stat-panel full-width">
          <h3 className="stat-panel-title">当前谋略</h3>
          {dossier?.strategy ? (
            <>
              <div className="stat-grid-compact">
                <div className="stat-item"><span className="stat-label">风险</span><span className="stat-value">{publicRiskLabel(dossier.strategy.riskLevel) ?? "未记"}</span></div>
                <div className="stat-item"><span className="stat-label">近期目标</span><span className="stat-value">{visitorText(dossier.strategy.shortTermGoal) ?? "未记"}</span></div>
                <div className="stat-item"><span className="stat-label">长远目标</span><span className="stat-value">{visitorText(dossier.strategy.longTermGoal) ?? "未记"}</span></div>
              </div>
              {visitorText(dossier.strategy.reason) ? <p className="stat-registration-summary" style={{ marginTop: "1rem" }}>{visitorText(dossier.strategy.reason)}</p> : null}
            </>
          ) : (
            <p className="stat-empty">天机未显</p>
          )}
        </section>

        <section className="stat-panel">
          <h3 className="stat-panel-title">道心录</h3>
          {dossier && dossier.daoHeart.some((entry) => visitorText(entry.title) || visitorText(entry.content)) ? (
            <div className="stat-dossier-list">
              {dossier.daoHeart.filter((entry) => visitorText(entry.title) || visitorText(entry.content)).slice(0, 8).map((entry) => (
                <article key={entry.id} className="stat-dossier-entry">
                  <div className="stat-dossier-meta">
                    <span className="stat-dossier-from">{visitorText(entry.title) ?? "道心"}</span>
                    <span className="stat-dossier-tick">{tickLabel(entry.tick)}</span>
                  </div>
                  {visitorText(entry.content) ? <p className="stat-dossier-body">{visitorText(entry.content)}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="stat-empty">道心澄明</p>
          )}
        </section>

      </div>
    </div>
  );
}

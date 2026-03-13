import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "../styles/player-stat-page.css";

// --- Types based on API response ---

interface StatResponse {
  agent: { agentId: string; name: string; selectedCultivatorId: string; createdAt: string; updatedAt: string; lastSeenAt: string | null };
  tick: number;
  cultivator: {
    id: string; name: string; realm: string; realmLevel: number; realmProgress: number;
    qi: number; maxQi: number; spiritualPower: number; maxSpiritualPower: number;
    spiritStones: number; karma: number; reputation: number;
    location: string; currentZone: string | null; status: string; statusEffects: any[];
    inventory: Record<string, number>; techniques: string[];
    lifespan: number; age: number;
    origin: string; temperament: string; startingPath: string; genderPresentation: string; sectId: string | null;
  };
  cultivation: Record<string, any>;
  factionReputation: { righteous_path: number; demonic_path: number; beast_alliance: number; mortal_kingdom: number };
  registration: { coreTemperament?: string; secondaryTemperament?: string; behaviorAspect?: string; cultivationMotive?: string; spiritRoot?: string } | null;
  fiveElementScores: { metal: number; wood: number; water: number; fire: number; earth: number };
  mainAttributes: { gengu: number; tipu: number; lingyuan: number; shenshi: number; wuxing: number; daoxin: number; shenfa: number; bingpo: number };
  detailedAttributes: { 
    qixue_shangxian: number; lingli_shangxian: number; lingli_huifu: number; waigong_shanghai_beilv: number; shufa_shanghai_beilv: number;
    mingzhong: number; shanbi: number; sudu: number; renxing: number;
    kongzhi_qiangdu: number; kongzhi_kangxing: number; tupo_wending: number; huixin: number; baoshang: number; huxin: number;
  };
}

export function PlayerStatPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const [data, setData] = useState<StatResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch(`/world/agent/${agentId}`);
        if (!res.ok) {
          throw new Error(`Failed to load data (Status ${res.status})`);
        }
        
        const json = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error occurred");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (agentId) {
      void fetchData();
    }

    return () => {
      isMounted = false;
    };
  }, [agentId]);

  if (loading) {
    return (
      <div className="stat-page">
        <Link to="/" className="stat-back-link">Return to Realm</Link>
        <div className="stat-panel" style={{ textAlign: "center", padding: "4rem" }}>
          <h2 style={{ color: "var(--accent-jade)" }}>Summoning cultivator data...</h2>
          <p className="stat-empty">Accessing the Heavenly Records for ID: {agentId}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="stat-page">
        <Link to="/" className="stat-back-link">Return to Realm</Link>
        <div className="stat-panel" style={{ borderTop: "2px solid var(--accent-danger)", textAlign: "center" }}>
          <h2 style={{ color: "var(--accent-danger)" }}>Record Not Found</h2>
          <p className="stat-empty">{error || "Cultivator essence has dispersed or could not be found."}</p>
        </div>
      </div>
    );
  }

  const { cultivator, registration, mainAttributes, detailedAttributes, fiveElementScores, factionReputation } = data;

  const calculatePercent = (current: number, max: number) => {
    if (max <= 0) return 0;
    return Math.min(100, Math.max(0, (current / max) * 100));
  };

  const inventoryEntries = Object.entries(cultivator.inventory || {}).filter(([_, count]) => count > 0);

  return (
    <div className="stat-page">
      <Link to="/" className="stat-back-link">Return to Realm</Link>

      {/* 1. Identity Header */}
      <header className="stat-header">
        <h1>{cultivator.name || data.agent.name}</h1>
        <div className="stat-header-meta">
          <span className="stat-chip gold">{cultivator.realm} Lv.{cultivator.realmLevel}</span>
          <span className="stat-chip">{cultivator.origin || "Unknown Origin"}</span>
          <span className="stat-chip jade">{cultivator.sectId || "散修 (Rogue Cultivator)"}</span>
        </div>
        <div className="stat-header-meta" style={{ marginTop: "1rem", opacity: 0.8 }}>
          <span style={{ fontSize: "0.9rem" }}>{cultivator.temperament} • {cultivator.startingPath} • {cultivator.genderPresentation}</span>
        </div>
      </header>

      <div className="stat-layout">
        {/* 2. Realm & Progression */}
        <section className="stat-panel">
          <h3 className="stat-panel-title">Realm & Progression</h3>
          <div className="stat-bar-container">
            <div className="stat-bar-header">
              <span>{cultivator.realm} - Stage {cultivator.realmLevel}</span>
              <span style={{ color: "var(--accent-gold)" }}>{Math.floor(cultivator.realmProgress)}%</span>
            </div>
            <div className="stat-bar">
              <div className="stat-bar-fill gold" style={{ width: `${cultivator.realmProgress}%` }}></div>
            </div>
          </div>
          <div className="stat-info-row" style={{ marginTop: "1rem" }}>
            <span className="stat-info-label">Age / Lifespan</span>
            <span className="stat-info-value">{cultivator.age} / {cultivator.lifespan} years</span>
          </div>
        </section>

        {/* 3. Core Resources */}
        <section className="stat-panel">
          <h3 className="stat-panel-title">Core Resources</h3>
          <div className="stat-bar-container">
            <div className="stat-bar-header">
              <span>Qi (真气)</span>
              <span style={{ color: "var(--accent-jade)" }}>{Math.floor(cultivator.qi)} / {cultivator.maxQi}</span>
            </div>
            <div className="stat-bar">
              <div className="stat-bar-fill jade" style={{ width: `${calculatePercent(cultivator.qi, cultivator.maxQi)}%` }}></div>
            </div>
          </div>
          <div className="stat-bar-container">
            <div className="stat-bar-header">
              <span>Spiritual Power (灵力)</span>
              <span style={{ color: "var(--accent-purple)" }}>{Math.floor(cultivator.spiritualPower)} / {cultivator.maxSpiritualPower}</span>
            </div>
            <div className="stat-bar">
              <div className="stat-bar-fill purple" style={{ width: `${calculatePercent(cultivator.spiritualPower, cultivator.maxSpiritualPower)}%` }}></div>
            </div>
          </div>
          <div className="stat-grid-compact" style={{ marginTop: "1.5rem" }}>
            <div className="stat-item">
              <span className="stat-label">Spirit Stones</span>
              <span className="stat-value" style={{ color: "var(--accent-gold)" }}>{cultivator.spiritStones.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Karma</span>
              <span className="stat-value">{cultivator.karma.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Reputation</span>
              <span className="stat-value">{cultivator.reputation.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* 4. 8 Main Attributes */}
        <section className="stat-panel full-width">
          <h3 className="stat-panel-title">Primary Attributes</h3>
          <div className="stat-grid">
            <div className="stat-item"><span className="stat-label">根骨 (Gēn Gǔ) - Bone</span><span className="stat-value">{mainAttributes.gengu}</span></div>
            <div className="stat-item"><span className="stat-label">体魄 (Tǐ Pò) - Physique</span><span className="stat-value">{mainAttributes.tipu}</span></div>
            <div className="stat-item"><span className="stat-label">灵元 (Líng Yuán) - Spirit</span><span className="stat-value">{mainAttributes.lingyuan}</span></div>
            <div className="stat-item"><span className="stat-label">神识 (Shén Shí) - Sense</span><span className="stat-value">{mainAttributes.shenshi}</span></div>
            <div className="stat-item"><span className="stat-label">悟性 (Wù Xìng) - Insight</span><span className="stat-value">{mainAttributes.wuxing}</span></div>
            <div className="stat-item"><span className="stat-label">道心 (Dào Xīn) - Will</span><span className="stat-value">{mainAttributes.daoxin}</span></div>
            <div className="stat-item"><span className="stat-label">身法 (Shēn Fǎ) - Agility</span><span className="stat-value">{mainAttributes.shenfa}</span></div>
            <div className="stat-item"><span className="stat-label">兵魄 (Bīng Pò) - Martial</span><span className="stat-value">{mainAttributes.bingpo}</span></div>
          </div>
        </section>

        {/* 5. 15 Detailed Attributes */}
        <section className="stat-panel full-width">
          <h3 className="stat-panel-title">Detailed Combat Stats</h3>
          <div className="stat-grid-compact">
            <div className="stat-item"><span className="stat-label">气血上限 (Max HP)</span><span className="stat-value">{detailedAttributes.qixue_shangxian.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">灵力上限 (Max MP)</span><span className="stat-value">{detailedAttributes.lingli_shangxian.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">灵力回复 (MP Regen)</span><span className="stat-value">{detailedAttributes.lingli_huifu.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">外功伤害倍率 (Phys Dmg)</span><span className="stat-value">{detailedAttributes.waigong_shanghai_beilv.toFixed(2)}x</span></div>
            <div className="stat-item"><span className="stat-label">术法伤害倍率 (Mag Dmg)</span><span className="stat-value">{detailedAttributes.shufa_shanghai_beilv.toFixed(2)}x</span></div>
            <div className="stat-item"><span className="stat-label">命中 (Accuracy)</span><span className="stat-value">{detailedAttributes.mingzhong.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">闪避 (Evasion)</span><span className="stat-value">{detailedAttributes.shanbi.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">速度 (Speed)</span><span className="stat-value">{detailedAttributes.sudu.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">韧性 (Resilience)</span><span className="stat-value">{detailedAttributes.renxing.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">控制强度 (CC Power)</span><span className="stat-value">{detailedAttributes.kongzhi_qiangdu.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">控制抗性 (CC Resist)</span><span className="stat-value">{detailedAttributes.kongzhi_kangxing.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">突破稳定 (Breakthrough)</span><span className="stat-value">{detailedAttributes.tupo_wending.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">会心 (Crit Rate)</span><span className="stat-value">{detailedAttributes.huixin.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">暴伤 (Crit Dmg)</span><span className="stat-value">{detailedAttributes.baoshang.toFixed(2)}</span></div>
            <div className="stat-item"><span className="stat-label">护心 (Crit Resist)</span><span className="stat-value">{detailedAttributes.huxin.toFixed(1)}</span></div>
          </div>
        </section>

        {/* 6. Five Elements */}
        <section className="stat-panel">
          <h3 className="stat-panel-title">Five Elements</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="stat-bar-container" style={{ marginBottom: 0 }}>
              <div className="stat-bar-header"><span>金 (Metal)</span><span>{fiveElementScores.metal}</span></div>
              <div className="stat-bar"><div className="stat-bar-fill gold" style={{ width: `${Math.min(100, fiveElementScores.metal)}%` }}></div></div>
            </div>
            <div className="stat-bar-container" style={{ marginBottom: 0 }}>
              <div className="stat-bar-header"><span>木 (Wood)</span><span>{fiveElementScores.wood}</span></div>
              <div className="stat-bar"><div className="stat-bar-fill jade" style={{ width: `${Math.min(100, fiveElementScores.wood)}%` }}></div></div>
            </div>
            <div className="stat-bar-container" style={{ marginBottom: 0 }}>
              <div className="stat-bar-header"><span>水 (Water)</span><span>{fiveElementScores.water}</span></div>
              <div className="stat-bar"><div className="stat-bar-fill water" style={{ width: `${Math.min(100, fiveElementScores.water)}%` }}></div></div>
            </div>
            <div className="stat-bar-container" style={{ marginBottom: 0 }}>
              <div className="stat-bar-header"><span>火 (Fire)</span><span>{fiveElementScores.fire}</span></div>
              <div className="stat-bar"><div className="stat-bar-fill danger" style={{ width: `${Math.min(100, fiveElementScores.fire)}%` }}></div></div>
            </div>
            <div className="stat-bar-container" style={{ marginBottom: 0 }}>
              <div className="stat-bar-header"><span>土 (Earth)</span><span>{fiveElementScores.earth}</span></div>
              <div className="stat-bar"><div className="stat-bar-fill earth" style={{ width: `${Math.min(100, fiveElementScores.earth)}%` }}></div></div>
            </div>
          </div>
        </section>

        {/* 7. Faction Standings */}
        <section className="stat-panel">
          <h3 className="stat-panel-title">Faction Standings</h3>
          <div className="stat-info-row">
            <span className="stat-info-label">Righteous Path</span>
            <span className="stat-info-value">{factionReputation.righteous_path}</span>
          </div>
          <div className="stat-info-row">
            <span className="stat-info-label">Demonic Path</span>
            <span className="stat-info-value">{factionReputation.demonic_path}</span>
          </div>
          <div className="stat-info-row">
            <span className="stat-info-label">Beast Alliance</span>
            <span className="stat-info-value">{factionReputation.beast_alliance}</span>
          </div>
          <div className="stat-info-row">
            <span className="stat-info-label">Mortal Kingdom</span>
            <span className="stat-info-value">{factionReputation.mortal_kingdom}</span>
          </div>
        </section>

        {/* 8. Registration Profile */}
        <section className="stat-panel">
          <h3 className="stat-panel-title">Registration Profile</h3>
          {registration ? (
            <>
              <div className="stat-info-row"><span className="stat-info-label">Core Temperament</span><span className="stat-info-value">{registration.coreTemperament || "N/A"}</span></div>
              <div className="stat-info-row"><span className="stat-info-label">Secondary</span><span className="stat-info-value">{registration.secondaryTemperament || "N/A"}</span></div>
              <div className="stat-info-row"><span className="stat-info-label">Behavior Aspect</span><span className="stat-info-value">{registration.behaviorAspect || "N/A"}</span></div>
              <div className="stat-info-row"><span className="stat-info-label">Motive</span><span className="stat-info-value">{registration.cultivationMotive || "N/A"}</span></div>
              <div className="stat-info-row"><span className="stat-info-label">Spirit Root</span><span className="stat-info-value">{registration.spiritRoot || "N/A"}</span></div>
            </>
          ) : (
            <p className="stat-empty">Not registered in Heavenly Records</p>
          )}
        </section>

        {/* 9. Status Effects */}
        <section className="stat-panel">
          <h3 className="stat-panel-title">Status Effects</h3>
          {cultivator.statusEffects && cultivator.statusEffects.length > 0 ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {cultivator.statusEffects.map((effect, idx) => (
                <span key={idx} className="stat-chip danger">
                  {typeof effect === "string" ? effect : effect.name || "Unknown Effect"}
                </span>
              ))}
            </div>
          ) : (
            <p className="stat-empty">No active effects</p>
          )}
        </section>

        {/* 10. Inventory */}
        <section className="stat-panel">
          <h3 className="stat-panel-title">Inventory</h3>
          {inventoryEntries.length > 0 ? (
            <div className="stat-grid-compact">
              {inventoryEntries.map(([item, count]) => (
                <div key={item} className="stat-info-row" style={{ padding: "0.4rem 0" }}>
                  <span className="stat-info-label">{item}</span>
                  <span className="stat-info-value">x{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="stat-empty">Empty</p>
          )}
        </section>

        {/* 11. Techniques */}
        <section className="stat-panel">
          <h3 className="stat-panel-title">Techniques</h3>
          {cultivator.techniques && cultivator.techniques.length > 0 ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {cultivator.techniques.map((tech, idx) => (
                <span key={idx} className="stat-chip purple">{tech}</span>
              ))}
            </div>
          ) : (
            <p className="stat-empty">None</p>
          )}
        </section>

      </div>
    </div>
  );
}

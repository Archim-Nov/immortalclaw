import React from "react";
import type { CultivatorStateView } from "../../../../packages/contracts/src/runtime-api.js";

type Home = CultivatorStateView["residences"][number];
type NearbyHome = NonNullable<CultivatorStateView["nearbyHomes"]>[number];

export function ResidenceBoards(props: {
  residences: readonly Home[];
  nearbyHomes?: readonly NearbyHome[];
  variant: "stat" | "runtime";
}) {
  const chip = (tone: string) => props.variant === "stat" ? `stat-chip ${tone}` : `chip ${tone}`;
  const copyClass = props.variant === "stat" ? "stat-empty" : "dashboard-support-copy";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {props.residences.map((home) => (
        <article key={home.id}>
          <div className={props.variant === "stat" ? "stat-header-meta" : "runtime-chip-row"} style={{ marginBottom: "0.6rem" }}>
            <span className={chip("gold")}>{home.tierName}</span>
            <span className={chip("")}>{home.name}</span>
            {home.isActive ? <span className={chip("jade")}>当前</span> : null}
          </div>
          <p className={copyClass} style={{ textAlign: "left" }}>{home.glance}</p>
          <p className={copyClass} style={{ textAlign: "left" }}>
            位子 {home.usedSlots} / {home.slotCount}。下一阶是{home.nextUpgrade.tierName}，要 {home.nextUpgrade.price.toLocaleString("en-US")} 灵石。
          </p>
          {home.fixtures.length > 0 ? (
            <div className={props.variant === "stat" ? undefined : "runtime-chip-row"} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {home.fixtures.map((fixture) => (
                <span key={fixture.id} className={chip("purple")}>
                  {fixture.name} · {fixture.tierName}
                </span>
              ))}
            </div>
          ) : (
            <p className={copyClass} style={{ textAlign: "left" }}>还没有陈设。</p>
          )}
        </article>
      ))}
      {props.nearbyHomes?.map((home) => (
        <p key={home.ownerId} className={copyClass} style={{ textAlign: "left" }}>
          {home.ownerName}的{home.residenceName}是{home.tierName}。{home.glance}
        </p>
      ))}
    </div>
  );
}

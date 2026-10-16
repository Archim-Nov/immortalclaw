import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { PublicAgentDirectoryEntry, WorldChronicleEntry } from "../../../../packages/contracts/src/runtime-api.js";
import { AgentLifePreview } from "./agent-life-preview";
import { appRoutes } from "../app/router";
import { MAP_VIEW, layoutAgentPins } from "../lib/jiuzhou-map";
import { SpectatorStage, SpectatorStageView } from "./spectator-stage";

const agent: PublicAgentDirectoryEntry = {
  agentId: "agent-qingluo",
  name: "青萝",
  selectedCultivatorId: "cultivator-qingluo",
  createdAt: "2026-10-16T00:00:00.000Z",
  updatedAt: "2026-10-16T00:00:00.000Z",
  lastSeenAt: "2026-10-16T00:00:00.000Z",
  cultivator: {
    id: "cultivator-qingluo",
    name: "青萝",
    realm: "炼气",
    realmLevel: 3,
    realmPhase: "后期",
    realmProgress: 40,
    status: "busy",
    location: "青岚城",
    locationId: "qingzhou:main-city",
    stateId: "qingzhou",
    spiritualPower: 80,
    sect: "苍木谷",
    currentAction: "cultivate",
    currentActionLabel: "运功",
  },
};

const entries: WorldChronicleEntry[] = [
  {
    id: "dialogue:msg-1",
    kind: "dialogue",
    tick: 12,
    actorCultivatorId: "cultivator-qingluo",
    actorName: "青萝",
    title: "城门口",
    summary: "今夜子时，青岚城见。",
    tone: "dialogue",
    tags: ["传音"],
  },
];

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
}

test("the public landing is the spectator stage and the control center stays on its route", () => {
  const shell = appRoutes[0];
  assert.ok(shell && "children" in shell && Array.isArray(shell.children));
  const children = shell.children ?? [];
  const home = children.find((route) => route.path === "/");
  const watch = children.find((route) => route.path === "/watch");
  const dashboard = children.find((route) => route.path === "/dashboard");
  assert.equal(home && "element" in home ? (home.element as React.ReactElement).type : null, SpectatorStage);
  assert.equal(watch && "element" in watch ? (watch.element as React.ReactElement).type : null, SpectatorStage);
  assert.notEqual(dashboard && "element" in dashboard ? (dashboard.element as React.ReactElement).type : null, SpectatorStage);
});

test("a populated watch page shows place, action, and dialogue without command controls", () => {
  const html = render(
    <SpectatorStageView
      phase="ready"
      tick={12}
      agents={[agent]}
      entries={entries}
    />,
  );

  assert.match(html, /观修/);
  assert.match(html, /青萝/);
  assert.match(html, /炼气后期/);
  assert.match(html, /青岚城/);
  assert.match(html, /运功/);
  assert.match(html, /今夜子时，青岚城见。/);
  assert.match(html, /九州/);
  assert.doesNotMatch(html, /shan-shui/);
  assert.match(html, /src="\/assets\/jiuzhou-ink-wash.png"/);
  assert.doesNotMatch(html, /jiuzhou-map\.svg/);
  const [pin] = layoutAgentPins([{
    agentId: agent.agentId,
    locationId: agent.cultivator.locationId,
    stateId: agent.cultivator.stateId,
  }]);
  assert.ok(pin);
  assert.match(html, new RegExp(`left:${(pin.x / MAP_VIEW.width) * 100}%`));
  assert.match(html, new RegExp(`top:${(pin.y / MAP_VIEW.height) * 100}%`));
  assert.match(html, /spectator-pin-dot/);
  assert.match(html, /青州/);
  assert.match(html, /href="\/stat\/agent-qingluo"/);
  assert.doesNotMatch(html, /执行|发送消息|enqueue|\/agent\/act|type="submit"/i);
});

test("the watch page explains loading, failure, and an empty roster", () => {
  const loading = render(
    <SpectatorStageView phase="loading" tick={null} agents={[]} entries={[]} />,
  );
  const failed = render(
    <SpectatorStageView
      phase="error"
      errorMessage="名册暂时读不到。"
      tick={null}
      agents={[]}
      entries={[]}
    />,
  );
  const empty = render(
    <SpectatorStageView phase="ready" tick={3} agents={[]} entries={[]} />,
  );

  assert.match(loading, /正在铺开这卷图/);
  assert.match(failed, /名册没有取到/);
  assert.match(failed, /名册暂时读不到。/);
  assert.match(empty, /还没有修士入册/);
  assert.match(empty, /这一阵安静/);
  assert.doesNotMatch(`${loading}${failed}${empty}`, /青萝|执行|发送消息/);
});

test("a cultivator's public life leads with place, action, dialogue, and recent acts", () => {
  const html = renderToStaticMarkup(
    <AgentLifePreview
      location="青岚城"
      action="运功"
      realmLabel="炼气后期"
      sect="苍木谷"
      messages={[{
        id: "msg-1",
        from: "青萝",
        tick: 12,
        subject: "城门口",
        body: "今夜子时，青岚城见。",
      }]}
      acts={[{
        id: "evt-1",
        kind: "见闻",
        title: "城外起雾",
        tick: 11,
        body: "青岚城外的雾比往常厚。",
      }]}
    />,
  );

  assert.match(html, /所在/);
  assert.match(html, /青岚城/);
  assert.match(html, /此刻/);
  assert.match(html, /运功/);
  assert.match(html, /今夜子时，青岚城见。/);
  assert.match(html, /城外起雾/);
  assert.doesNotMatch(html, /<button|type="submit"|执行|发送/);

  const empty = renderToStaticMarkup(
    <AgentLifePreview
      location="青岚城"
      action="闲着"
      realmLabel="炼气后期"
      sect={null}
      messages={[]}
      acts={[]}
    />,
  );
  assert.match(empty, /尚无传音/);
  assert.match(empty, /这一阵没有记下什么事/);
  assert.match(empty, /散修/);
});

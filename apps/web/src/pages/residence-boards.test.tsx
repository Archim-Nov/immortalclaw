import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResidenceBoards } from "./residence-boards";

const home = {
  id: "residence-1",
  stateId: "qingzhou",
  locationId: "qingzhou:main-city",
  name: "青岚洞府",
  description: "竹林里的屋子。",
  isActive: true,
  grandeur: 3,
  tierName: "灵府",
  slotCount: 4,
  usedSlots: 1,
  prestige: 12,
  glance: "青岚洞府是一处灵府，屋里看得见蒲团。",
  benefitLine: "陈设的用处有顶。",
  fixtures: [
    {
      id: "putuan",
      name: "蒲团",
      tier: 3,
      tierName: "宝光",
      cosmetic: false,
      line: "闭关时进境会多一点点。",
    },
  ],
  nextUpgrade: {
    actionId: "upgrade-residence" as const,
    nextGrandeur: 4,
    tierName: "仙府",
    price: 96000,
    slotCount: 6,
    line: "下一阶是仙府。",
  },
};

test("residence boards show the tier and the furniture", () => {
  const html = renderToStaticMarkup(
    <ResidenceBoards
      residences={[home]}
      nearbyHomes={[{
        ownerId: "guest",
        ownerName: "过客",
        residenceName: "青岚洞府",
        grandeur: 3,
        tierName: "灵府",
        glance: "青岚洞府是一处灵府，屋里看得见蒲团。",
      }]}
      variant="stat"
    />,
  );
  assert.match(html, /灵府/);
  assert.match(html, /蒲团/);
  assert.match(html, /宝光/);
  assert.match(html, /96,000/);
  assert.match(html, /过客的青岚洞府是灵府/);
});

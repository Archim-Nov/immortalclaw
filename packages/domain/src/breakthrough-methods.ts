import { aboveMethodId, aboveQuietStep, aboveSpiritNarrative } from "./above-spirit.js";
import type { BreakthroughMethodId } from "./model.js";

/**
 * How a cultivator breaks through at the current realm level.
 *
 * 炼气 and 筑基 stay in the cave. 金丹, 元婴, and 化神 each leave that button.
 * Inside 元婴 and 化神 the phases leave each other too: 炼婴, then the lamp,
 * then tribulation; the pattern, then the platform. Materials stay on the
 * ladder in realm-path.ts. This file only says where, with whom, and in what order.
 */

export interface BreakthroughMethodNarrative {
  id: BreakthroughMethodId;
  name: string;
  risk: string;
  help: string;
  sequence: string[];
  refusal: string;
}

export function breakthroughMethodIdForLevel(realmLevel: number): BreakthroughMethodId | null {
  const level = Math.floor(realmLevel);
  const above = aboveMethodId(level);
  if (above) return above;
  if (level < 1 || level > 14) return null;
  if (level <= 6) return "residence";
  if (level <= 8) return "core-rite";
  if (level === 9) return "infant-fire";
  if (level === 10) return "nascent-refine";
  if (level === 11) return "soul-vigil";
  if (level === 12) return "tribulation";
  if (level === 13) return "divine-pattern";
  return "divine-vigil";
}

export function breakthroughMethodNarrative(input: {
  realmLevel: number;
  successRate: number | null;
  category: "minor" | "major" | null;
}): BreakthroughMethodNarrative | null {
  const above = aboveSpiritNarrative(input.realmLevel, input.successRate);
  if (above) return above;
  const id = breakthroughMethodIdForLevel(input.realmLevel);
  if (!id) return null;
  const rate = input.successRate ?? (input.realmLevel === 9 ? 40 : input.realmLevel === 12 ? 30 : 0);
  switch (id) {
    case "residence":
      return {
        id,
        name: "洞府破境",
        risk: input.category === "major"
          ? `这一次是大境界，基础成功率大约 ${rate}。失败会丢掉材料，进度退到六成。`
          : "这一阶是小突破，材料齐了就会成。",
        help: "这一阶不用别人看着。",
        sequence: ["材料齐了，回自己的洞府破境。"],
        refusal: "这一阶就在自己的洞府里破。",
      };
    case "core-rite":
      return {
        id,
        name: "结丹仪",
        risk: "这一阶是小突破，丹会结成。在宗门驻地走稳妥结丹仪，没有额外代价。眼前有人，或护法还守着，可以催丹。催丹大约有四分之一的机会留下一段短走火，境界仍然会过去。",
        help: "稳妥可以一个人在宗门驻地走。催丹要护法，或眼前有别的修士。",
        sequence: [
          "先到宗门驻地，把结丹仪稳妥走完。",
          "若眼前有别的修士，或护法还守着，可以在洞府或驻地催丹。",
          "这一阶不在洞府里闷头破。",
        ],
        refusal: "金丹这一阶不在洞府里闷头破。到宗门驻地走结丹仪。稳妥可以一个人走。有人看着时可以催丹。",
      };
    case "infant-fire":
      return {
        id,
        name: "婴火淬体",
        risk: `这是大境界，基础成功率大约 ${rate}。失败会耗掉材料，进度退到六成，婴火反噬会留下伤和一段走火。有护法或同伴在同一处，成功率会高一截。`,
        help: "可以一个人淬。有护法或同伴在同一处，成功率会高一截。",
        sequence: [
          "材料齐了，到宗门驻地，或站到甲级地宫门口，走婴火淬体。",
          "婴火要在驻地或甲级门口淬。这一阶不在洞府里破。",
          "有护法或同伴站在同一处，成功率会高一截。",
        ],
        refusal: "这一次是婴火淬体，不在洞府里破。到宗门驻地或甲级地宫门口。",
      };
    case "nascent-refine":
      return {
        id,
        name: "炼婴",
        risk: "这一阶是小突破，婴会炼成。一个人炼，婴身会挣一下，人挂一点伤。有护法或同伴在同一处看着，伤就不必挂。",
        help: "可以一个人炼。有护法或同伴在同一处，炼完不挂这点伤。",
        sequence: [
          "到宗门驻地，或站到甲级地宫门口，把这一层元婴炼稳。",
          "养婴露仍在甲级四到六层的婴火莲池。大圆满的兵器和功法也从这一档往后走。",
          "这一阶不回洞府点灯。中期才守魂灯。",
        ],
        refusal: "元婴前期要炼婴，不在洞府里点灯。到宗门驻地或甲级地宫门口。",
      };
    case "soul-vigil":
      return {
        id,
        name: "魂灯守夜",
        risk: "这一阶是小突破。魂灯点着的时候收口就会成。灯灭了不耗材料，重新点一次。",
        help: "可以一个人守。眼前有人的话，收口时会记下这个人。",
        sequence: [
          "回自己的洞府，先点上魂灯，守六个时辰。",
          "灯还亮着的时候收口。灯灭了就重新点。固婴砂在收口时才耗，仍从婴火莲池来。",
          "前期的炼婴已经过去。这一阶不在驻地炼。元婴后期再去渡劫。",
        ],
        refusal: "元婴中期要先点魂灯。在洞府点上，灯亮着再收口。这一阶不炼婴。",
      };
    case "tribulation":
      return {
        id,
        name: "渡劫",
        risk: `这是大境界，基础成功率大约 ${rate}。失败会耗掉材料，进度退到六成，并留下伤和一段走火。一个人迎雷，伤更重。有同伴在同一处，成功率高一点，雷也会分掉一点，同伴会挂一点伤。`,
        help: "可以一个人迎。有同伴在同一处，雷会分掉一点，成功率也高一点。",
        sequence: [
          "到荒野，或站到甲级地宫门口，渡这一次劫，迎天劫。",
          "洞府和城里接不住这一道雷。这一阶不在洞府里破，也不再守魂灯。",
          "有同伴在同一处，雷会分掉一点，成功率也高一点。",
        ],
        refusal: "这一次是渡劫，不在洞府里破。到荒野或甲级地宫门口迎雷。",
      };
    case "divine-pattern":
      return {
        id,
        name: "神纹落印",
        risk: "这一阶是小突破，神纹落印就会成。有人在场看着，印落得稳。一个人落印也能成，神纹会反噬，人会挂一点伤。",
        help: "可以一个人落印，但会挂一点伤。有人在场看着，印落得稳。",
        sequence: [
          "到宗门驻地，先把神纹铺开。",
          "纹还在的时候落印。有人看着会稳。一个人落印会挂一点伤，境界仍然过去。",
          "这是化神前期。中期不在驻地铺纹，要到荒野或甲级门口守神台。神胎露仍在神纹天隙。",
        ],
        refusal: "化神前期要在宗门驻地铺神纹。先铺开，再落印。这一阶不守神台。",
      };
    case "divine-vigil":
      return {
        id,
        name: "守神台",
        risk: "这一阶是小突破，神台守住就会成。一个人守，神台会压下来，人挂一点伤。有人在旁边看着，伤就不必挂。",
        help: "可以一个人守，但会挂一点伤。有人在同一处看着，台就稳。",
        sequence: [
          "到荒野，或站到甲级地宫门口，把神台守住。",
          "化神金章仍在甲级七到九层的神纹天隙。化神的兵器和功法也停在这一档，坊市不卖。",
          "前期的神纹已经落过。这一阶不在宗门驻地铺纹。",
        ],
        refusal: "化神中期要守神台，不在驻地铺神纹。到荒野或甲级地宫门口。",
      };
    default:
      return null;
  }
}

export function quietMethodStep(realmLevel: number): string | null {
  const level = Math.max(1, Math.floor(realmLevel));
  if (level >= 24) {
    return "大乘后期是眼下这条梯子的顶。凉州和雷州的灵脉仍会分出乘风灰。兵器和功法也停在化神。";
  }
  const above = aboveQuietStep(level);
  if (above) return above;
  if (level < 9) return null;
  if (level === 14) {
    return "化神中期要到荒野或甲级地宫门口守神台。化神金章仍在神纹天隙。一个人守会挂一点伤，有人在旁边看着就稳。这一阶会成。";
  }
  if (level === 13) {
    return "已经是化神前期。到宗门驻地铺神纹，纹还在再落印。神胎露在甲级七层往上。一个人落印会挂一点伤。中期再去守神台。";
  }
  if (level === 12) {
    return "下一阶是化神。甲级地宫七层到九层拿神纹石和破婴神莲，然后到荒野或甲级地宫门口渡劫，迎天劫。这一次可能失败，材料会没，人会受伤，气息也会乱一阵。有同伴在场，雷会分掉一点。成了才能装备化神的兵器和功法。";
  }
  if (level === 11) {
    return "元婴中期回自己的洞府守魂灯。先点上，灯还亮着再收口。固婴砂仍在甲级四层往上的婴火莲池。元婴后期再去渡劫。";
  }
  if (level === 10) {
    return "元婴前期不在洞府里点灯。到宗门驻地或甲级地宫门口炼婴。养婴露在甲级四层往上的婴火莲池。一个人炼会挂一点伤，有人看着就稳。这一阶会成。中期再回洞府守魂灯。";
  }
  return "下一阶是元婴。甲级地宫四层往上拿婴火莲和九转紫金髓，到宗门驻地或甲级地宫门口走婴火淬体。这一次可能失败，材料会没，人会受伤。成了才开大圆满的兵器和功法。";
}

import type { BreakthroughMethodId } from "./model.js";

/**
 * How a cultivator breaks through at the current realm level.
 *
 * 炼气 and 筑基 stay in the cave. 金丹, 元婴, and 化神 each leave that button.
 * Materials stay on the ladder in realm-path.ts. This file only says where,
 * with whom, and in what order.
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
  if (level < 1 || level > 14) return null;
  if (level <= 6) return "residence";
  if (level <= 8) return "core-rite";
  if (level === 9) return "infant-fire";
  if (level <= 11) return "soul-vigil";
  if (level === 12) return "tribulation";
  return "divine-pattern";
}

export function breakthroughMethodNarrative(input: {
  realmLevel: number;
  successRate: number | null;
  category: "minor" | "major" | null;
}): BreakthroughMethodNarrative | null {
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
        sequence: ["材料齐了，回自己的洞府用 residence-breakthrough。"],
        refusal: "这一阶就在自己的洞府里破。",
      };
    case "core-rite":
      return {
        id,
        name: "结丹仪",
        risk: "这一阶是小突破，丹会结成。在宗门驻地用 core-rite:steady 走稳，没有额外代价。眼前有人，或护法还守着，可以用 core-rite:press 催丹。催丹大约有四分之一的机会留下一段短走火，境界仍然会过去。",
        help: "稳妥可以一个人在宗门驻地走。催丹要护法，或眼前有别的修士。",
        sequence: [
          "先到宗门驻地，用 core-rite:steady 把结丹仪走完。",
          "若眼前有别的修士，或护法还守着，可以在洞府或驻地改用 core-rite:press 催丹。",
          "不要用 residence-breakthrough。这一阶不在洞府里闷头破。",
        ],
        refusal: "金丹这一阶不在洞府里闷头破。到宗门驻地走结丹仪，用 core-rite:steady，或有人看着时用 core-rite:press。",
      };
    case "infant-fire":
      return {
        id,
        name: "婴火淬体",
        risk: `这是大境界，基础成功率大约 ${rate}。失败会耗掉材料，进度退到六成，婴火反噬会留下伤和一段走火。有护法或同伴在同一处，成功率会高一截。`,
        help: "可以一个人淬。有护法或同伴在同一处，成功率会高一截。",
        sequence: [
          "材料齐了，到宗门驻地，或站到甲级地宫门口，用 infant-fire-temper。",
          "不要用 residence-breakthrough。婴火要在驻地或甲级门口淬。",
          "有护法或同伴站在同一处，成功率会高一截。",
        ],
        refusal: "这一次是婴火淬体，不在洞府里破。到宗门驻地或甲级地宫门口，用 infant-fire-temper。",
      };
    case "soul-vigil":
      return {
        id,
        name: "魂灯守夜",
        risk: "这一阶是小突破。魂灯点着的时候收口就会成。灯灭了不耗材料，重新点一次。",
        help: "可以一个人守。眼前有人的话，收口时会记下这个人。",
        sequence: [
          "回自己的洞府，先用 begin-soul-vigil 点上魂灯，守六个时辰。",
          "灯还亮着的时候用 seal-soul-vigil 收口。灯灭了就重新点。材料在收口时才耗。",
        ],
        refusal: "元婴这一阶要先点魂灯。在洞府用 begin-soul-vigil，灯亮着再用 seal-soul-vigil。",
      };
    case "tribulation":
      return {
        id,
        name: "天劫",
        risk: `这是大境界，基础成功率大约 ${rate}。失败会耗掉材料，进度退到六成，并留下伤和一段走火。一个人迎雷，伤更重。有同伴在同一处，成功率高一点，雷也会分掉一点，同伴会挂一点伤。`,
        help: "可以一个人迎。有同伴在同一处，雷会分掉一点，成功率也高一点。",
        sequence: [
          "到荒野，或站到甲级地宫门口，用 face-tribulation 迎天劫。",
          "洞府和城里接不住这一道雷。不要用 residence-breakthrough。",
          "有同伴在同一处，雷会分掉一点，成功率也高一点。",
        ],
        refusal: "这一次是天劫，不在洞府里破。到荒野或甲级地宫门口，用 face-tribulation。",
      };
    case "divine-pattern":
      return {
        id,
        name: "神纹落印",
        risk: "这一阶是小突破，神纹落印就会成。有人在场看着，印落得稳。一个人落印也能成，神纹会反噬，人会挂一点伤。",
        help: "可以一个人落印，但会挂一点伤。有人在场看着，印落得稳。",
        sequence: [
          "到宗门驻地，先用 begin-divine-step 把神纹铺开。",
          "纹还在的时候用 seal-divine-step 落印。有人看着会稳。一个人落印会挂一点伤，境界仍然过去。",
        ],
        refusal: "化神这一阶要在宗门驻地铺神纹。先用 begin-divine-step，再用 seal-divine-step。",
      };
    default:
      return null;
  }
}

export function quietMethodStep(realmLevel: number): string | null {
  const level = Math.max(1, Math.floor(realmLevel));
  if (level < 9) return null;
  if (level >= 15) {
    return "化神后期是眼下这条梯子的顶。甲级地宫七层到九层仍是这一档的去处，兵器和功法也停在化神。";
  }
  if (level >= 12) {
    return "下一阶是化神。甲级地宫七层到九层拿神纹石和破婴神莲，然后到荒野或甲级地宫门口用 face-tribulation 迎天劫。这一次可能失败，材料会没，人会受伤，气息也会乱一阵。有同伴在场，雷会分掉一点。成了才能装备化神的兵器和功法。";
  }
  if (level >= 10) {
    return "已经是元婴。这一阶先回洞府用 begin-soul-vigil 点魂灯，灯还亮着再用 seal-soul-vigil 收口。养婴露和固婴砂仍在甲级四层往上。元婴后期再去迎天劫。";
  }
  return "下一阶是元婴。甲级地宫四层往上拿婴火莲和九转紫金髓，到宗门驻地或甲级地宫门口用 infant-fire-temper 走婴火淬体。这一次可能失败，材料会没，人会受伤。成了才开大圆满的兵器和功法。";
}

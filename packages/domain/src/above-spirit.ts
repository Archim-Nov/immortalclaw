import type { BreakthroughMethodId, ItemId, RealmStage } from "./model.js";
import { realmStageForLevel } from "./realms.js";

/**
 * Three major realms above 化神.
 *
 * Each phase leaves the previous button. Materials are not sold and do not
 * open a new dungeon rank. 凉州 and 雷州 spirit veins hand out one extra
 * piece once the gatherer has reached 化神后期. Weapon and spell tiers past 化神
 * live in the combat catalog.
 */

export type AbovePlace = "wilderness-or-gate" | "wilderness" | "sect" | "residence";
export type AboveShape = "single" | "open-then-seal";

export interface AboveRite {
  method: BreakthroughMethodId;
  name: string;
  level: number;
  place: AbovePlace;
  shape: AboveShape;
  openActionId?: string;
  actionId: string;
  openLabel?: string;
  openDescription?: string;
  label: string;
  openJobLabel?: string;
  jobLabel: string;
  duration: number;
  baseSuccessRate: number | null;
  companionRate: number;
  successInjuryAlone: number;
  successInjuryShared: number;
  failInjuryAlone: number;
  failDeviation: number;
  failInjuryShared: number;
  companionFailInjury: number;
  generics: readonly ItemId[];
  special: ItemId;
  description: (companyName: string | null) => string;
  successLife: (name: string, company: string | null) => string;
  failureLife: (name: string, company: string | null) => string;
  companionLife?: (companion: string, name: string) => string;
  openSentence?: (name: string) => string;
  sealSummary?: (name: string) => string;
  wrongPlace: string;
  riteCold?: string;
  riteMissing?: string;
  risk: string;
  help: string;
  sequence: string[];
  refusal: string;
  quiet: string;
  where: string;
  outcome: string;
}

const VOID_GENERICS = ["void-grain-sand", "empty-silk", "rift-boundary-stone"] as const satisfies readonly ItemId[];
const UNITY_GENERICS = ["twin-soul-ash", "joined-dao-jade", "heaven-man-thread"] as const satisfies readonly ItemId[];
const MAHAYANA_GENERICS = ["kalpa-pillar-shard", "great-vehicle-ash", "wind-feather"] as const satisfies readonly ItemId[];

const VOID_WHERE = "炼虚的灵材坊市不卖，甲级也不另开层。凉州或雷州的灵脉，人到了化神后期去收，会在化神那一份之外再分出虚纹砂、空丝、裂界石和这一阶要用的东西。先入当地山门，把灵脉护下来再收。";
const UNITY_WHERE = "合体的灵材坊市不卖，甲级也不另开层。凉州或雷州的灵脉，人到了炼虚后期去收，会再分出双魂灰、合道玉、天人丝和这一阶要用的东西。先入当地山门，把灵脉护下来再收。";
const MAHAYANA_WHERE = "大乘的灵材坊市不卖，甲级也不另开层。凉州或雷州的灵脉，人到了合体后期去收，会再分出劫柱屑、大乘灰、渡风羽和这一阶要用的东西。先入当地山门，把灵脉护下来再收。";

export const ABOVE_RITES: readonly AboveRite[] = [
  {
    method: "void-altar",
    name: "炼虚台",
    level: 15,
    place: "wilderness-or-gate",
    shape: "single",
    actionId: "raise-void-altar",
    label: "立炼虚台",
    jobLabel: "立炼虚台",
    duration: 8,
    baseSuccessRate: 25,
    companionRate: 8,
    successInjuryAlone: 0,
    successInjuryShared: 0,
    failInjuryAlone: 10,
    failInjuryShared: 6,
    failDeviation: 8,
    companionFailInjury: 2,
    generics: VOID_GENERICS,
    special: "void-altar-seal",
    description: (company) => company
      ? `在这里把炼虚台立起来。可能失败。${company}在这一处，台要是塌了会分掉一点，成功率也高一点。`
      : "在这里把炼虚台立起来。可能失败。一个人立，塌的时候伤更重。有同伴在同一处，会分掉一点。",
    successLife: (name) => `${name}把炼虚台立住了，进了炼虚。气血和灵力都涨了一截。炼虚的兵器和功法这才装备得上，坊市不卖。`,
    failureLife: (name, company) => company
      ? `${name}没能把炼虚台立住。${company}在旁边分了一道反噬。材料没了，进度退到六成，两个人都挂了伤，气息也乱了一阵。`
      : `${name}没能把炼虚台立住。台是一个人扛的，材料没了，进度退到六成，伤得很重，气息也乱了一阵。`,
    companionLife: (companion, name) => `${companion}在${name}的炼虚台边分了一道反噬，挂了一点伤。`,
    wrongPlace: "炼虚台要在荒野或甲级地宫门口立。驻地和洞府接不住这一座台。",
    risk: "这是大境界，基础成功率大约 25。失败会耗掉材料，进度退到六成，并留下伤和一段走火。一个人立，伤更重。有同伴在同一处，成功率高一点，反噬也会分掉一点，同伴会挂一点伤。",
    help: "可以一个人立。有同伴在同一处，反噬会分掉一点，成功率也高一点。",
    sequence: [
      "到荒野，或站到甲级地宫门口，把炼虚台立起来。",
      "化神后期不守神台。这一阶不在宗门驻地，也不在洞府里破。",
      "有同伴在同一处，台塌的时候会分掉一点。",
    ],
    refusal: "化神后期要立炼虚台，不守神台。到荒野或甲级地宫门口。",
    quiet: "化神后期要到荒野或甲级地宫门口立炼虚台。这一次可能失败，材料会没，人会受伤。有同伴在场，台塌的时候会分掉一点。成了才进入炼虚。炼虚的兵器和功法要到了那一境才装备得上，坊市不卖。",
    where: `${VOID_WHERE}这一阶用的是炼虚金印。`,
    outcome: "进入炼虚前期。气血和灵力会再涨一截。炼虚的兵器和功法可以装备，坊市不卖。本州的名声会动一动。",
  },
  {
    method: "void-seal",
    name: "虚空印",
    level: 16,
    place: "sect",
    shape: "open-then-seal",
    openActionId: "begin-void-seal",
    actionId: "seal-void-seal",
    openLabel: "拓开虚空印",
    openDescription: "在宗门驻地把虚空印拓开，六个时辰。印还在的时候按实。这一步不耗材料。",
    label: "按实虚空印",
    openJobLabel: "拓开虚空印",
    jobLabel: "按实虚空印",
    duration: 6,
    baseSuccessRate: null,
    companionRate: 0,
    successInjuryAlone: 4,
    successInjuryShared: 0,
    failInjuryAlone: 0,
    failInjuryShared: 0,
    failDeviation: 0,
    companionFailInjury: 0,
    generics: VOID_GENERICS,
    special: "void-imprint-dew",
    description: (company) => company
      ? `虚空印还拓着。这一步按实，材料现在才耗。${company}在场看着，印会落稳。`
      : "虚空印还拓着。这一步按实，材料现在才耗。现在没有旁人。一个人按实也能成，空印会反噬，人会挂一点伤。",
    successLife: (name, company) => company
      ? `${name}在${company}看着的时候把虚空印按实了。炼虚又往前了一层。`
      : `${name}一个人把虚空印按实了。印是成了，反噬也挂上了一点伤。`,
    failureLife: (name) => `${name}这一次没有按实虚空印。`,
    openSentence: (name) => `${name}在宗门驻地把虚空印拓开了。八个时辰之内按实。材料还在身上。`,
    sealSummary: (name) => `${name}把虚空印按实了。`,
    wrongPlace: "虚空印要在宗门驻地拓开、按实。先到驻地。",
    riteCold: "虚空印已经散了。材料还在，重新拓一次。",
    riteMissing: "虚空印还没拓开。先把印拓开。",
    risk: "这一阶是小突破，虚空印按实就会成。有人在场看着，印落得稳。一个人按实也能成，空印会反噬，人会挂一点伤。",
    help: "可以一个人按实，但会挂一点伤。有人在场看着，印落得稳。",
    sequence: [
      "到宗门驻地，先把虚空印拓开。",
      "印还在的时候按实。有人看着会稳。一个人按实会挂一点伤，境界仍然过去。虚空印露在按实的时候才耗。",
      "这是炼虚前期。中期不在驻地落印，要到荒野或甲级门口走碎虚阵。",
    ],
    refusal: "炼虚前期要在宗门驻地落虚空印。先拓开，再按实。这一阶不立炼虚台。",
    quiet: "已经是炼虚前期。到宗门驻地拓开虚空印，印还在再按实。虚空印露要到凉州或雷州的灵脉去收。一个人按实会挂一点伤。中期再去走碎虚阵。",
    where: `${VOID_WHERE}这一阶用的是虚空印露。闭关改用虚纹雾。`,
    outcome: "仍在炼虚里往前一层。气血和灵力继续涨。炼虚的兵器和功法保持能装备，坊市不卖。",
  },
  {
    method: "void-array",
    name: "碎虚阵",
    level: 17,
    place: "wilderness-or-gate",
    shape: "single",
    actionId: "break-void-array",
    label: "走碎虚阵",
    jobLabel: "走碎虚阵",
    duration: 8,
    baseSuccessRate: null,
    companionRate: 0,
    successInjuryAlone: 4,
    successInjuryShared: 0,
    failInjuryAlone: 0,
    failInjuryShared: 0,
    failDeviation: 0,
    companionFailInjury: 0,
    generics: VOID_GENERICS,
    special: "shattered-array-banner",
    description: (company) => company
      ? `在这里把碎虚阵走完。材料会在阵成时耗掉。这一阶会成。${company}在这一处看着，走完不挂这点伤。`
      : "在这里把碎虚阵走完。材料会在阵成时耗掉。这一阶会成。一个人走完，阵会反咬一下，人挂一点伤。有人在同一处看着，伤就不必挂。",
    successLife: (name, company) => company
      ? `${name}在${company}看着的时候把碎虚阵走完了。阵没有反咬，人没有挂伤，炼虚又往前了一层。`
      : `${name}一个人把碎虚阵走完了。阵反咬了一下，人挂了一点伤，这一层还是过去了。`,
    failureLife: (name) => `${name}这一次没有走完碎虚阵。`,
    wrongPlace: "碎虚阵要在荒野，或甲级地宫门口走。驻地里的虚空印已经按过了。",
    risk: "这一阶是小突破，碎虚阵走完就会成。一个人走，阵会反咬一下，人挂一点伤。有人在旁边看着，伤就不必挂。",
    help: "可以一个人走，但会挂一点伤。有人在同一处看着，阵就稳。",
    sequence: [
      "到荒野，或站到甲级地宫门口，把碎虚阵走完。",
      "碎虚阵旗仍从凉州或雷州的灵脉来。前期的虚空印已经按过。这一阶不在宗门驻地落印。",
    ],
    refusal: "炼虚中期要走碎虚阵，不在驻地落虚空印。到荒野或甲级地宫门口。",
    quiet: "炼虚中期要到荒野或甲级地宫门口走碎虚阵。碎虚阵旗仍从凉州或雷州的灵脉来。一个人走完会挂一点伤，有人在旁边看着就稳。这一阶会成。",
    where: `${VOID_WHERE}这一阶用的是碎虚阵旗。`,
    outcome: "仍在炼虚里往前一层。炼虚后期再去宗门驻地走合道仪。炼虚的兵器和功法保持能装备，坊市不卖。",
  },
  {
    method: "unity-rite",
    name: "合道仪",
    level: 18,
    place: "sect",
    shape: "single",
    actionId: "hold-unity-rite",
    label: "走合道仪",
    jobLabel: "走合道仪",
    duration: 10,
    baseSuccessRate: 22,
    companionRate: 10,
    successInjuryAlone: 0,
    successInjuryShared: 0,
    failInjuryAlone: 8,
    failInjuryShared: 8,
    failDeviation: 8,
    companionFailInjury: 0,
    generics: UNITY_GENERICS,
    special: "unity-rite-slip",
    description: (company) => company
      ? `在宗门驻地把合道仪走完。可能失败。${company}在这一处看着，成功率会高一截。失败的伤不往旁人身上分。`
      : "在宗门驻地把合道仪走完。可能失败。一个人也能走。有人在同一处看着，成功率会高一截。",
    successLife: (name) => `${name}把合道仪走完了，进了合体。气血和灵力都涨了一截。合体的兵器和功法这才装备得上，坊市不卖。`,
    failureLife: (name, company) => company
      ? `${name}的合道没有接上。${company}在旁边看着，伤没有分过去。材料没了，进度退到六成，人受了伤，气息也乱了一阵。`
      : `${name}的合道没有接上。材料没了，进度退到六成，人受了伤，气息也乱了一阵。`,
    wrongPlace: "合道仪要在宗门驻地走。荒野和洞府接不住这一仪。",
    risk: "这是大境界，基础成功率大约 22。失败会耗掉材料，进度退到六成，并留下伤和一段走火。有人在同一处看着，成功率会高一截。失败的伤不往旁人身上分。",
    help: "可以一个人走。有人在同一处看着，成功率会高一截。",
    sequence: [
      "材料齐了，到宗门驻地走合道仪。",
      "炼虚后期不在荒野立台，也不在洞府里破。",
      "有人看着，成功率会高一截。",
    ],
    refusal: "炼虚后期要走合道仪，不在荒野碎阵。到宗门驻地。",
    quiet: "下一阶是合体。到凉州或雷州的灵脉拿合道仪札，然后到宗门驻地走合道仪。这一次可能失败，材料会没，人会受伤。有人看着，成功率会高一截。成了进入合体。合体的兵器和功法这才装备得上，坊市不卖。",
    where: `${UNITY_WHERE}这一阶用的是合道仪札。`,
    outcome: "进入合体前期。气血和灵力会再涨一截。合体的兵器和功法可以装备，坊市不卖。本州的名声会动一动。",
  },
  {
    method: "twin-lamp",
    name: "双魂灯",
    level: 19,
    place: "residence",
    shape: "open-then-seal",
    openActionId: "begin-twin-lamp",
    actionId: "seal-twin-lamp",
    openLabel: "点上双魂灯",
    openDescription: "在自己的洞府点上双魂灯，守六个时辰。灯亮以后的八个时辰里收口。这一步不耗材料。",
    label: "双魂灯收口",
    openJobLabel: "点上双魂灯",
    jobLabel: "双魂灯收口",
    duration: 6,
    baseSuccessRate: null,
    companionRate: 0,
    successInjuryAlone: 0,
    successInjuryShared: 0,
    failInjuryAlone: 0,
    failInjuryShared: 0,
    failDeviation: 0,
    companionFailInjury: 0,
    generics: UNITY_GENERICS,
    special: "twin-lamp-oil",
    description: (company) => company
      ? `双魂灯还亮着。这一步收口，材料现在才耗。${company}也在这洞府里，收口时会记下这个人。`
      : "双魂灯还亮着。这一步收口，材料现在才耗。灯灭了就要重新点。这一阶不挂伤。",
    successLife: (name, company) => company
      ? `${name}在双魂灯下把这一层收了口。${company}也守在这洞府里。合体又稳了一层。`
      : `${name}在双魂灯下把这一层收了口。合体又稳了一层。`,
    failureLife: (name) => `${name}这一次没有收上双魂灯。`,
    openSentence: (name) => `${name}在洞府里点上了双魂灯。八个时辰之内收口。灯灭了就要重新点，材料还在身上。`,
    sealSummary: (name) => `${name}在双魂灯下把这一层收了口。`,
    wrongPlace: "双魂灯要在自己的洞府里点。先回去。",
    riteCold: "双魂灯已经灭了。材料还在，重新点一次。",
    riteMissing: "双魂灯还没点上。先把灯点上。",
    risk: "这一阶是小突破。双魂灯点着的时候收口就会成，也不挂伤。灯灭了不耗材料，重新点一次。",
    help: "可以一个人守。眼前有人的话，收口时会记下这个人。",
    sequence: [
      "回自己的洞府，先点上双魂灯，守六个时辰。",
      "灯还亮着的时候收口。灯灭了就重新点。双魂灯油在收口时才耗，仍从凉州或雷州的灵脉来。",
      "前期的合道仪已经过去。这一阶不在驻地走。合体中期再去合符。",
    ],
    refusal: "合体前期要先点双魂灯。在洞府点上，灯亮着再收口。这一阶不走合道仪。",
    quiet: "合体前期回自己的洞府点双魂灯。先点上，灯还亮着再收口。双魂灯油仍从凉州或雷州的灵脉来。这一阶会成，也不挂伤。中期再去驻地合符。",
    where: `${UNITY_WHERE}这一阶用的是双魂灯油。闭关改用合道露。`,
    outcome: "仍在合体里往前一层。气血和灵力继续涨。合体的兵器和功法保持能装备，坊市不卖。",
  },
  {
    method: "heaven-token",
    name: "天人合符",
    level: 20,
    place: "sect",
    shape: "single",
    actionId: "join-heaven-token",
    label: "合上天人合符",
    jobLabel: "合上天人合符",
    duration: 8,
    baseSuccessRate: null,
    companionRate: 0,
    successInjuryAlone: 4,
    successInjuryShared: 0,
    failInjuryAlone: 0,
    failInjuryShared: 0,
    failDeviation: 0,
    companionFailInjury: 0,
    generics: UNITY_GENERICS,
    special: "heaven-man-token",
    description: (company) => company
      ? `在这里把天人合符合上。材料会在合成时耗掉。这一阶会成。${company}在这一处看着，合完不挂这点伤。`
      : "在这里把天人合符合上。材料会在合成时耗掉。这一阶会成。一个人合，符会咬一下，人挂一点伤。有人在同一处看着，伤就不必挂。",
    successLife: (name, company) => company
      ? `${name}在${company}看着的时候把天人合符合上了。符没有咬人，合体又往前了一层。`
      : `${name}一个人把天人合符合上了。符咬了一下，人挂了一点伤，这一层还是过去了。`,
    failureLife: (name) => `${name}这一次没有合上天人合符。`,
    wrongPlace: "天人合符要在宗门驻地合上。洞府里的双魂灯已经收过了。",
    risk: "这一阶是小突破，天人合符合上就会成。一个人合，符会咬一下，人挂一点伤。有人看着，伤就不必挂。",
    help: "可以一个人合，但会挂一点伤。有人在同一处看着，符就稳。",
    sequence: [
      "到宗门驻地，把天人合符合上。",
      "符仍从凉州或雷州的灵脉来。前期的双魂灯已经收过。这一阶不回洞府点灯。",
    ],
    refusal: "合体中期要合上天人合符，不在洞府点双魂灯。到宗门驻地。",
    quiet: "合体中期要到宗门驻地合上天人合符。符仍从凉州或雷州的灵脉来。一个人合会挂一点伤，有人看着就稳。这一阶会成。后期再去扶天劫柱。",
    where: `${UNITY_WHERE}这一阶用的是天人合符。`,
    outcome: "仍在合体里往前一层。合体后期再去荒野或甲级门口扶天劫柱。合体的兵器和功法保持能装备，坊市不卖。",
  },
  {
    method: "heaven-pillar",
    name: "天劫柱",
    level: 21,
    place: "wilderness-or-gate",
    shape: "single",
    actionId: "face-heaven-pillar",
    label: "扶天劫柱",
    jobLabel: "扶天劫柱",
    duration: 8,
    baseSuccessRate: 20,
    companionRate: 8,
    successInjuryAlone: 0,
    successInjuryShared: 0,
    failInjuryAlone: 10,
    failInjuryShared: 6,
    failDeviation: 8,
    companionFailInjury: 2,
    generics: MAHAYANA_GENERICS,
    special: "heaven-pillar-core",
    description: (company) => company
      ? `在这里扶住天劫柱。可能失败。${company}在这一处，柱上的劫会分掉一点，成功率也高一点。失败时对方也会挂一点伤。`
      : "在这里扶住天劫柱。可能失败。一个人扶，失败时伤更重。有同伴在同一处，劫会分掉一点。",
    successLife: (name) => `${name}把天劫柱扶住了，进了大乘。气血和灵力都涨了一截。大乘的兵器和功法这才装备得上，坊市不卖。`,
    failureLife: (name, company) => company
      ? `${name}没能把天劫柱扶住。${company}在旁边分了一道劫。材料没了，进度退到六成，两个人都挂了伤，气息也乱了一阵。`
      : `${name}没能把天劫柱扶住。柱是一个人扛的，材料没了，进度退到六成，伤得很重，气息也乱了一阵。`,
    companionLife: (companion, name) => `${companion}在${name}的天劫柱边分了一道劫，挂了一点伤。`,
    wrongPlace: "天劫柱要在荒野或甲级地宫门口扶。城里和洞府接不住这一道劫。",
    risk: "这是大境界，基础成功率大约 20。失败会耗掉材料，进度退到六成，并留下伤和一段走火。一个人扶，伤更重。有同伴在同一处，成功率高一点，劫也会分掉一点，同伴会挂一点伤。",
    help: "可以一个人扶。有同伴在同一处，劫会分掉一点，成功率也高一点。",
    sequence: [
      "到荒野，或站到甲级地宫门口，扶住这一次天劫柱。",
      "合体后期不在驻地合符。这一阶不在洞府里破。",
      "有同伴在同一处，柱上的劫会分掉一点。",
    ],
    refusal: "合体后期要扶天劫柱，不在驻地合符。到荒野或甲级地宫门口。",
    quiet: "下一阶是大乘。到凉州或雷州的灵脉拿天劫柱芯，然后到荒野或甲级地宫门口扶天劫柱。这一次可能失败，材料会没，人会受伤。有同伴在场，劫会分掉一点。成了进入大乘。大乘的兵器和功法这才装备得上，坊市不卖。",
    where: `${MAHAYANA_WHERE}这一阶用的是天劫柱芯。`,
    outcome: "进入大乘前期。气血和灵力会再涨一截。大乘的兵器和功法可以装备，坊市不卖。本州的名声会动一动。",
  },
  {
    method: "mahayana-platform",
    name: "大乘劫台",
    level: 22,
    place: "wilderness-or-gate",
    shape: "single",
    actionId: "hold-mahayana-platform",
    label: "守大乘劫台",
    jobLabel: "守大乘劫台",
    duration: 8,
    baseSuccessRate: null,
    companionRate: 0,
    successInjuryAlone: 4,
    successInjuryShared: 0,
    failInjuryAlone: 0,
    failInjuryShared: 0,
    failDeviation: 0,
    companionFailInjury: 0,
    generics: MAHAYANA_GENERICS,
    special: "kalpa-platform-dust",
    description: (company) => company
      ? `在这里把大乘劫台守住。材料会在守成时耗掉。这一阶会成，不再是会失败的那一道劫。${company}在这一处看着，守完不挂这点伤。`
      : "在这里把大乘劫台守住。材料会在守成时耗掉。这一阶会成。一个人守，台会压下来，人挂一点伤。有人在同一处看着，伤就不必挂。",
    successLife: (name, company) => company
      ? `${name}在${company}看着的时候把大乘劫台守住了。台没有压下来，人没有挂伤，大乘又往前了一层。`
      : `${name}一个人把大乘劫台守住了。台压下来一点，人挂了一点伤，这一层还是过去了。`,
    failureLife: (name) => `${name}这一次没有守住大乘劫台。`,
    wrongPlace: "大乘劫台要在荒野，或甲级地宫门口守。驻地里没有这一座台。",
    risk: "这一阶是小突破，劫台守住就会成。一个人守，台会压下来，人挂一点伤。有人在旁边看着，伤就不必挂。",
    help: "可以一个人守，但会挂一点伤。有人在同一处看着，台就稳。",
    sequence: [
      "到荒野，或站到甲级地宫门口，把大乘劫台守住。",
      "劫台尘仍从凉州或雷州的灵脉来。前期的天劫柱已经扶过。这一阶不会再失败。",
    ],
    refusal: "大乘前期要守大乘劫台，不去扶天劫柱。到荒野或甲级地宫门口。",
    quiet: "大乘前期要到荒野或甲级地宫门口守大乘劫台。劫台尘仍从凉州或雷州的灵脉来。一个人守会挂一点伤，有人看着就稳。这一阶会成。中期再去荒野乘风。",
    where: `${MAHAYANA_WHERE}这一阶用的是劫台尘。闭关改用乘风灰。`,
    outcome: "仍在大乘里往前一层。气血和灵力继续涨。大乘的兵器和功法保持能装备，坊市不卖。",
  },
  {
    method: "wind-crossing",
    name: "乘风渡",
    level: 23,
    place: "wilderness",
    shape: "open-then-seal",
    openActionId: "begin-wind-crossing",
    actionId: "seal-wind-crossing",
    openLabel: "迎上这阵风",
    openDescription: "在荒野里先把这阵风迎住，六个时辰。风还在的时候渡过去。这一步不耗材料。甲级门口没有这阵风。",
    label: "乘风渡过去",
    openJobLabel: "迎上这阵风",
    jobLabel: "乘风渡过去",
    duration: 6,
    baseSuccessRate: null,
    companionRate: 0,
    successInjuryAlone: 4,
    successInjuryShared: 0,
    failInjuryAlone: 0,
    failInjuryShared: 0,
    failDeviation: 0,
    companionFailInjury: 0,
    generics: MAHAYANA_GENERICS,
    special: "wind-crossing-sail",
    description: (company) => company
      ? `风还在。这一步渡过去，材料现在才耗。${company}在旁边看着，渡完不挂这点伤。`
      : "风还在。这一步渡过去，材料现在才耗。一个人渡也能成，风会刮一下，人会挂一点伤。",
    successLife: (name, company) => company
      ? `${name}在${company}看着的时候乘风渡了过去。风没有刮人，大乘又往前了一层。`
      : `${name}一个人乘风渡了过去。风刮了一下，人挂了一点伤，这一层还是过去了。`,
    failureLife: (name) => `${name}这一次没有渡过去。`,
    openSentence: (name) => `${name}在荒野里把这阵风迎住了。八个时辰之内渡过去。材料还在身上。`,
    sealSummary: (name) => `${name}乘风渡了过去。`,
    wrongPlace: "乘风渡要在荒野里。先迎风，风还在再渡。甲级门口没有这阵风。",
    riteCold: "这阵风已经过去了。材料还在，重新迎一次。",
    riteMissing: "风还没迎住。先在荒野里把风迎住。",
    risk: "这一阶是小突破，风还在的时候渡过去就会成。一个人渡，风会刮一下，人挂一点伤。有人看着，伤就不必挂。风过了不耗材料，重新迎一次。",
    help: "可以一个人渡，但会挂一点伤。有人在同一处看着，风就稳。",
    sequence: [
      "到荒野，先把这阵风迎住。",
      "风还在的时候渡过去。甲级门口和驻地没有这阵风。乘风帆在渡的时候才耗，仍从凉州或雷州的灵脉来。",
      "前期的劫台已经守过。这一阶不守台。",
    ],
    refusal: "大乘中期要在荒野乘风渡。先迎风，风还在再渡。这一阶不守劫台。",
    quiet: "大乘中期只在荒野乘风渡。先迎风，风还在再渡过去。乘风帆仍从凉州或雷州的灵脉来。一个人渡会挂一点伤。这一阶会成。渡完就是这条梯子的顶。",
    where: `${MAHAYANA_WHERE}这一阶用的是乘风帆。`,
    outcome: "进入大乘后期。这是眼下的顶。大乘的兵器和功法也停在这一档，坊市不卖。",
  },
];

const RITE_BY_LEVEL = new Map(ABOVE_RITES.map((rite) => [rite.level, rite]));

export function aboveRiteForLevel(realmLevel: number): AboveRite | null {
  return RITE_BY_LEVEL.get(Math.floor(realmLevel)) ?? null;
}

export function aboveRiteForAction(actionId: string): AboveRite | null {
  return ABOVE_RITES.find((rite) => rite.actionId === actionId || rite.openActionId === actionId) ?? null;
}

export function aboveMethodId(realmLevel: number): BreakthroughMethodId | null {
  return aboveRiteForLevel(realmLevel)?.method ?? null;
}

export function abovePlaceMatches(place: AbovePlace, nodeType: string, atResidence: boolean): boolean {
  if (place === "residence") return atResidence;
  if (place === "sect") return nodeType === "sect-outpost";
  if (place === "wilderness") return nodeType === "wilderness";
  return nodeType === "wilderness" || nodeType === "dungeon-a";
}

export function aboveTravelNode(place: AbovePlace): "wilderness" | "sect-outpost" | "residence" {
  if (place === "sect") return "sect-outpost";
  if (place === "residence") return "residence";
  return "wilderness";
}

export interface AboveSpiritDefinition {
  category: "minor" | "major";
  targetRealm: RealmStage;
  targetLevel: number;
  marketBuyable: false;
  durationTicks: number;
  baseSuccessRate: number | null;
  genericMaterials: Array<{ itemId: ItemId; count: number }>;
  specialMaterial: { itemId: ItemId; count: number };
}

export function aboveSpiritDefinition(realmLevel: number): AboveSpiritDefinition | null {
  const rite = aboveRiteForLevel(realmLevel);
  if (!rite) return null;
  const targetLevel = rite.level + 1;
  const targetRealm = realmStageForLevel(targetLevel);
  return {
    category: targetRealm === realmStageForLevel(rite.level) ? "minor" : "major",
    targetRealm,
    targetLevel,
    marketBuyable: false,
    durationTicks: rite.duration,
    baseSuccessRate: rite.baseSuccessRate,
    genericMaterials: rite.generics.map((itemId) => ({ itemId, count: 1 })),
    specialMaterial: { itemId: rite.special, count: 1 },
  };
}

export function aboveSpiritNarrative(realmLevel: number, successRate: number | null): {
  id: BreakthroughMethodId;
  name: string;
  risk: string;
  help: string;
  sequence: string[];
  refusal: string;
} | null {
  const rite = aboveRiteForLevel(realmLevel);
  if (!rite) return null;
  const risk = rite.baseSuccessRate !== null && successRate !== null && successRate !== rite.baseSuccessRate
    ? rite.risk.replace(String(rite.baseSuccessRate), String(successRate))
    : rite.risk;
  return {
    id: rite.method,
    name: rite.name,
    risk,
    help: rite.help,
    sequence: rite.sequence,
    refusal: rite.refusal,
  };
}

export function aboveQuietStep(realmLevel: number): string | null {
  return aboveRiteForLevel(realmLevel)?.quiet ?? null;
}

export function aboveSpiritWhere(realmLevel: number): string {
  return aboveRiteForLevel(realmLevel)?.where ?? "";
}

export function aboveSpiritOutcome(realmLevel: number): string {
  return aboveRiteForLevel(realmLevel)?.outcome ?? "";
}

export const VOID_GATHER_IDS = [
  ...VOID_GENERICS,
  "void-altar-seal",
  "void-imprint-dew",
  "shattered-array-banner",
  "void-nourish-mist",
] as const satisfies readonly ItemId[];

export const UNITY_GATHER_IDS = [
  ...UNITY_GENERICS,
  "unity-rite-slip",
  "twin-lamp-oil",
  "heaven-man-token",
  "unity-nourish-dew",
] as const satisfies readonly ItemId[];

export const MAHAYANA_GATHER_IDS = [
  ...MAHAYANA_GENERICS,
  "heaven-pillar-core",
  "kalpa-platform-dust",
  "wind-crossing-sail",
  "mahayana-nourish-ash",
] as const satisfies readonly ItemId[];

function hashString(input: string): number {
  return Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

export function aboveSpiritGatherPool(realmLevel: number): readonly ItemId[] | null {
  const level = Math.floor(realmLevel);
  if (level < 15) return null;
  if (level >= 21) return MAHAYANA_GATHER_IDS;
  if (level >= 18) return UNITY_GATHER_IDS;
  return VOID_GATHER_IDS;
}

export function aboveSpiritGatherItem(realmLevel: number, seed: string): ItemId | null {
  const pool = aboveSpiritGatherPool(realmLevel);
  if (!pool || pool.length === 0) return null;
  return pool[hashString(seed) % pool.length]!;
}

export function aboveSpiritResourceLine(realmLevel: number): string | null {
  const level = Math.max(1, Math.floor(realmLevel));
  if (level >= 24) {
    return "大乘后期没有更高的境界。凉州和雷州的灵脉仍会分出乘风灰。大乘的兵器和功法也停在这一档，坊市不卖。";
  }
  if (level >= 22) {
    return "大乘的破境灵材和闭关用的乘风灰，都在凉州或雷州的灵脉。人到了合体后期，入了当地山门，把灵脉护下来再收，才会在化神那一份之外多出这一档。手里有乘风灰，闭关会用上一份。没有也能照常闭关。大乘的兵器和功法坊市不卖，灵脉和甲级七层到九层会再分出锻材或残页。";
  }
  if (level >= 19) {
    return "合体的破境灵材和闭关用的合道露，都在凉州或雷州的灵脉。人到了炼虚后期再去收，才会多出这一档。手里有合道露，闭关会用上一份。没有也能照常闭关。合体的兵器和功法坊市不卖，灵脉和甲级七层到九层会再分出锻材或残页。";
  }
  if (level >= 16) {
    return "炼虚的破境灵材和闭关用的虚纹雾，都在凉州或雷州的灵脉。化神后期就能去收。手里有虚纹雾，闭关会用上一份。没有也能照常闭关。得到炼虚以后，兵器和功法换到这一档，坊市不卖。";
  }
  if (level >= 15) {
    return "化神后期要立炼虚台。炼虚的灵材在凉州或雷州的灵脉，入了当地山门、把脉护下来再收，会在化神那一份之外多出来。手里的神纹尘还能用来闭关。兵器和功法仍是化神这一档，进了炼虚才换新的。";
  }
  return null;
}

import type { WeaponLoadoutId, SpellLoadoutId, LocalizedText } from "../model.js";
import { makeLocalizedText } from "./shared.js";

export const WEAPON_LOADOUT_NAME_BY_ID: Record<WeaponLoadoutId, LocalizedText> = {
  // ── Swords ──
  ["starter-sword" as WeaponLoadoutId]: makeLocalizedText("木锋剑", "Wooden Edge Sword"),
  ["sword-tier-2" as WeaponLoadoutId]: makeLocalizedText("青钢剑", "Green Steel Sword"),
  ["sword-tier-3" as WeaponLoadoutId]: makeLocalizedText("寒星剑", "Cold Star Sword"),
  ["sword-tier-4" as WeaponLoadoutId]: makeLocalizedText("游龙剑", "Roaming Dragon Sword"),
  ["sword-tier-5" as WeaponLoadoutId]: makeLocalizedText("天游剑", "Skybound Sword"),

  // ── Dual Swords ──
  ["starter-dual-swords" as WeaponLoadoutId]: makeLocalizedText("归燕双剑", "Returning Swallow Twin Swords"),
  ["dual-swords-tier-2" as WeaponLoadoutId]: makeLocalizedText("流光双剑", "Flowing Light Twin Swords"),
  ["dual-swords-tier-3" as WeaponLoadoutId]: makeLocalizedText("逐月双剑", "Moon Chaser Twin Swords"),
  ["dual-swords-tier-4" as WeaponLoadoutId]: makeLocalizedText("断水双剑", "Water Splitter Twin Swords"),
  ["dual-swords-tier-5" as WeaponLoadoutId]: makeLocalizedText("天衡双剑", "Celestial Balance Twin Swords"),

  // ── Daggers ──
  ["starter-dagger" as WeaponLoadoutId]: makeLocalizedText("藏锋匕", "Hidden Edge Dagger"),
  ["dagger-tier-2" as WeaponLoadoutId]: makeLocalizedText("破影匕", "Shadow Breaker Dagger"),
  ["dagger-tier-3" as WeaponLoadoutId]: makeLocalizedText("夜行匕", "Nightwalker Dagger"),
  ["dagger-tier-4" as WeaponLoadoutId]: makeLocalizedText("追魂匕", "Soul Chaser Dagger"),
  ["dagger-tier-5" as WeaponLoadoutId]: makeLocalizedText("星陨匕", "Starfall Dagger"),

  // ── Gauntlets ──
  ["starter-gauntlets" as WeaponLoadoutId]: makeLocalizedText("练骨拳套", "Bone Tempering Gauntlets"),
  ["gauntlets-tier-2" as WeaponLoadoutId]: makeLocalizedText("震脉拳套", "Pulse Shaker Gauntlets"),
  ["gauntlets-tier-3" as WeaponLoadoutId]: makeLocalizedText("裂石拳套", "Stone Splitter Gauntlets"),
  ["gauntlets-tier-4" as WeaponLoadoutId]: makeLocalizedText("伏龙拳套", "Dragon Tamer Gauntlets"),
  ["gauntlets-tier-5" as WeaponLoadoutId]: makeLocalizedText("镇岳拳套", "Mountain Warden Gauntlets"),

  // ── Sabers ──
  ["starter-saber" as WeaponLoadoutId]: makeLocalizedText("雁翎刀", "Goose Feather Saber"),
  ["saber-tier-2" as WeaponLoadoutId]: makeLocalizedText("玄铁刀", "Dark Iron Saber"),
  ["saber-tier-3" as WeaponLoadoutId]: makeLocalizedText("赤纹刀", "Crimson Vein Saber"),
  ["saber-tier-4" as WeaponLoadoutId]: makeLocalizedText("断岳刀", "Peak Cleaver Saber"),
  ["saber-tier-5" as WeaponLoadoutId]: makeLocalizedText("天问刀", "Heavenly Inquiry Saber"),

  // ── Greatsabers ──
  ["starter-greatsaber" as WeaponLoadoutId]: makeLocalizedText("开山巨刀", "Mountain Opener Greatsaber"),
  ["greatsaber-tier-2" as WeaponLoadoutId]: makeLocalizedText("断岭巨刀", "Ridge Splitter Greatsaber"),
  ["greatsaber-tier-3" as WeaponLoadoutId]: makeLocalizedText("镇关巨刀", "Gate Warden Greatsaber"),
  ["greatsaber-tier-4" as WeaponLoadoutId]: makeLocalizedText("裂岳巨刀", "Peak Shatter Greatsaber"),
  ["greatsaber-tier-5" as WeaponLoadoutId]: makeLocalizedText("霸川巨刀", "River Conqueror Greatsaber"),

  // ── Axes ──
  ["starter-axe" as WeaponLoadoutId]: makeLocalizedText("劈林斧", "Forest Hewer Axe"),
  ["axe-tier-2" as WeaponLoadoutId]: makeLocalizedText("断岩斧", "Rock Breaker Axe"),
  ["axe-tier-3" as WeaponLoadoutId]: makeLocalizedText("裂阵斧", "Formation Shatter Axe"),
  ["axe-tier-4" as WeaponLoadoutId]: makeLocalizedText("震山斧", "Mountain Quake Axe"),
  ["axe-tier-5" as WeaponLoadoutId]: makeLocalizedText("开天斧", "Heaven Cleaver Axe"),

  // ── Hammers ──
  ["starter-hammer" as WeaponLoadoutId]: makeLocalizedText("碎石锤", "Stone Crusher Hammer"),
  ["hammer-tier-2" as WeaponLoadoutId]: makeLocalizedText("震骨锤", "Bone Shaker Hammer"),
  ["hammer-tier-3" as WeaponLoadoutId]: makeLocalizedText("撼岳锤", "Peak Tremor Hammer"),
  ["hammer-tier-4" as WeaponLoadoutId]: makeLocalizedText("镇关锤", "Gate Guardian Hammer"),
  ["hammer-tier-5" as WeaponLoadoutId]: makeLocalizedText("玄岳锤", "Mystic Peak Hammer"),

  // ── Spears ──
  ["starter-spear" as WeaponLoadoutId]: makeLocalizedText("白蜡枪", "White Wax Spear"),
  ["spear-tier-2" as WeaponLoadoutId]: makeLocalizedText("穿云枪", "Cloud Piercer Spear"),
  ["spear-tier-3" as WeaponLoadoutId]: makeLocalizedText("逐星枪", "Star Chaser Spear"),
  ["spear-tier-4" as WeaponLoadoutId]: makeLocalizedText("断潮枪", "Tide Breaker Spear"),
  ["spear-tier-5" as WeaponLoadoutId]: makeLocalizedText("天游枪", "Skybound Spear"),

  // ── Halberds ──
  ["starter-halberd" as WeaponLoadoutId]: makeLocalizedText("月牙戟", "Crescent Halberd"),
  ["halberd-tier-2" as WeaponLoadoutId]: makeLocalizedText("玄锋戟", "Dark Edge Halberd"),
  ["halberd-tier-3" as WeaponLoadoutId]: makeLocalizedText("破军戟", "Army Breaker Halberd"),
  ["halberd-tier-4" as WeaponLoadoutId]: makeLocalizedText("镇河戟", "River Warden Halberd"),
  ["halberd-tier-5" as WeaponLoadoutId]: makeLocalizedText("天阙戟", "Celestial Gate Halberd"),

  // ── Staffs ──
  ["starter-staff" as WeaponLoadoutId]: makeLocalizedText("青藤棍", "Green Vine Staff"),
  ["staff-tier-2" as WeaponLoadoutId]: makeLocalizedText("乌木棍", "Ebony Staff"),
  ["staff-tier-3" as WeaponLoadoutId]: makeLocalizedText("沉水棍", "Ironwood Staff"),
  ["staff-tier-4" as WeaponLoadoutId]: makeLocalizedText("流云棍", "Flowing Cloud Staff"),
  ["staff-tier-5" as WeaponLoadoutId]: makeLocalizedText("镇海棍", "Sea Warden Staff"),

  // ── Hook Sickles ──
  ["starter-hook-sickle" as WeaponLoadoutId]: makeLocalizedText("飞钩镰", "Flying Hook Sickle"),
  ["hook-sickle-tier-2" as WeaponLoadoutId]: makeLocalizedText("断索镰", "Chain Cutter Sickle"),
  ["hook-sickle-tier-3" as WeaponLoadoutId]: makeLocalizedText("穿林镰", "Forest Piercer Sickle"),
  ["hook-sickle-tier-4" as WeaponLoadoutId]: makeLocalizedText("逐月镰", "Moon Chaser Sickle"),
  ["hook-sickle-tier-5" as WeaponLoadoutId]: makeLocalizedText("天罗镰", "Celestial Net Sickle"),

  // ── Whips ──
  ["starter-whip" as WeaponLoadoutId]: makeLocalizedText("软藤鞭", "Soft Vine Whip"),
  ["whip-tier-2" as WeaponLoadoutId]: makeLocalizedText("青鳞鞭", "Green Scale Whip"),
  ["whip-tier-3" as WeaponLoadoutId]: makeLocalizedText("逐风鞭", "Wind Chaser Whip"),
  ["whip-tier-4" as WeaponLoadoutId]: makeLocalizedText("断潮鞭", "Tide Breaker Whip"),
  ["whip-tier-5" as WeaponLoadoutId]: makeLocalizedText("游龙鞭", "Roaming Dragon Whip"),

  // ── Chain Blades ──
  ["starter-chain-blade" as WeaponLoadoutId]: makeLocalizedText("链牙刃", "Chain Fang Blade"),
  ["chain-blade-tier-2" as WeaponLoadoutId]: makeLocalizedText("追星链刃", "Star Chaser Chain Blade"),
  ["chain-blade-tier-3" as WeaponLoadoutId]: makeLocalizedText("玄锁链刃", "Mystic Lock Chain Blade"),
  ["chain-blade-tier-4" as WeaponLoadoutId]: makeLocalizedText("破空链刃", "Void Breaker Chain Blade"),
  ["chain-blade-tier-5" as WeaponLoadoutId]: makeLocalizedText("天狩链刃", "Celestial Hunt Chain Blade"),

  // ── Meteor Hammers ──
  ["starter-meteor-hammer" as WeaponLoadoutId]: makeLocalizedText("流火锤", "Flowing Fire Meteor Hammer"),
  ["meteor-hammer-tier-2" as WeaponLoadoutId]: makeLocalizedText("碎岩流星锤", "Rock Shatter Meteor Hammer"),
  ["meteor-hammer-tier-3" as WeaponLoadoutId]: makeLocalizedText("断岳流星锤", "Peak Breaker Meteor Hammer"),
  ["meteor-hammer-tier-4" as WeaponLoadoutId]: makeLocalizedText("镇河流星锤", "River Warden Meteor Hammer"),
  ["meteor-hammer-tier-5" as WeaponLoadoutId]: makeLocalizedText("天坠流星锤", "Skyfall Meteor Hammer"),

  // ── Silk Ribbons ──
  ["starter-silk-ribbon" as WeaponLoadoutId]: makeLocalizedText("绮罗绫", "Silken Gauze Ribbon"),
  ["silk-ribbon-tier-2" as WeaponLoadoutId]: makeLocalizedText("流霞绫", "Flowing Dawn Ribbon"),
  ["silk-ribbon-tier-3" as WeaponLoadoutId]: makeLocalizedText("织月绫", "Moonweave Ribbon"),
  ["silk-ribbon-tier-4" as WeaponLoadoutId]: makeLocalizedText("天纱绫", "Celestial Silk Ribbon"),
  ["silk-ribbon-tier-5" as WeaponLoadoutId]: makeLocalizedText("归元绫", "Origin Return Ribbon"),

  // ── Bows ──
  ["starter-bow" as WeaponLoadoutId]: makeLocalizedText("桑木弓", "Mulberry Bow"),
  ["bow-tier-2" as WeaponLoadoutId]: makeLocalizedText("雕翎弓", "Eagle Feather Bow"),
  ["bow-tier-3" as WeaponLoadoutId]: makeLocalizedText("追月弓", "Moon Chaser Bow"),
  ["bow-tier-4" as WeaponLoadoutId]: makeLocalizedText("穿云弓", "Cloud Piercer Bow"),
  ["bow-tier-5" as WeaponLoadoutId]: makeLocalizedText("落星弓", "Starfall Bow"),

  // ── Crossbows ──
  ["starter-crossbow" as WeaponLoadoutId]: makeLocalizedText("机括弩", "Mechanism Crossbow"),
  ["crossbow-tier-2" as WeaponLoadoutId]: makeLocalizedText("追电弩", "Lightning Chaser Crossbow"),
  ["crossbow-tier-3" as WeaponLoadoutId]: makeLocalizedText("穿甲弩", "Armor Piercer Crossbow"),
  ["crossbow-tier-4" as WeaponLoadoutId]: makeLocalizedText("震岳弩", "Peak Shaker Crossbow"),
  ["crossbow-tier-5" as WeaponLoadoutId]: makeLocalizedText("天工弩", "Divine Craft Crossbow"),

  // ── Fans ──
  ["starter-fan" as WeaponLoadoutId]: makeLocalizedText("纸骨扇", "Paper Frame Fan"),
  ["fan-tier-2" as WeaponLoadoutId]: makeLocalizedText("青羽扇", "Green Plume Fan"),
  ["fan-tier-3" as WeaponLoadoutId]: makeLocalizedText("断流扇", "Stream Cutter Fan"),
  ["fan-tier-4" as WeaponLoadoutId]: makeLocalizedText("玄光扇", "Mystic Light Fan"),
  ["fan-tier-5" as WeaponLoadoutId]: makeLocalizedText("云阙扇", "Cloud Palace Fan"),

  // ── Umbrellas ──
  ["starter-umbrella" as WeaponLoadoutId]: makeLocalizedText("油纸伞", "Oiled Paper Umbrella"),
  ["umbrella-tier-2" as WeaponLoadoutId]: makeLocalizedText("玄骨伞", "Dark Bone Umbrella"),
  ["umbrella-tier-3" as WeaponLoadoutId]: makeLocalizedText("流云伞", "Flowing Cloud Umbrella"),
  ["umbrella-tier-4" as WeaponLoadoutId]: makeLocalizedText("护心伞", "Heart Guard Umbrella"),
  ["umbrella-tier-5" as WeaponLoadoutId]: makeLocalizedText("天幕伞", "Celestial Canopy Umbrella"),
} as Record<WeaponLoadoutId, LocalizedText>;

export const SPELL_LOADOUT_NAME_BY_ID: Record<SpellLoadoutId, LocalizedText> = {
  // ── Metal · Keen Edge ──
  ["starter-metal-edge" as SpellLoadoutId]: makeLocalizedText("金·锋刃·入门篇", "Metal · Keen Edge · Primer"),
  ["metal-edge-tier-2" as SpellLoadoutId]: makeLocalizedText("金·锋刃·熟练篇", "Metal · Keen Edge · Adept"),
  ["metal-edge-tier-3" as SpellLoadoutId]: makeLocalizedText("金·锋刃·精修篇", "Metal · Keen Edge · Refined"),
  ["metal-edge-tier-4" as SpellLoadoutId]: makeLocalizedText("金·锋刃·真诀篇", "Metal · Keen Edge · Arcane"),
  ["metal-edge-tier-5" as SpellLoadoutId]: makeLocalizedText("金·锋刃·秘传篇", "Metal · Keen Edge · Esoteric"),

  // ── Metal · Qi Ward ──
  ["starter-metal-guard" as SpellLoadoutId]: makeLocalizedText("金·罡御·入门篇", "Metal · Qi Ward · Primer"),
  ["metal-guard-tier-2" as SpellLoadoutId]: makeLocalizedText("金·罡御·熟练篇", "Metal · Qi Ward · Adept"),
  ["metal-guard-tier-3" as SpellLoadoutId]: makeLocalizedText("金·罡御·精修篇", "Metal · Qi Ward · Refined"),
  ["metal-guard-tier-4" as SpellLoadoutId]: makeLocalizedText("金·罡御·真诀篇", "Metal · Qi Ward · Arcane"),
  ["metal-guard-tier-5" as SpellLoadoutId]: makeLocalizedText("金·罡御·秘传篇", "Metal · Qi Ward · Esoteric"),

  // ── Metal · Seal Break ──
  ["starter-metal-break" as SpellLoadoutId]: makeLocalizedText("金·破禁·入门篇", "Metal · Seal Break · Primer"),
  ["metal-break-tier-2" as SpellLoadoutId]: makeLocalizedText("金·破禁·熟练篇", "Metal · Seal Break · Adept"),
  ["metal-break-tier-3" as SpellLoadoutId]: makeLocalizedText("金·破禁·精修篇", "Metal · Seal Break · Refined"),
  ["metal-break-tier-4" as SpellLoadoutId]: makeLocalizedText("金·破禁·真诀篇", "Metal · Seal Break · Arcane"),
  ["metal-break-tier-5" as SpellLoadoutId]: makeLocalizedText("金·破禁·秘传篇", "Metal · Seal Break · Esoteric"),

  // ── Wood · Vitality ──
  ["starter-wood-growth" as SpellLoadoutId]: makeLocalizedText("木·生息·入门篇", "Wood · Vitality · Primer"),
  ["wood-growth-tier-2" as SpellLoadoutId]: makeLocalizedText("木·生息·熟练篇", "Wood · Vitality · Adept"),
  ["wood-growth-tier-3" as SpellLoadoutId]: makeLocalizedText("木·生息·精修篇", "Wood · Vitality · Refined"),
  ["wood-growth-tier-4" as SpellLoadoutId]: makeLocalizedText("木·生息·真诀篇", "Wood · Vitality · Arcane"),
  ["wood-growth-tier-5" as SpellLoadoutId]: makeLocalizedText("木·生息·秘传篇", "Wood · Vitality · Esoteric"),

  // ── Wood · Binding Vine ──
  ["starter-wood-bind" as SpellLoadoutId]: makeLocalizedText("木·缠束·入门篇", "Wood · Binding Vine · Primer"),
  ["wood-bind-tier-2" as SpellLoadoutId]: makeLocalizedText("木·缠束·熟练篇", "Wood · Binding Vine · Adept"),
  ["wood-bind-tier-3" as SpellLoadoutId]: makeLocalizedText("木·缠束·精修篇", "Wood · Binding Vine · Refined"),
  ["wood-bind-tier-4" as SpellLoadoutId]: makeLocalizedText("木·缠束·真诀篇", "Wood · Binding Vine · Arcane"),
  ["wood-bind-tier-5" as SpellLoadoutId]: makeLocalizedText("木·缠束·秘传篇", "Wood · Binding Vine · Esoteric"),

  // ── Wood · Lush Bloom ──
  ["starter-wood-bloom" as SpellLoadoutId]: makeLocalizedText("木·丰茂·入门篇", "Wood · Lush Bloom · Primer"),
  ["wood-bloom-tier-2" as SpellLoadoutId]: makeLocalizedText("木·丰茂·熟练篇", "Wood · Lush Bloom · Adept"),
  ["wood-bloom-tier-3" as SpellLoadoutId]: makeLocalizedText("木·丰茂·精修篇", "Wood · Lush Bloom · Refined"),
  ["wood-bloom-tier-4" as SpellLoadoutId]: makeLocalizedText("木·丰茂·真诀篇", "Wood · Lush Bloom · Arcane"),
  ["wood-bloom-tier-5" as SpellLoadoutId]: makeLocalizedText("木·丰茂·秘传篇", "Wood · Lush Bloom · Esoteric"),

  // ── Water · Frost Stream ──
  ["starter-water-frost" as SpellLoadoutId]: makeLocalizedText("水·寒流·入门篇", "Water · Frost Stream · Primer"),
  ["water-frost-tier-2" as SpellLoadoutId]: makeLocalizedText("水·寒流·熟练篇", "Water · Frost Stream · Adept"),
  ["water-frost-tier-3" as SpellLoadoutId]: makeLocalizedText("水·寒流·精修篇", "Water · Frost Stream · Refined"),
  ["water-frost-tier-4" as SpellLoadoutId]: makeLocalizedText("水·寒流·真诀篇", "Water · Frost Stream · Arcane"),
  ["water-frost-tier-5" as SpellLoadoutId]: makeLocalizedText("水·寒流·秘传篇", "Water · Frost Stream · Esoteric"),

  // ── Water · Mirage Flow ──
  ["starter-water-illusion" as SpellLoadoutId]: makeLocalizedText("水·幻流·入门篇", "Water · Mirage Flow · Primer"),
  ["water-illusion-tier-2" as SpellLoadoutId]: makeLocalizedText("水·幻流·熟练篇", "Water · Mirage Flow · Adept"),
  ["water-illusion-tier-3" as SpellLoadoutId]: makeLocalizedText("水·幻流·精修篇", "Water · Mirage Flow · Refined"),
  ["water-illusion-tier-4" as SpellLoadoutId]: makeLocalizedText("水·幻流·真诀篇", "Water · Mirage Flow · Arcane"),
  ["water-illusion-tier-5" as SpellLoadoutId]: makeLocalizedText("水·幻流·秘传篇", "Water · Mirage Flow · Esoteric"),

  // ── Water · Gentle Tide ──
  ["starter-water-flow" as SpellLoadoutId]: makeLocalizedText("水·润泽·入门篇", "Water · Gentle Tide · Primer"),
  ["water-flow-tier-2" as SpellLoadoutId]: makeLocalizedText("水·润泽·熟练篇", "Water · Gentle Tide · Adept"),
  ["water-flow-tier-3" as SpellLoadoutId]: makeLocalizedText("水·润泽·精修篇", "Water · Gentle Tide · Refined"),
  ["water-flow-tier-4" as SpellLoadoutId]: makeLocalizedText("水·润泽·真诀篇", "Water · Gentle Tide · Arcane"),
  ["water-flow-tier-5" as SpellLoadoutId]: makeLocalizedText("水·润泽·秘传篇", "Water · Gentle Tide · Esoteric"),

  // ── Fire · Fierce Blaze ──
  ["starter-fire-blaze" as SpellLoadoutId]: makeLocalizedText("火·炽焰·入门篇", "Fire · Fierce Blaze · Primer"),
  ["fire-blaze-tier-2" as SpellLoadoutId]: makeLocalizedText("火·炽焰·熟练篇", "Fire · Fierce Blaze · Adept"),
  ["fire-blaze-tier-3" as SpellLoadoutId]: makeLocalizedText("火·炽焰·精修篇", "Fire · Fierce Blaze · Refined"),
  ["fire-blaze-tier-4" as SpellLoadoutId]: makeLocalizedText("火·炽焰·真诀篇", "Fire · Fierce Blaze · Arcane"),
  ["fire-blaze-tier-5" as SpellLoadoutId]: makeLocalizedText("火·炽焰·秘传篇", "Fire · Fierce Blaze · Esoteric"),

  // ── Fire · Flash Burn ──
  ["starter-fire-burst" as SpellLoadoutId]: makeLocalizedText("火·激燃·入门篇", "Fire · Flash Burn · Primer"),
  ["fire-burst-tier-2" as SpellLoadoutId]: makeLocalizedText("火·激燃·熟练篇", "Fire · Flash Burn · Adept"),
  ["fire-burst-tier-3" as SpellLoadoutId]: makeLocalizedText("火·激燃·精修篇", "Fire · Flash Burn · Refined"),
  ["fire-burst-tier-4" as SpellLoadoutId]: makeLocalizedText("火·激燃·真诀篇", "Fire · Flash Burn · Arcane"),
  ["fire-burst-tier-5" as SpellLoadoutId]: makeLocalizedText("火·激燃·秘传篇", "Fire · Flash Burn · Esoteric"),

  // ── Fire · Forge Fire ──
  ["starter-fire-smelt" as SpellLoadoutId]: makeLocalizedText("火·炼化·入门篇", "Fire · Forge Fire · Primer"),
  ["fire-smelt-tier-2" as SpellLoadoutId]: makeLocalizedText("火·炼化·熟练篇", "Fire · Forge Fire · Adept"),
  ["fire-smelt-tier-3" as SpellLoadoutId]: makeLocalizedText("火·炼化·精修篇", "Fire · Forge Fire · Refined"),
  ["fire-smelt-tier-4" as SpellLoadoutId]: makeLocalizedText("火·炼化·真诀篇", "Fire · Forge Fire · Arcane"),
  ["fire-smelt-tier-5" as SpellLoadoutId]: makeLocalizedText("火·炼化·秘传篇", "Fire · Forge Fire · Esoteric"),

  // ── Earth · Stone Wall ──
  ["starter-earth-wall" as SpellLoadoutId]: makeLocalizedText("土·岩壁·入门篇", "Earth · Stone Wall · Primer"),
  ["earth-wall-tier-2" as SpellLoadoutId]: makeLocalizedText("土·岩壁·熟练篇", "Earth · Stone Wall · Adept"),
  ["earth-wall-tier-3" as SpellLoadoutId]: makeLocalizedText("土·岩壁·精修篇", "Earth · Stone Wall · Refined"),
  ["earth-wall-tier-4" as SpellLoadoutId]: makeLocalizedText("土·岩壁·真诀篇", "Earth · Stone Wall · Arcane"),
  ["earth-wall-tier-5" as SpellLoadoutId]: makeLocalizedText("土·岩壁·秘传篇", "Earth · Stone Wall · Esoteric"),

  // ── Earth · Mountain Seal ──
  ["starter-earth-suppress" as SpellLoadoutId]: makeLocalizedText("土·镇岳·入门篇", "Earth · Mountain Seal · Primer"),
  ["earth-suppress-tier-2" as SpellLoadoutId]: makeLocalizedText("土·镇岳·熟练篇", "Earth · Mountain Seal · Adept"),
  ["earth-suppress-tier-3" as SpellLoadoutId]: makeLocalizedText("土·镇岳·精修篇", "Earth · Mountain Seal · Refined"),
  ["earth-suppress-tier-4" as SpellLoadoutId]: makeLocalizedText("土·镇岳·真诀篇", "Earth · Mountain Seal · Arcane"),
  ["earth-suppress-tier-5" as SpellLoadoutId]: makeLocalizedText("土·镇岳·秘传篇", "Earth · Mountain Seal · Esoteric"),

  // ── Earth · Earth Vein ──
  ["starter-earth-vein" as SpellLoadoutId]: makeLocalizedText("土·地脉·入门篇", "Earth · Earth Vein · Primer"),
  ["earth-vein-tier-2" as SpellLoadoutId]: makeLocalizedText("土·地脉·熟练篇", "Earth · Earth Vein · Adept"),
  ["earth-vein-tier-3" as SpellLoadoutId]: makeLocalizedText("土·地脉·精修篇", "Earth · Earth Vein · Refined"),
  ["earth-vein-tier-4" as SpellLoadoutId]: makeLocalizedText("土·地脉·真诀篇", "Earth · Earth Vein · Arcane"),
  ["earth-vein-tier-5" as SpellLoadoutId]: makeLocalizedText("土·地脉·秘传篇", "Earth · Earth Vein · Esoteric"),
} as Record<SpellLoadoutId, LocalizedText>;

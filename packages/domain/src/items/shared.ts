import type {
  ItemUseDefinition,
  LocalizedText,
  RegistrationLocale,
} from "../model.js";

export function makeLocalizedText(zh: string, en: string): LocalizedText {
  return { "zh-CN": zh, en };
}

export function resolveLocalizedText(
  text: LocalizedText,
  locale: RegistrationLocale,
): string {
  return text[locale];
}

export const MATERIAL_USE: ItemUseDefinition = {
  kind: "material",
  actionId: null,
  consumesOnUse: false,
  effectSummary: null,
  effectSummaryByLocale: null,
  effectBundle: null,
  grantsTechnique: null,
  ticketTargets: null,
  grantsWeaponLoadoutId: null,
  grantsSpellLoadoutId: null,
};

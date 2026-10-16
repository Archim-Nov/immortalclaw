/**
 * Chinese display names for action cards.
 * The cultivator's stored name stays as written. Only the card substitutes.
 */

const FAMILY: Record<string, string> = {
  lin: "林",
  shen: "沈",
  yu: "余",
  gu: "顾",
  jiang: "江",
  qin: "秦",
};

const GIVEN: Record<string, string> = {
  yue: "月",
  lan: "兰",
  ming: "明",
  rui: "瑞",
  xian: "仙",
  tao: "桃",
  emma: "艾玛",
};

const FALLBACK_FAMILY = ["林", "沈", "顾", "江", "秦", "云", "楚", "白", "叶", "苏"] as const;
const FALLBACK_GIVEN = ["玄霜", "清弦", "若水", "青萝", "墨白", "听雪", "素心", "北辰", "怀瑾", "停云"] as const;

const LATIN_WORD = /[A-Za-z]+(?:['’-][A-Za-z]+)*/gu;

function hashName(input: string): number {
  let acc = 2166136261;
  for (const ch of input) acc = Math.imul(acc ^ ch.charCodeAt(0), 16777619);
  return acc >>> 0;
}

function fallbackName(token: string): string {
  const n = hashName(token.toLowerCase());
  const family = FALLBACK_FAMILY[n % FALLBACK_FAMILY.length]!;
  const given = FALLBACK_GIVEN[Math.floor(n / FALLBACK_FAMILY.length) % FALLBACK_GIVEN.length]!;
  return `${family}${given}`;
}

function mapGivenPiece(token: string): string | null {
  const lower = token.toLowerCase();
  if (GIVEN[lower]) return GIVEN[lower];
  let best: { span: number; text: string } | null = null;
  for (let i = 1; i < lower.length; i += 1) {
    const head = GIVEN[lower.slice(0, i)];
    const tail = GIVEN[lower.slice(i)];
    if (!head || !tail) continue;
    if (!best || i > best.span) best = { span: i, text: head + tail };
  }
  return best?.text ?? null;
}

function latinTokenToZh(token: string): string {
  return mapGivenPiece(token) ?? FAMILY[token.toLowerCase()] ?? fallbackName(token);
}

function latinFullNameToZh(name: string): string {
  const parts = name.split(/[\s._-]+/u).filter(Boolean);
  if (parts.length === 0) return "某人";
  if (parts.length === 1) return latinTokenToZh(parts[0]!);
  const [first, ...rest] = parts;
  const surname = FAMILY[first!.toLowerCase()] ?? fallbackName(first!).slice(0, 1);
  const given = rest.map((part) => mapGivenPiece(part) ?? fallbackName(part).slice(1)).join("");
  return `${surname}${given}`;
}

export function facingPersonName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "某人";
  if (!/[A-Za-z]/u.test(trimmed)) return trimmed;
  if (/[\u4e00-\u9fff]/u.test(trimmed)) {
    return trimmed.replace(LATIN_WORD, (token) => latinTokenToZh(token));
  }
  return latinFullNameToZh(trimmed);
}

export function polishEmbeddedNames(text: string): string {
  if (!/[A-Za-z]/u.test(text)) return text;
  if (!/[\u4e00-\u9fff]/u.test(text)) return facingPersonName(text);
  return text.replace(LATIN_WORD, (token) => latinTokenToZh(token));
}

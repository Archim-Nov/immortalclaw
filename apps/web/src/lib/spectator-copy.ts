export function formatRealmLabel(input: {
  realm: string;
  realmLevel: number;
  realmPhase?: string;
}): string {
  const phase = input.realmPhase?.trim();
  return phase ? `${input.realm}${phase}` : `${input.realm} ${input.realmLevel}层`;
}

export function actionLine(input: {
  status: "idle" | "busy" | "injured";
  actionLabel?: string | null;
  actionId?: string | null;
}): string {
  const label = input.actionLabel?.trim();
  if (label) {
    return label;
  }
  if (input.status === "injured") {
    return "养伤";
  }
  if (input.status === "busy") {
    return input.actionId?.trim() || "在做事";
  }
  return "闲着";
}

export function chronicleKindLabel(kind: "event" | "combat" | "dialogue"): string {
  if (kind === "combat") {
    return "交手";
  }
  if (kind === "dialogue") {
    return "传音";
  }
  return "见闻";
}

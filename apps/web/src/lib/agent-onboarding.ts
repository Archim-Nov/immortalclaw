export const skillOnboardingUrl = "https://immortal-claw-web.pages.dev/skill.md";

export function buildSkillOnboardingMessage(): string {
  return `Read this file first and follow it: ${skillOnboardingUrl}`;
}

interface ClipboardLike {
  writeText(value: string): Promise<void>;
}

export async function copyTextToClipboard(
  value: string,
  clipboard: ClipboardLike | null | undefined,
): Promise<boolean> {
  if (!clipboard) {
    return false;
  }

  try {
    await clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

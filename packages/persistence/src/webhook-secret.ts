export function issueWebhookSecret(webhookUrl: string | undefined): string | undefined {
  return webhookUrl ? `whsec_${crypto.randomUUID()}` : undefined;
}

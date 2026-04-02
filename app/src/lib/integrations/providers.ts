import type { IntegrationProvider } from "@/lib/tenant/credentials";

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  "twilio",
  "resend",
  "openai",
  "stripe",
  "docusign",
];

export function isIntegrationProvider(value: unknown): value is IntegrationProvider {
  return typeof value === "string" && INTEGRATION_PROVIDERS.includes(value as IntegrationProvider);
}

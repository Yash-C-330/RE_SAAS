import type { IntegrationProvider } from "@/lib/tenant/credentials";

const PROVIDER_ENV_REQUIREMENTS: Record<IntegrationProvider, string[]> = {
  twilio: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"],
  resend: ["RESEND_API_KEY", "EMAIL_FROM"],
  openai: ["OPENAI_API_KEY"],
  stripe: ["STRIPE_SECRET_KEY"],
  docusign: ["DOCUSIGN_INTEGRATION_KEY", "DOCUSIGN_ACCOUNT_ID", "DOCUSIGN_PRIVATE_KEY"],
};

const INTEGRATION_MODE_MANAGED = "managed";

export function isManagedIntegrationsMode() {
  return (process.env.INTEGRATIONS_MODE ?? "self_service").trim().toLowerCase() === INTEGRATION_MODE_MANAGED;
}

export function getManagedProviderStatus() {
  const status: Record<IntegrationProvider, boolean> = {
    twilio: false,
    resend: false,
    openai: false,
    stripe: false,
    docusign: false,
  };

  for (const provider of Object.keys(PROVIDER_ENV_REQUIREMENTS) as IntegrationProvider[]) {
    status[provider] = PROVIDER_ENV_REQUIREMENTS[provider].every((key) => isConfigured(process.env[key]));
  }

  return status;
}

function isConfigured(raw: string | undefined) {
  if (!raw) return false;
  const value = raw.trim();
  if (!value) return false;
  return !value.includes("...");
}

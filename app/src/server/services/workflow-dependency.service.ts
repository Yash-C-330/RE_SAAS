import { getManagedProviderStatus, isManagedIntegrationsMode } from "@/lib/integrations/mode";
import type { IntegrationProvider } from "@/lib/tenant/credentials";

const WORKFLOW_PROVIDER_REQUIREMENTS: Record<string, IntegrationProvider[]> = {
  maintenance_router: ["openai", "twilio"],
  rent_reminder: ["twilio", "resend"],
  lease_renewal: ["openai", "twilio", "resend"],
  managed_sms_dispatch: ["twilio"],
  managed_ai_generate: ["openai"],
};

export function verifyWorkflowProviderReadiness(params: {
  workflowName: string;
  requiredProviders?: IntegrationProvider[];
}) {
  if (!isManagedIntegrationsMode()) {
    return {
      ready: false,
      missingProviders: [] as IntegrationProvider[],
      message: "INTEGRATIONS_MODE must be set to managed",
    };
  }

  const providers =
    params.requiredProviders ??
    WORKFLOW_PROVIDER_REQUIREMENTS[params.workflowName] ??
    [];

  const status = getManagedProviderStatus();
  const missingProviders = providers.filter((provider) => !status[provider]);

  if (missingProviders.length > 0) {
    return {
      ready: false,
      missingProviders,
      message: `Missing provider configuration: ${missingProviders.join(", ")}`,
    };
  }

  return {
    ready: true,
    missingProviders: [] as IntegrationProvider[],
    message: "ok",
  };
}

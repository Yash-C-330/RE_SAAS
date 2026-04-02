import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { credentialAuditLogs } from "@/lib/db/schema";
import {
  assertSupportedProvider,
  getTenantCredential,
  maskCredentialSecret,
  type IntegrationProvider,
} from "@/lib/tenant/credentials";
import { isManagedIntegrationsMode } from "@/lib/integrations/mode";

const MANAGED_PROVIDER_ENV_MAP: Record<IntegrationProvider, string[]> = {
  twilio: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"],
  resend: ["RESEND_API_KEY", "EMAIL_FROM"],
  openai: ["OPENAI_API_KEY"],
  stripe: ["STRIPE_SECRET_KEY"],
  docusign: ["DOCUSIGN_INTEGRATION_KEY", "DOCUSIGN_ACCOUNT_ID", "DOCUSIGN_PRIVATE_KEY"],
};

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-n8n-api-key");
  if (!process.env.N8N_API_KEY || apiKey !== process.env.N8N_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const landlordId = typeof body.landlordId === "string" ? body.landlordId : null;
  const workflowRunId = typeof body.workflowRunId === "string" ? body.workflowRunId : null;
  const providers = Array.isArray(body.providers) ? body.providers : [];

  if (!landlordId) {
    return NextResponse.json({ error: "landlordId is required" }, { status: 400 });
  }

  if (providers.length === 0) {
    return NextResponse.json({ error: "providers must contain at least one provider" }, { status: 400 });
  }

  const normalizedProviders = providers.filter(assertSupportedProvider) as IntegrationProvider[];
  if (normalizedProviders.length !== providers.length) {
    return NextResponse.json({ error: "providers contains unsupported values" }, { status: 400 });
  }

  const credentials: Record<string, Record<string, string>> = {};
  const masked: Record<string, Record<string, string>> = {};

  if (isManagedIntegrationsMode()) {
    for (const provider of normalizedProviders) {
      const envKeys = MANAGED_PROVIDER_ENV_MAP[provider] ?? [];
      const providerSecret: Record<string, string> = {};

      for (const key of envKeys) {
        const value = process.env[key]?.trim();
        if (value) {
          providerSecret[key] = value;
        }
      }

      if (Object.keys(providerSecret).length !== envKeys.length) {
        continue;
      }

      credentials[provider] = providerSecret;
      masked[provider] = maskCredentialSecret(providerSecret);

      await db.insert(credentialAuditLogs).values({
        landlordId,
        provider,
        action: "runtime_access",
        actorType: "system",
        actorId: "managed-integrations",
        workflowRunId: workflowRunId ?? null,
        details: {
          source: "platform_env",
          fields: envKeys,
        },
      });
    }

    return NextResponse.json({
      landlordId,
      workflowRunId,
      mode: "managed",
      credentials,
      masked,
    });
  }

  for (const provider of normalizedProviders) {
    const row = await getTenantCredential({ landlordId, provider });
    if (!row) {
      continue;
    }

    credentials[provider] = row.secret;
    masked[provider] = maskCredentialSecret(row.secret);

    await db.insert(credentialAuditLogs).values({
      landlordId,
      provider,
      action: "runtime_access",
      actorType: "n8n",
      actorId: "n8n-runtime",
      workflowRunId: workflowRunId ?? null,
      details: {
        keyVersion: row.keyVersion,
        fields: Object.keys(row.secret),
      },
    });
  }

  return NextResponse.json({
    landlordId,
    workflowRunId,
    credentials,
    masked,
  });
}

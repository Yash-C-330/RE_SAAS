import { and, desc, eq, sql } from "drizzle-orm";
import { AUTOMATIONS } from "@/lib/automations/catalog";
import { db } from "@/lib/db";
import { tenantIntegrationCredentials, workflowRuns } from "@/lib/db/schema";
import { getManagedProviderStatus, isManagedIntegrationsMode } from "@/lib/integrations/mode";
import type { IntegrationProvider } from "@/lib/tenant/credentials";

type ProviderStatus = Record<IntegrationProvider, boolean>;

export type IntegrationHealthSnapshot = {
  checkedAt: string;
  databaseOk: boolean;
  n8nConfigured: boolean;
  providersConfigured: number;
  providersTotal: number;
  providerStatus: ProviderStatus;
  failedRunsLast24h: number;
  lastSuccessfulRunAt: string | null;
};

export type AutomationConnectionRow = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  triggerType: "webhook" | "cron" | "inbound";
  integrations: string[];
  manualRunSupported: boolean;
  connected: boolean;
  missingProviders: IntegrationProvider[];
  n8nReady: boolean;
  lastStatus: string | null;
  lastRunAt: string | null;
};

export async function getAutomationConnectionRows(landlordId: string): Promise<AutomationConnectionRow[]> {
  const [providerStatus, latestRuns, n8nReady] = await Promise.all([
    getProviderStatus(landlordId),
    getLatestRuns(landlordId),
    Promise.resolve(isN8nConfigured()),
  ]);

  return AUTOMATIONS.map((automation) => {
    const missingProviders = automation.requiredProviders.filter((provider) => !providerStatus[provider]);
    const latestRun = latestRuns.get(automation.id) ?? null;

    return {
      id: automation.id,
      name: automation.name,
      description: automation.description,
      trigger: automation.trigger,
      triggerType: automation.triggerType,
      integrations: automation.integrations,
      manualRunSupported: automation.triggerType === "webhook",
      connected: missingProviders.length === 0 && n8nReady,
      missingProviders,
      n8nReady,
      lastStatus: latestRun?.status ?? null,
      lastRunAt: latestRun?.updatedAt?.toISOString() ?? null,
    };
  });
}

export async function getIntegrationHealthSnapshot(
  landlordId: string
): Promise<IntegrationHealthSnapshot> {
  const [providerStatus, n8nConfigured, databaseOk, failedRunsLast24h, lastSuccess] = await Promise.all([
    getProviderStatus(landlordId),
    Promise.resolve(isN8nConfigured()),
    checkDatabaseHealth(),
    countFailedRunsLast24h(landlordId),
    getLastSuccessfulRun(landlordId),
  ]);

  const providersTotal = Object.keys(providerStatus).length;
  const providersConfigured = Object.values(providerStatus).filter(Boolean).length;

  return {
    checkedAt: new Date().toISOString(),
    databaseOk,
    n8nConfigured,
    providersConfigured,
    providersTotal,
    providerStatus,
    failedRunsLast24h,
    lastSuccessfulRunAt: lastSuccess?.updatedAt?.toISOString() ?? null,
  };
}

async function getProviderStatus(landlordId: string): Promise<ProviderStatus> {
  if (isManagedIntegrationsMode()) {
    return getManagedProviderStatus();
  }

  const status: ProviderStatus = {
    twilio: false,
    resend: false,
    openai: false,
    stripe: false,
    docusign: false,
  };

  const rows = await db.query.tenantIntegrationCredentials.findMany({
    where: and(
      eq(tenantIntegrationCredentials.landlordId, landlordId),
      eq(tenantIntegrationCredentials.isActive, true)
    ),
  });

  for (const row of rows) {
    if (row.provider in status) {
      status[row.provider as IntegrationProvider] = true;
    }
  }

  return status;
}

async function checkDatabaseHealth() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

async function countFailedRunsLast24h(landlordId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workflowRuns)
    .where(
      and(
        eq(workflowRuns.landlordId, landlordId),
        sql`${workflowRuns.updatedAt} >= ${since}`,
        sql`${workflowRuns.status} in ('failed', 'trigger_failed')`
      )
    );

  return rows[0]?.count ?? 0;
}

async function getLastSuccessfulRun(landlordId: string) {
  return db.query.workflowRuns.findFirst({
    where: and(eq(workflowRuns.landlordId, landlordId), eq(workflowRuns.status, "success")),
    orderBy: [desc(workflowRuns.updatedAt)],
  });
}

async function getLatestRuns(landlordId: string) {
  const rows = await db.query.workflowRuns.findMany({
    where: eq(workflowRuns.landlordId, landlordId),
    orderBy: [desc(workflowRuns.updatedAt)],
    limit: 200,
  });

  const byWorkflow = new Map<string, { status: string; updatedAt: Date | null }>();

  for (const row of rows) {
    if (!byWorkflow.has(row.workflowName)) {
      byWorkflow.set(row.workflowName, {
        status: row.status,
        updatedAt: row.updatedAt,
      });
    }
  }

  return byWorkflow;
}

export function isN8nConfigured() {
  const webhookUrl = (process.env.N8N_WEBHOOK_URL ?? "").trim();
  const apiKey = (process.env.N8N_API_KEY ?? "").trim();
  const callbackSecret = (process.env.N8N_CALLBACK_SECRET ?? "").trim();

  return webhookUrl.length > 0 && apiKey.length > 0 && callbackSecret.length > 0;
}

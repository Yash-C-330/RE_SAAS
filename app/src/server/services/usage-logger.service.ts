import { db } from "@/lib/db";
import { integrationUsageEvents } from "@/lib/db/schema";

export type UsageType = "sms" | "tokens";
export type UsageProvider = "twilio" | "openai" | "resend" | "stripe";

export async function logIntegrationUsage(params: {
  tenantId: string;
  provider: UsageProvider;
  usageType: UsageType;
  unitsUsed: number;
  estimatedCost: number;
  status?: "success" | "failed";
  metadata?: Record<string, unknown>;
}) {
  await db.insert(integrationUsageEvents).values({
    tenantId: params.tenantId,
    provider: params.provider,
    usageType: params.usageType,
    unitsUsed: params.unitsUsed,
    estimatedCost: params.estimatedCost.toFixed(4),
    status: params.status ?? "success",
    metadata: params.metadata ?? null,
  });
}

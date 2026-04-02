import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { integrationUsageEvents, landlords, tenantPlanQuotas } from "@/lib/db/schema";

type QuotaUsageType = "sms" | "tokens";

const DEFAULT_PLAN_LIMITS: Record<string, { smsLimit: number; aiTokenLimit: number }> = {
  starter: { smsLimit: 500, aiTokenLimit: 250000 },
  growth: { smsLimit: 2500, aiTokenLimit: 1200000 },
  pro: { smsLimit: 10000, aiTokenLimit: 5000000 },
  enterprise: { smsLimit: Number.MAX_SAFE_INTEGER, aiTokenLimit: Number.MAX_SAFE_INTEGER },
};

export async function getTenantQuotaLimits(tenantId: string) {
  const customQuota = await db.query.tenantPlanQuotas.findFirst({
    where: eq(tenantPlanQuotas.tenantId, tenantId),
  });

  if (customQuota) {
    return {
      smsLimit: customQuota.smsLimit,
      aiTokenLimit: customQuota.aiTokenLimit,
      source: "custom" as const,
    };
  }

  const tenant = await db.query.landlords.findFirst({
    where: eq(landlords.id, tenantId),
    columns: { plan: true },
  });

  const plan = tenant?.plan ?? "starter";
  const defaults = DEFAULT_PLAN_LIMITS[plan] ?? DEFAULT_PLAN_LIMITS.starter;

  return {
    ...defaults,
    source: "plan_default" as const,
  };
}

export async function getCurrentMonthUsage(tenantId: string, usageType: QuotaUsageType) {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [result] = await db
    .select({
      used: sql<number>`coalesce(sum(${integrationUsageEvents.unitsUsed}), 0)`,
    })
    .from(integrationUsageEvents)
    .where(
      and(
        eq(integrationUsageEvents.tenantId, tenantId),
        eq(integrationUsageEvents.usageType, usageType),
        gte(integrationUsageEvents.timestamp, startOfMonth)
      )
    );

  return Number(result?.used ?? 0);
}

export async function checkMonthlyQuota(params: {
  tenantId: string;
  usageType: QuotaUsageType;
  requestedUnits: number;
}) {
  const limits = await getTenantQuotaLimits(params.tenantId);
  const currentUsage = await getCurrentMonthUsage(params.tenantId, params.usageType);

  const limit = params.usageType === "sms" ? limits.smsLimit : limits.aiTokenLimit;
  const projected = currentUsage + params.requestedUnits;

  return {
    allowed: projected <= limit,
    limit,
    used: currentUsage,
    remaining: Math.max(0, limit - currentUsage),
    projected,
  };
}

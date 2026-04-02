import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { landlords, leases, tenants } from "@/lib/db/schema";
import { enforceSimpleRateLimit } from "@/server/middleware/simple-rate-limit";

function isSchedulerAuthorized(req: NextRequest) {
  const incoming = (req.headers.get("x-api-key") ?? "").trim();
  const schedulerSecret = (process.env.N8N_SCHEDULER_API_KEY ?? "").trim();
  const callbackSecret = (process.env.N8N_CALLBACK_SECRET ?? "").trim();

  if (!incoming) return false;
  if (schedulerSecret && incoming === schedulerSecret) return true;
  return callbackSecret.length > 0 && incoming === callbackSecret;
}

/**
 * GET /api/automations/scheduler/landlords
 * Internal endpoint for n8n cron workflows to fetch eligible landlords.
 */
export async function GET(req: NextRequest) {
  if (!isSchedulerAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateKey = `scheduler:landlords:${req.headers.get("x-forwarded-for") ?? "no-ip"}`;
  const rate = enforceSimpleRateLimit({
    key: rateKey,
    limit: 30,
    windowSeconds: 60,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds),
        },
      }
    );
  }

  const automationId = req.nextUrl.searchParams.get("automationId") ?? "rent-reminders";

  const rows = await db
    .select({
      landlordId: landlords.id,
      landlordName: landlords.name,
      activeLeases: sql<number>`count(${leases.id})::int`,
    })
    .from(landlords)
    .leftJoin(tenants, eq(tenants.landlordId, landlords.id))
    .leftJoin(leases, and(eq(leases.tenantId, tenants.id), eq(leases.status, "active")))
    .groupBy(landlords.id, landlords.name)
    .having(sql`count(${leases.id}) > 0`)
    .orderBy(landlords.createdAt);

  const schedulerLandlords = rows.map((row) => ({
    landlordId: row.landlordId,
    landlordName: row.landlordName,
    activeLeases: row.activeLeases,
  }));

  return NextResponse.json({
    automationId,
    landlords: schedulerLandlords,
    count: schedulerLandlords.length,
  });
}

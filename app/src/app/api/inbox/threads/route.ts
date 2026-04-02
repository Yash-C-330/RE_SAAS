import { and, desc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communicationThreads, tenants } from "@/lib/db/schema";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";

const VALID_STATUSES = ["open", "pending", "closed"] as const;
const VALID_CHANNELS = ["sms", "email", "mixed", "internal"] as const;

export async function GET(req: NextRequest) {
  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const statusParam = req.nextUrl.searchParams.get("status")?.trim();
  const limitParam = req.nextUrl.searchParams.get("limit")?.trim();
  const limit = Math.min(100, Math.max(1, Number.parseInt(limitParam ?? "20", 10) || 20));

  const whereClause =
    statusParam && VALID_STATUSES.includes(statusParam as (typeof VALID_STATUSES)[number])
      ? and(eq(communicationThreads.landlordId, landlord.id), eq(communicationThreads.status, statusParam))
      : eq(communicationThreads.landlordId, landlord.id);

  const rows = await db
    .select({
      id: communicationThreads.id,
      landlordId: communicationThreads.landlordId,
      tenantId: communicationThreads.tenantId,
      maintenanceTicketId: communicationThreads.maintenanceTicketId,
      subject: communicationThreads.subject,
      channel: communicationThreads.channel,
      status: communicationThreads.status,
      lastMessageAt: communicationThreads.lastMessageAt,
      createdAt: communicationThreads.createdAt,
      updatedAt: communicationThreads.updatedAt,
      tenantName: tenants.name,
      tenantEmail: tenants.email,
      tenantPhone: tenants.phone,
      totalMessages: sql<number>`(
        select count(*)::int
        from communication_messages m
        where m.thread_id = ${communicationThreads.id}
      )`,
    })
    .from(communicationThreads)
    .leftJoin(tenants, eq(communicationThreads.tenantId, tenants.id))
    .where(whereClause)
    .orderBy(desc(communicationThreads.lastMessageAt))
    .limit(limit);

  return NextResponse.json({ threads: rows });
}

export async function POST(req: NextRequest) {
  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const tenantId = typeof body.tenantId === "string" ? body.tenantId.trim() : null;
  const maintenanceTicketId =
    typeof body.maintenanceTicketId === "string" ? body.maintenanceTicketId.trim() : null;
  const subject = typeof body.subject === "string" ? body.subject.trim() : null;
  const channelRaw = typeof body.channel === "string" ? body.channel.trim() : "sms";
  const statusRaw = typeof body.status === "string" ? body.status.trim() : "open";

  const channel = VALID_CHANNELS.includes(channelRaw as (typeof VALID_CHANNELS)[number])
    ? channelRaw
    : "sms";
  const status = VALID_STATUSES.includes(statusRaw as (typeof VALID_STATUSES)[number])
    ? statusRaw
    : "open";

  if (!tenantId && !maintenanceTicketId && !subject) {
    return NextResponse.json(
      { error: "At least one of tenantId, maintenanceTicketId, or subject is required" },
      { status: 400 }
    );
  }

  if (tenantId) {
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
    if (!tenant || tenant.landlordId !== landlord.id) {
      return NextResponse.json({ error: "Tenant not found for landlord" }, { status: 404 });
    }
  }

  const [thread] = await db
    .insert(communicationThreads)
    .values({
      landlordId: landlord.id,
      tenantId,
      maintenanceTicketId,
      subject,
      channel,
      status,
      lastMessageAt: new Date(),
    })
    .returning();

  return NextResponse.json({ thread }, { status: 201 });
}

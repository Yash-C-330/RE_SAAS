import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communicationMessages, communicationThreads, tenants } from "@/lib/db/schema";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";

export async function GET(
  _req: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const { threadId } = await context.params;

  const thread = await db
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
    })
    .from(communicationThreads)
    .leftJoin(tenants, eq(communicationThreads.tenantId, tenants.id))
    .where(and(eq(communicationThreads.id, threadId), eq(communicationThreads.landlordId, landlord.id)))
    .limit(1);

  if (!thread[0]) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const messages = await db.query.communicationMessages.findMany({
    where: and(eq(communicationMessages.threadId, threadId), eq(communicationMessages.landlordId, landlord.id)),
    orderBy: [asc(communicationMessages.createdAt)],
  });

  return NextResponse.json({ thread: thread[0], messages });
}

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communicationMessages, communicationThreads, tenants } from "@/lib/db/schema";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";
import { MessagingService } from "@/server/services/messaging.service";

const VALID_CHANNELS = ["sms", "email", "inapp", "internal"] as const;

export async function POST(
  req: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const { threadId } = await context.params;
  const thread = await db.query.communicationThreads.findFirst({
    where: and(eq(communicationThreads.id, threadId), eq(communicationThreads.landlordId, landlord.id)),
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const messageBody = typeof body.body === "string" ? body.body.trim() : "";
  const channelRaw = typeof body.channel === "string" ? body.channel.trim() : thread.channel;
  const senderType = typeof body.senderType === "string" ? body.senderType.trim() : "landlord";
  const senderId = typeof body.senderId === "string" ? body.senderId.trim() : landlord.id;

  if (!messageBody) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const channel = VALID_CHANNELS.includes(channelRaw as (typeof VALID_CHANNELS)[number])
    ? channelRaw
    : "sms";

  let providerMessageId: string | null = null;
  let deliveryStatus = "queued";
  let deliveryError: string | null = null;

  if (channel === "sms") {
    const tenantPhone = await resolveTenantPhone(thread.tenantId);
    if (tenantPhone) {
      try {
        const messaging = new MessagingService();
        const sent = await messaging.sendSMS({
          tenantId: landlord.id,
          to: tenantPhone,
          body: messageBody,
        });

        providerMessageId = sent.sid;
        deliveryStatus = sent.status ?? "sent";
      } catch (error) {
        deliveryStatus = "failed";
        deliveryError = error instanceof Error ? error.message : "Failed to send SMS";
      }
    } else {
      deliveryStatus = "failed";
      deliveryError = "No tenant phone is available for this thread";
    }
  }

  const [message] = await db
    .insert(communicationMessages)
    .values({
      threadId,
      landlordId: landlord.id,
      senderType,
      senderId,
      direction: "outbound",
      channel,
      body: messageBody,
      translatedBody: null,
      aiSummary: null,
      deliveryStatus,
      providerMessageId,
      metadata: deliveryError
        ? {
            error: deliveryError,
          }
        : null,
    })
    .returning();

  await db
    .update(communicationThreads)
    .set({
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(communicationThreads.id, threadId));

  return NextResponse.json(
    {
      message,
      delivery: {
        status: deliveryStatus,
        error: deliveryError,
      },
    },
    { status: 201 }
  );
}

async function resolveTenantPhone(tenantId: string | null) {
  if (!tenantId) {
    return null;
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  return tenant?.phone ?? null;
}

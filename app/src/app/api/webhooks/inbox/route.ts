import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communicationMessages, communicationThreads } from "@/lib/db/schema";

function isAuthorized(req: NextRequest) {
  const incoming = (req.headers.get("x-api-key") ?? "").trim();
  const callbackSecret = (process.env.N8N_CALLBACK_SECRET ?? "").trim();
  return callbackSecret.length > 0 && incoming === callbackSecret;
}

/**
 * POST /api/webhooks/inbox
 * Internal ingestion endpoint for inbound messages from n8n/provider bridges.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const threadId = typeof body.threadId === "string" ? body.threadId.trim() : "";
  const landlordId = typeof body.landlordId === "string" ? body.landlordId.trim() : "";
  const messageBody = typeof body.body === "string" ? body.body.trim() : "";
  const channel = typeof body.channel === "string" ? body.channel.trim() : "sms";
  const senderType = typeof body.senderType === "string" ? body.senderType.trim() : "tenant";
  const senderId = typeof body.senderId === "string" ? body.senderId.trim() : null;
  const providerMessageId =
    typeof body.providerMessageId === "string" ? body.providerMessageId.trim() : null;

  if (!threadId || !landlordId || !messageBody) {
    return NextResponse.json(
      { error: "threadId, landlordId, and body are required" },
      { status: 400 }
    );
  }

  const thread = await db.query.communicationThreads.findFirst({
    where: and(eq(communicationThreads.id, threadId), eq(communicationThreads.landlordId, landlordId)),
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  if (providerMessageId) {
    const duplicate = await db.query.communicationMessages.findFirst({
      where: eq(communicationMessages.providerMessageId, providerMessageId),
    });

    if (duplicate) {
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  const [message] = await db
    .insert(communicationMessages)
    .values({
      threadId,
      landlordId,
      senderType,
      senderId,
      direction: "inbound",
      channel,
      body: messageBody,
      translatedBody:
        typeof body.translatedBody === "string" ? body.translatedBody : null,
      aiSummary: typeof body.aiSummary === "string" ? body.aiSummary : null,
      deliveryStatus: "delivered",
      providerMessageId,
      metadata: typeof body.metadata === "object" && body.metadata !== null ? body.metadata : null,
    })
    .returning();

  await db
    .update(communicationThreads)
    .set({
      status: "open",
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(communicationThreads.id, threadId));

  return NextResponse.json({ received: true, messageId: message.id, duplicate: false });
}

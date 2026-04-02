import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maintenanceTickets, workflowRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function hasConfiguredDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  return !url.includes("user:password@host/dbname");
}

export async function POST(req: NextRequest) {
  try {
    if (!hasConfiguredDatabaseUrl()) {
      return NextResponse.json(
        { error: "DATABASE_URL is not configured. Update .env.local with a real PostgreSQL URL." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { name, email, phone, description, unitId, tenantId } = body;

    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }

    const callbackBaseUrl =
      process.env.N8N_APP_CALLBACK_URL?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      req.nextUrl.origin;
    const callbackUrl = `${callbackBaseUrl.replace(/\/$/, "")}/api/webhooks/n8n`;
    const n8nWebhookUrl = (process.env.N8N_WEBHOOK_URL ?? "").trim();
    const n8nApiKey = (process.env.N8N_API_KEY ?? "").trim();
    const callbackSecret = (process.env.N8N_CALLBACK_SECRET ?? "").trim();
    const correlationId = crypto.randomUUID();

    const [ticket] = await db
      .insert(maintenanceTickets)
      .values({
        unitId: unitId ?? null,
        tenantId: tenantId ?? null,
        description,
        status: "open",
      })
      .returning();

    const [workflowRun] = await db
      .insert(workflowRuns)
      .values({
        ticketId: ticket.id,
        workflowName: "maintenance-router",
        trigger: "webhook",
        source: "app",
        status: "queued",
        correlationId,
        idempotencyKey: `maintenance-router:${ticket.id}`,
        requestPayload: {
          ticketId: ticket.id,
          name,
          email,
          phone,
          description,
        },
      })
      .returning();

    // Trigger n8n maintenance router workflow (fire-and-forget)
    if (n8nWebhookUrl) {
      await fetch(`${n8nWebhookUrl}/webhook-test/maintenance-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-N8N-API-KEY": n8nApiKey,
        },
        body: JSON.stringify({
          ticketId: ticket.id,
          workflowRunId: workflowRun.id,
          correlationId,
          name,
          email,
          phone,
          description,
          callbackUrl,
          callbackSecret,
        }),
      }).catch(async (error) => {
        console.error("[maintenance POST] n8n trigger failed", error);
        await db
          .update(workflowRuns)
          .set({
            status: "trigger_failed",
            error: error instanceof Error ? error.message : "n8n trigger failed",
            updatedAt: new Date(),
          })
          .where(eq(workflowRuns.id, workflowRun.id));
      });
    }

    return NextResponse.json(
      {
        success: true,
        ticketId: ticket.id,
        workflowRunId: workflowRun.id,
        correlationId,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[maintenance POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  if (!hasConfiguredDatabaseUrl()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured. Update .env.local with a real PostgreSQL URL." },
      { status: 503 }
    );
  }

  const tickets = await db.query.maintenanceTickets.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return NextResponse.json(tickets);
}


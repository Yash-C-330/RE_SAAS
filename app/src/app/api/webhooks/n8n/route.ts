import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { automationLogs, maintenanceTickets, workflowRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * n8n calls back here after completing a workflow run.
 * Payload: { workflowName, trigger, outcome, details, landlordId?, ticketId?, workflowRunId?, correlationId?, idempotencyKey? }
 */
export async function POST(req: NextRequest) {
  const callbackSecret = (process.env.N8N_CALLBACK_SECRET ?? "").trim();

  if (!callbackSecret) {
    return NextResponse.json({ error: "N8N callback secret is not configured" }, { status: 503 });
  }

  const apiKey = (req.headers.get("x-api-key") ?? "").trim();
  if (apiKey !== callbackSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const workflowName = typeof body.workflowName === "string" ? body.workflowName : "";
  const trigger = typeof body.trigger === "string" ? body.trigger : "";
  const outcome = typeof body.outcome === "string" ? body.outcome : "";
  const details = typeof body.details === "object" && body.details !== null ? body.details : null;

  const landlordId = typeof body.landlordId === "string" && isUuid(body.landlordId) ? body.landlordId : null;
  const ticketId = typeof body.ticketId === "string" && isUuid(body.ticketId) ? body.ticketId : null;
  const workflowRunId =
    typeof body.workflowRunId === "string" && isUuid(body.workflowRunId) ? body.workflowRunId : null;
  const correlationId = typeof body.correlationId === "string" ? body.correlationId : null;

  if (!workflowName || !trigger || !isValidOutcome(outcome)) {
    return NextResponse.json(
      { error: "workflowName, trigger, and outcome are required" },
      { status: 400 }
    );
  }

  const requestIdempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.trim().length > 0
      ? body.idempotencyKey
      : req.headers.get("x-idempotency-key");

  const idempotencyKey =
    requestIdempotencyKey ??
    `${workflowRunId ?? "no-run"}:${workflowName}:${outcome}:${ticketId ?? "no-ticket"}`;

  const [logInsert] = await db
    .insert(automationLogs)
    .values({
      landlordId,
      workflowName,
      trigger,
      outcome,
      idempotencyKey,
      details,
    })
    .onConflictDoNothing({ target: automationLogs.idempotencyKey })
    .returning({ id: automationLogs.id });

  if (workflowRunId) {
    await db
      .update(workflowRuns)
      .set({
        landlordId,
        ticketId,
        workflowName,
        trigger,
        source: "n8n-callback",
        status: outcome,
        correlationId,
        responsePayload: body,
        error: outcome === "failed" ? getErrorMessage(details) : null,
        updatedAt: new Date(),
      })
      .where(eq(workflowRuns.id, workflowRunId));
  }

  if (workflowName === "maintenance-router" && ticketId && hasStatus(details)) {
    await db
      .update(maintenanceTickets)
      .set({ status: details.status })
      .where(eq(maintenanceTickets.id, ticketId));
  }

  return NextResponse.json({ received: true, duplicate: !logInsert });
}

function isValidOutcome(value: string) {
  return value === "success" || value === "failed" || value === "skipped";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function hasStatus(details: unknown): details is { status: "open" | "assigned" | "in_progress" | "resolved" } {
  if (typeof details !== "object" || details === null || !("status" in details)) {
    return false;
  }

  const status = (details as { status?: unknown }).status;
  return status === "open" || status === "assigned" || status === "in_progress" || status === "resolved";
}

function getErrorMessage(details: unknown) {
  if (typeof details !== "object" || details === null || !("error" in details)) {
    return "workflow failed";
  }

  const message = (details as { error?: unknown }).error;
  return typeof message === "string" && message.trim().length > 0 ? message : "workflow failed";
}


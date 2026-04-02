import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAutomationById } from "@/lib/automations/catalog";
import { db } from "@/lib/db";
import { workflowRuns } from "@/lib/db/schema";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";
import { getAutomationConnectionRows, isN8nConfigured } from "@/server/services/automations.service";

type TriggerAttempt = {
  url: string;
  status: number;
  responseText: string;
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ automationId: string }> }
) {
  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const { automationId } = await context.params;
  const automation = getAutomationById(automationId);
  if (!automation) {
    return NextResponse.json({ error: "Unknown automation" }, { status: 404 });
  }

  if (automation.triggerType !== "webhook") {
    return NextResponse.json(
      {
        error:
          "This automation is schedule/inbound-driven and cannot be triggered via webhook Run now. Execute it from n8n UI or add a dedicated webhook trigger.",
      },
      { status: 400 }
    );
  }

  const rows = await getAutomationConnectionRows(landlord.id);
  const current = rows.find((row) => row.id === automationId);

  if (!current) {
    return NextResponse.json({ error: "Automation state unavailable" }, { status: 500 });
  }

  if (!current.connected) {
    return NextResponse.json(
      {
        error: "Automation is not connected",
        missingProviders: current.missingProviders,
        n8nReady: current.n8nReady,
      },
      { status: 400 }
    );
  }

  const callbackBaseUrl =
    process.env.N8N_APP_CALLBACK_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    req.nextUrl.origin;
  const callbackUrl = `${callbackBaseUrl.replace(/\/$/, "")}/api/webhooks/n8n`;
  const callbackSecret = (process.env.N8N_CALLBACK_SECRET ?? "").trim();
  const correlationId = crypto.randomUUID();

  const [workflowRun] = await db
    .insert(workflowRuns)
    .values({
      landlordId: landlord.id,
      workflowName: automation.id,
      trigger: "manual",
      source: "app",
      status: "queued",
      correlationId,
      idempotencyKey: `${automation.id}:${landlord.id}:${Date.now()}`,
      requestPayload: {
        automationId: automation.id,
        initiatedBy: "dashboard",
      },
    })
    .returning();

  if (!isN8nConfigured()) {
    await db
      .update(workflowRuns)
      .set({ status: "trigger_failed", error: "n8n is not configured", updatedAt: new Date() })
      .where(eq(workflowRuns.id, workflowRun.id));

    return NextResponse.json(
      {
        error: "n8n is not configured",
        workflowRunId: workflowRun.id,
      },
      { status: 503 }
    );
  }

  const n8nBaseUrl = (process.env.N8N_WEBHOOK_URL ?? "").trim();
  const n8nApiKey = (process.env.N8N_API_KEY ?? "").trim();
  const candidateWebhookUrls = buildN8nWebhookUrls(n8nBaseUrl, automation.n8nWebhookPath);

  try {
    const failedAttempts: TriggerAttempt[] = [];

    for (const webhookUrl of candidateWebhookUrls) {
      const triggerResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-N8N-API-KEY": n8nApiKey,
        },
        body: JSON.stringify({
          workflowRunId: workflowRun.id,
          workflowName: automation.id,
          landlordId: landlord.id,
          correlationId,
          callbackUrl,
          callbackSecret,
        }),
      });

      if (triggerResponse.ok) {
        return NextResponse.json({
          accepted: true,
          workflowRunId: workflowRun.id,
          correlationId,
          webhookUrl,
        });
      }

      const responseText = (await triggerResponse.text()).slice(0, 300);
      failedAttempts.push({
        url: webhookUrl,
        status: triggerResponse.status,
        responseText,
      });
    }

    const details = failedAttempts
      .map((attempt) => `${attempt.status} ${attempt.url}${attempt.responseText ? ` -> ${attempt.responseText}` : ""}`)
      .join(" | ");

    const message = `n8n trigger failed. Tried: ${details}`;

    await db
      .update(workflowRuns)
      .set({ status: "trigger_failed", error: message.slice(0, 1000), updatedAt: new Date() })
      .where(eq(workflowRuns.id, workflowRun.id));

    return NextResponse.json(
      {
        error: message,
        workflowRunId: workflowRun.id,
      },
      { status: 502 }
    );
  } catch (triggerError) {
    const message = triggerError instanceof Error ? triggerError.message : "n8n trigger failed";

    await db
      .update(workflowRuns)
      .set({ status: "trigger_failed", error: message, updatedAt: new Date() })
      .where(eq(workflowRuns.id, workflowRun.id));

    return NextResponse.json(
      {
        error: `n8n trigger failed: ${message}`,
      workflowRunId: workflowRun.id,
      },
      { status: 502 }
    );
  }
}

function buildN8nWebhookUrls(baseUrl: string, webhookPath: string) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = webhookPath.replace(/^\/+/, "");

  if (/(\/webhook|\/webhook-test)$/.test(normalizedBase)) {
    return [
      `${normalizedBase}/${normalizedPath}`,
      `${normalizedBase.replace(/\/webhook-test$/, "/webhook")}/${normalizedPath}`,
      `${normalizedBase.replace(/\/webhook$/, "/webhook-test")}/${normalizedPath}`,
    ].filter((value, index, all) => all.indexOf(value) === index);
  }

  return [
    `${normalizedBase}/webhook/${normalizedPath}`,
    `${normalizedBase}/webhook-test/${normalizedPath}`,
  ];
}

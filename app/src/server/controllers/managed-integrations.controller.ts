import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isManagedIntegrationsMode } from "@/lib/integrations/mode";
import { requireTenantContext } from "@/server/middleware/tenant-context";
import { enforceTenantRateLimit } from "@/server/middleware/rate-limiter";
import { evaluateAbuseRisk } from "@/server/services/abuse-protection.service";
import { checkMonthlyQuota } from "@/server/services/quota-checker.service";
import { verifyWorkflowProviderReadiness } from "@/server/services/workflow-dependency.service";
import { enqueueGenerateTextJob, enqueueSMSJob } from "@/server/queue/managed-integrations.queue";

export async function queueManagedSmsRequest(req: NextRequest) {
  if (!isManagedIntegrationsMode()) {
    return NextResponse.json(
      { error: "Managed integrations endpoint requires INTEGRATIONS_MODE=managed" },
      { status: 409 }
    );
  }

  const tenantContextResult = await requireTenantContext(req);
  if (!tenantContextResult.ok) {
    return tenantContextResult.response;
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const workflowName =
    typeof body.workflowName === "string" && body.workflowName.trim().length > 0
      ? body.workflowName.trim()
      : "managed_sms_dispatch";

  if (!to || !message) {
    return NextResponse.json({ error: "to and message are required" }, { status: 400 });
  }

  const dependencyCheck = verifyWorkflowProviderReadiness({
    workflowName,
    requiredProviders: ["twilio"],
  });

  if (!dependencyCheck.ready) {
    return NextResponse.json(
      {
        error: "Workflow dependency check failed",
        details: dependencyCheck.message,
        missingProviders: dependencyCheck.missingProviders,
      },
      { status: 424 }
    );
  }

  const abuse = await evaluateAbuseRisk({
    tenantId: tenantContextResult.context.tenantId,
    provider: "twilio",
    message,
  });

  if (abuse.blocked) {
    return NextResponse.json(
      {
        error: "Request blocked by abuse protection",
        reason: abuse.reason,
        retryAfterSeconds: abuse.blockForSeconds ?? 60,
      },
      { status: 429 }
    );
  }

  const rateLimit = await enforceTenantRateLimit({
    tenantId: tenantContextResult.context.tenantId,
    resource: "sms",
    limit: 10,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        details: "Maximum 10 SMS per minute for this tenant",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  const quota = await checkMonthlyQuota({
    tenantId: tenantContextResult.context.tenantId,
    usageType: "sms",
    requestedUnits: 1,
  });

  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "Monthly quota exceeded",
        details: "SMS monthly quota exceeded for tenant",
        limit: quota.limit,
        used: quota.used,
      },
      { status: 429 }
    );
  }

  const requestId =
    (typeof body.requestId === "string" && body.requestId.trim()) ||
    `sms:${tenantContextResult.context.tenantId}:${crypto.randomUUID()}`;

  const job = await enqueueSMSJob({
    tenantId: tenantContextResult.context.tenantId,
    workflowName,
    to,
    body: message,
    requestId,
  });

  return NextResponse.json(
    {
      success: true,
      status: "queued",
      tenantId: tenantContextResult.context.tenantId,
      jobId: job.id,
      requestId,
      queue: "managed-integrations",
    },
    { status: 202 }
  );
}

export async function queueManagedAIRequest(req: NextRequest) {
  if (!isManagedIntegrationsMode()) {
    return NextResponse.json(
      { error: "Managed integrations endpoint requires INTEGRATIONS_MODE=managed" },
      { status: 409 }
    );
  }

  const tenantContextResult = await requireTenantContext(req);
  if (!tenantContextResult.ok) {
    return tenantContextResult.response;
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const model = typeof body.model === "string" && body.model.trim().length > 0 ? body.model.trim() : undefined;
  const workflowName =
    typeof body.workflowName === "string" && body.workflowName.trim().length > 0
      ? body.workflowName.trim()
      : "managed_ai_generate";

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const dependencyCheck = verifyWorkflowProviderReadiness({
    workflowName,
    requiredProviders: ["openai"],
  });

  if (!dependencyCheck.ready) {
    return NextResponse.json(
      {
        error: "Workflow dependency check failed",
        details: dependencyCheck.message,
        missingProviders: dependencyCheck.missingProviders,
      },
      { status: 424 }
    );
  }

  const abuse = await evaluateAbuseRisk({
    tenantId: tenantContextResult.context.tenantId,
    provider: "openai",
    message: prompt,
  });

  if (abuse.blocked) {
    return NextResponse.json(
      {
        error: "Request blocked by abuse protection",
        reason: abuse.reason,
        retryAfterSeconds: abuse.blockForSeconds ?? 60,
      },
      { status: 429 }
    );
  }

  const rateLimit = await enforceTenantRateLimit({
    tenantId: tenantContextResult.context.tenantId,
    resource: "ai",
    limit: 20,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        details: "Maximum 20 AI requests per minute for this tenant",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  const estimatedTokens = Math.max(1, Math.ceil(prompt.length / 4));
  const quota = await checkMonthlyQuota({
    tenantId: tenantContextResult.context.tenantId,
    usageType: "tokens",
    requestedUnits: estimatedTokens,
  });

  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "Monthly quota exceeded",
        details: "AI token monthly quota exceeded for tenant",
        limit: quota.limit,
        used: quota.used,
      },
      { status: 429 }
    );
  }

  const requestId =
    (typeof body.requestId === "string" && body.requestId.trim()) ||
    `ai:${tenantContextResult.context.tenantId}:${crypto.randomUUID()}`;

  const job = await enqueueGenerateTextJob({
    tenantId: tenantContextResult.context.tenantId,
    workflowName,
    prompt,
    model,
    requestId,
  });

  return NextResponse.json(
    {
      success: true,
      status: "queued",
      tenantId: tenantContextResult.context.tenantId,
      jobId: job.id,
      requestId,
      queue: "managed-integrations",
    },
    { status: 202 }
  );
}

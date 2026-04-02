import { Job, Worker } from "bullmq";
import {
  type GenerateTextJobData,
  type SendSMSJobData,
} from "@/server/queue/managed-integrations.queue";
import { enforceTenantRateLimit } from "@/server/middleware/rate-limiter";
import { MessagingService } from "@/server/services/messaging.service";
import { AIService } from "@/server/services/ai.service";
import { logIntegrationUsage } from "@/server/services/usage-logger.service";
import { checkMonthlyQuota } from "@/server/services/quota-checker.service";
import { verifyWorkflowProviderReadiness } from "@/server/services/workflow-dependency.service";

function getWorkerConnection() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error("REDIS_URL is required to start managed integrations worker");
  }
  return { url };
}

let messagingService: MessagingService | null = null;
let aiService: AIService | null = null;

export const managedIntegrationsWorker = new Worker(
  "managed-integrations",
  async (job: Job<SendSMSJobData | GenerateTextJobData>) => {
    if (job.name === "send_sms") {
      await processSMSJob(job as Job<SendSMSJobData>);
      return;
    }

    if (job.name === "generate_text") {
      await processGenerateTextJob(job as Job<GenerateTextJobData>);
      return;
    }

    throw new Error(`Unsupported job name: ${job.name}`);
  },
  {
    connection: getWorkerConnection(),
    concurrency: 10,
  }
);

managedIntegrationsWorker.on("failed", (job, err) => {
  console.error("[managed-integrations-worker] job failed", {
    jobId: job?.id,
    name: job?.name,
    error: err.message,
  });
});

managedIntegrationsWorker.on("completed", (job) => {
  console.info("[managed-integrations-worker] job completed", {
    jobId: job.id,
    name: job.name,
  });
});

async function processSMSJob(job: Job<SendSMSJobData>) {
  const readiness = verifyWorkflowProviderReadiness({
    workflowName: job.data.workflowName,
    requiredProviders: ["twilio"],
  });

  if (!readiness.ready) {
    throw new Error(readiness.message);
  }

  const rate = await enforceTenantRateLimit({
    tenantId: job.data.tenantId,
    resource: "sms",
    limit: 10,
    windowSeconds: 60,
  });

  if (!rate.allowed) {
    throw new Error(`SMS rate limit exceeded. Retry in ${rate.retryAfterSeconds}s`);
  }

  const quota = await checkMonthlyQuota({
    tenantId: job.data.tenantId,
    usageType: "sms",
    requestedUnits: 1,
  });

  if (!quota.allowed) {
    throw new Error("Monthly SMS quota exceeded");
  }

  try {
    if (!messagingService) {
      messagingService = new MessagingService();
    }

    const result = await messagingService.sendSMS({
      tenantId: job.data.tenantId,
      to: job.data.to,
      body: job.data.body,
    });

    await logIntegrationUsage({
      tenantId: job.data.tenantId,
      provider: "twilio",
      usageType: "sms",
      unitsUsed: 1,
      estimatedCost: result.estimatedCost,
      status: "success",
      metadata: {
        sid: result.sid,
        workflowName: job.data.workflowName,
        requestId: job.data.requestId ?? null,
      },
    });
  } catch (error) {
    await logIntegrationUsage({
      tenantId: job.data.tenantId,
      provider: "twilio",
      usageType: "sms",
      unitsUsed: 0,
      estimatedCost: 0,
      status: "failed",
      metadata: {
        workflowName: job.data.workflowName,
        requestId: job.data.requestId ?? null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}

async function processGenerateTextJob(job: Job<GenerateTextJobData>) {
  const readiness = verifyWorkflowProviderReadiness({
    workflowName: job.data.workflowName,
    requiredProviders: ["openai"],
  });

  if (!readiness.ready) {
    throw new Error(readiness.message);
  }

  const rate = await enforceTenantRateLimit({
    tenantId: job.data.tenantId,
    resource: "ai",
    limit: 20,
    windowSeconds: 60,
  });

  if (!rate.allowed) {
    throw new Error(`AI rate limit exceeded. Retry in ${rate.retryAfterSeconds}s`);
  }

  try {
    if (!aiService) {
      aiService = new AIService();
    }

    const result = await aiService.generateText({
      tenantId: job.data.tenantId,
      prompt: job.data.prompt,
      model: job.data.model,
    });

    const quota = await checkMonthlyQuota({
      tenantId: job.data.tenantId,
      usageType: "tokens",
      requestedUnits: result.totalTokens,
    });

    if (!quota.allowed) {
      throw new Error("Monthly AI token quota exceeded");
    }

    await logIntegrationUsage({
      tenantId: job.data.tenantId,
      provider: "openai",
      usageType: "tokens",
      unitsUsed: result.totalTokens,
      estimatedCost: result.estimatedCost,
      status: "success",
      metadata: {
        model: result.model,
        workflowName: job.data.workflowName,
        requestId: job.data.requestId ?? null,
      },
    });
  } catch (error) {
    await logIntegrationUsage({
      tenantId: job.data.tenantId,
      provider: "openai",
      usageType: "tokens",
      unitsUsed: 0,
      estimatedCost: 0,
      status: "failed",
      metadata: {
        workflowName: job.data.workflowName,
        requestId: job.data.requestId ?? null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}

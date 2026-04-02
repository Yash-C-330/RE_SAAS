import { Queue, type JobsOptions } from "bullmq";

export type ManagedIntegrationJobName = "send_sms" | "generate_text";

export type SendSMSJobData = {
  tenantId: string;
  workflowName: string;
  to: string;
  body: string;
  requestId?: string;
};

export type GenerateTextJobData = {
  tenantId: string;
  workflowName: string;
  prompt: string;
  model?: string;
  requestId?: string;
};

function getQueueConnection() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error("REDIS_URL is required to enqueue managed integration jobs");
  }
  return { url };
}

const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 1000,
  },
  removeOnComplete: {
    age: 3600,
    count: 5000,
  },
  removeOnFail: {
    age: 86400,
    count: 10000,
  },
};

export const managedIntegrationsQueue = new Queue<SendSMSJobData | GenerateTextJobData>(
  "managed-integrations",
  {
    connection: getQueueConnection(),
    defaultJobOptions,
  }
);

export async function enqueueSMSJob(data: SendSMSJobData) {
  return managedIntegrationsQueue.add("send_sms", data, {
    jobId: data.requestId,
  });
}

export async function enqueueGenerateTextJob(data: GenerateTextJobData) {
  return managedIntegrationsQueue.add("generate_text", data, {
    jobId: data.requestId,
  });
}

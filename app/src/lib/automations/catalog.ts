import type { IntegrationProvider } from "@/lib/tenant/credentials";

export type AutomationDefinition = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  triggerType: "webhook" | "cron" | "inbound";
  integrations: string[];
  requiredProviders: IntegrationProvider[];
  n8nWebhookPath: string;
};

export const AUTOMATIONS: AutomationDefinition[] = [
  {
    id: "rent-reminders",
    name: "Rent Reminder Sequences",
    description: "Sends email + SMS reminders 7, 3, 1 day before due. Escalates overdue accounts.",
    trigger: "Daily cron - 8:00 AM",
    triggerType: "cron",
    integrations: ["Twilio", "Resend", "OpenAI"],
    requiredProviders: ["twilio", "resend", "openai"],
    n8nWebhookPath: "rent-reminders",
  },
  {
    id: "maintenance-router",
    name: "Maintenance Request Router",
    description: "AI classifies urgency, notifies landlord, assigns vendor, tracks to resolution.",
    trigger: "Webhook - tenant form/SMS",
    triggerType: "webhook",
    integrations: ["OpenAI", "Twilio"],
    requiredProviders: ["openai", "twilio"],
    n8nWebhookPath: "maintenance-request",
  },
  {
    id: "lease-renewal",
    name: "Lease Renewal Campaign",
    description: "90/60/30-day drip campaign. Auto-generates DocuSign lease on confirmation.",
    trigger: "Daily cron",
    triggerType: "cron",
    integrations: ["OpenAI", "DocuSign", "Resend"],
    requiredProviders: ["openai", "docusign", "resend"],
    n8nWebhookPath: "lease-renewal",
  },
  {
    id: "monthly-reports",
    name: "Monthly Owner Reports",
    description: "Generates AI-written PDF report with cash flow, NOI, and maintenance summary.",
    trigger: "Monthly cron - 1st @ 6:00 AM",
    triggerType: "cron",
    integrations: ["OpenAI", "Stripe", "Resend"],
    requiredProviders: ["openai", "stripe", "resend"],
    n8nWebhookPath: "monthly-reports",
  },
  {
    id: "tenant-screening",
    name: "Tenant Screening Pipeline",
    description: "Background check + income verification + AI scoring. Auto-approves or flags.",
    trigger: "Webhook - rental application",
    triggerType: "webhook",
    integrations: ["OpenAI", "DocuSign"],
    requiredProviders: ["openai", "docusign"],
    n8nWebhookPath: "tenant-screening",
  },
  {
    id: "ai-response-bot",
    name: "AI Tenant Response Bot",
    description: "Classifies inbound tenant messages and auto-replies or escalates to landlord.",
    trigger: "Inbound SMS / email",
    triggerType: "inbound",
    integrations: ["OpenAI", "Twilio"],
    requiredProviders: ["openai", "twilio"],
    n8nWebhookPath: "ai-response-bot",
  },
];

export function getAutomationById(id: string) {
  return AUTOMATIONS.find((automation) => automation.id === id) ?? null;
}

import {
  pgTable,
  uuid,
  text,
  integer,
  decimal,
  date,
  timestamp,
  jsonb,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const landlords = pgTable("landlords", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").unique().notNull(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  plan: text("plan").default("starter"), // starter | growth | pro | enterprise
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  landlordId: uuid("landlord_id")
    .references(() => landlords.id, { onDelete: "cascade" })
    .notNull(),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  unitsCount: integer("units_count").default(1),
  type: text("type"), // single_family | multi_family | commercial
});

export const units = pgTable("units", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .references(() => properties.id, { onDelete: "cascade" })
    .notNull(),
  unitNumber: text("unit_number"),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }),
  status: text("status").default("vacant"), // vacant | occupied | maintenance
});

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  landlordId: uuid("landlord_id").references(() => landlords.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  creditScore: integer("credit_score"),
  annualIncome: decimal("annual_income", { precision: 12, scale: 2 }),
  status: text("status").default("applicant"), // applicant | active | past
});

export const leases = pgTable("leases", {
  id: uuid("id").primaryKey().defaultRandom(),
  unitId: uuid("unit_id").references(() => units.id),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  securityDeposit: decimal("security_deposit", { precision: 10, scale: 2 }),
  docusignEnvelopeId: text("docusign_envelope_id"),
  status: text("status").default("pending"), // pending | active | expired | terminated
});

export const rentPayments = pgTable("rent_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  leaseId: uuid("lease_id").references(() => leases.id),
  dueDate: date("due_date").notNull(),
  paidDate: date("paid_date"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  stripePaymentId: text("stripe_payment_id"),
  status: text("status").default("pending"), // pending | paid | late | failed
});

export const maintenanceTickets = pgTable("maintenance_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  unitId: uuid("unit_id").references(() => units.id),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  category: text("category"), // plumbing | electrical | hvac | appliance | cosmetic
  urgency: text("urgency"),   // emergency | high | normal | low
  description: text("description"),
  vendorId: text("vendor_id"),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  status: text("status").default("open"), // open | assigned | in_progress | resolved
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const communicationThreads = pgTable(
  "communication_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    landlordId: uuid("landlord_id")
      .references(() => landlords.id, { onDelete: "cascade" })
      .notNull(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
    maintenanceTicketId: uuid("maintenance_ticket_id").references(() => maintenanceTickets.id, {
      onDelete: "set null",
    }),
    subject: text("subject"),
    channel: text("channel").notNull().default("sms"), // sms | email | mixed | internal
    status: text("status").notNull().default("open"), // open | pending | closed
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    landlordLastMessageIdx: index("communication_threads_landlord_last_message_idx").on(
      table.landlordId,
      table.lastMessageAt
    ),
    tenantIdx: index("communication_threads_tenant_idx").on(table.tenantId),
    maintenanceTicketIdx: index("communication_threads_maintenance_ticket_idx").on(table.maintenanceTicketId),
  })
);

export const communicationMessages = pgTable(
  "communication_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .references(() => communicationThreads.id, { onDelete: "cascade" })
      .notNull(),
    landlordId: uuid("landlord_id")
      .references(() => landlords.id, { onDelete: "cascade" })
      .notNull(),
    senderType: text("sender_type").notNull(), // tenant | landlord | vendor | ai | system
    senderId: text("sender_id"),
    direction: text("direction").notNull(), // inbound | outbound
    channel: text("channel").notNull(), // sms | email | inapp | internal
    body: text("body").notNull(),
    translatedBody: text("translated_body"),
    aiSummary: text("ai_summary"),
    deliveryStatus: text("delivery_status").notNull().default("queued"), // queued | sent | delivered | failed | read
    providerMessageId: text("provider_message_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    threadCreatedIdx: index("communication_messages_thread_created_idx").on(table.threadId, table.createdAt),
    landlordCreatedIdx: index("communication_messages_landlord_created_idx").on(
      table.landlordId,
      table.createdAt
    ),
    providerMessageUnique: uniqueIndex("communication_messages_provider_message_uq").on(table.providerMessageId),
  })
);

export const automationLogs = pgTable("automation_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  landlordId: uuid("landlord_id").references(() => landlords.id),
  workflowName: text("workflow_name"),
  trigger: text("trigger"),
  outcome: text("outcome"), // success | failed | skipped
  idempotencyKey: text("idempotency_key").unique(),
  details: jsonb("details"),
  ranAt: timestamp("ran_at", { withTimezone: true }).defaultNow(),
});

export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  landlordId: uuid("landlord_id").references(() => landlords.id),
  ticketId: uuid("ticket_id").references(() => maintenanceTickets.id),
  workflowName: text("workflow_name").notNull(),
  trigger: text("trigger").notNull(), // webhook | cron | manual
  source: text("source").notNull().default("app"), // app | n8n-callback
  status: text("status").notNull().default("queued"), // queued | running | success | failed | skipped | trigger_failed
  correlationId: text("correlation_id"),
  idempotencyKey: text("idempotency_key").unique(),
  requestPayload: jsonb("request_payload"),
  responsePayload: jsonb("response_payload"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const tenantIntegrationCredentials = pgTable(
  "tenant_integration_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    landlordId: uuid("landlord_id")
      .references(() => landlords.id, { onDelete: "cascade" })
      .notNull(),
    provider: text("provider").notNull(), // twilio | resend | openai | stripe | docusign
    encryptedSecret: text("encrypted_secret").notNull(),
    keyVersion: integer("key_version").notNull().default(1),
    metadata: jsonb("metadata"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    landlordProviderUnique: uniqueIndex("tenant_integration_credentials_landlord_provider_uq").on(
      table.landlordId,
      table.provider
    ),
  })
);

export const credentialAuditLogs = pgTable("credential_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  landlordId: uuid("landlord_id")
    .references(() => landlords.id, { onDelete: "cascade" })
    .notNull(),
  provider: text("provider"),
  action: text("action").notNull(), // create | update | validate | rotate | runtime_access
  actorType: text("actor_type").notNull(), // landlord | system | n8n
  actorId: text("actor_id"),
  workflowRunId: uuid("workflow_run_id").references(() => workflowRuns.id),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const integrationUsageEvents = pgTable("integration_usage_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  provider: text("provider").notNull(), // twilio | openai | resend | stripe
  usageType: text("usage_type").notNull(), // sms | tokens
  unitsUsed: integer("units_used").notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 4 }).notNull().default("0"),
  status: text("status").notNull().default("success"), // success | failed
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
});

export const tenantPlanQuotas = pgTable(
  "tenant_plan_quotas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    smsLimit: integer("sms_limit").notNull(),
    aiTokenLimit: integer("ai_token_limit").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tenantIdUnique: uniqueIndex("tenant_plan_quotas_tenant_uq").on(table.tenantId),
  })
);

export const landlordPreferences = pgTable(
  "landlord_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    landlordId: uuid("landlord_id")
      .references(() => landlords.id, { onDelete: "cascade" })
      .notNull(),
    smsLimit: integer("sms_limit").notNull().default(250),
    emailLimit: integer("email_limit").notNull().default(500),
    aiTokenLimit: integer("ai_token_limit").notNull().default(250000),
    emailNotificationsEnabled: boolean("email_notifications_enabled").notNull().default(true),
    smsNotificationsEnabled: boolean("sms_notifications_enabled").notNull().default(true),
    bankLinkConfirmationPhrase: text("bank_link_confirmation_phrase")
      .notNull()
      .default("I understand this bank account will be used for rent collection"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    landlordIdUnique: uniqueIndex("landlord_preferences_landlord_uq").on(table.landlordId),
  })
);

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  landlord: one(landlords, {
    fields: [properties.landlordId],
    references: [landlords.id],
  }),
  units: many(units),
}));

export const unitsRelations = relations(units, ({ one, many }) => ({
  property: one(properties, {
    fields: [units.propertyId],
    references: [properties.id],
  }),
  leases: many(leases),
  maintenanceTickets: many(maintenanceTickets),
}));

export const communicationThreadsRelations = relations(communicationThreads, ({ one, many }) => ({
  landlord: one(landlords, {
    fields: [communicationThreads.landlordId],
    references: [landlords.id],
  }),
  tenant: one(tenants, {
    fields: [communicationThreads.tenantId],
    references: [tenants.id],
  }),
  maintenanceTicket: one(maintenanceTickets, {
    fields: [communicationThreads.maintenanceTicketId],
    references: [maintenanceTickets.id],
  }),
  messages: many(communicationMessages),
}));

export const communicationMessagesRelations = relations(communicationMessages, ({ one }) => ({
  thread: one(communicationThreads, {
    fields: [communicationMessages.threadId],
    references: [communicationThreads.id],
  }),
  landlord: one(landlords, {
    fields: [communicationMessages.landlordId],
    references: [landlords.id],
  }),
}));


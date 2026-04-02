CREATE TABLE "automation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"landlord_id" uuid,
	"workflow_name" text,
	"trigger" text,
	"outcome" text,
	"idempotency_key" text,
	"details" jsonb,
	"ran_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "automation_logs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "credential_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"landlord_id" uuid NOT NULL,
	"provider" text,
	"action" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"workflow_run_id" uuid,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integration_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"usage_type" text NOT NULL,
	"units_used" integer NOT NULL,
	"estimated_cost" numeric(10, 4) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'success' NOT NULL,
	"metadata" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landlords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"stripe_customer_id" text,
	"plan" text DEFAULT 'starter',
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "landlords_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "landlords_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "leases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid,
	"tenant_id" uuid,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"monthly_rent" numeric(10, 2) NOT NULL,
	"security_deposit" numeric(10, 2),
	"docusign_envelope_id" text,
	"status" text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "maintenance_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid,
	"tenant_id" uuid,
	"category" text,
	"urgency" text,
	"description" text,
	"vendor_id" text,
	"estimated_cost" numeric(10, 2),
	"actual_cost" numeric(10, 2),
	"status" text DEFAULT 'open',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"landlord_id" uuid NOT NULL,
	"address" text NOT NULL,
	"city" text,
	"state" text,
	"zip" text,
	"units_count" integer DEFAULT 1,
	"type" text
);
--> statement-breakpoint
CREATE TABLE "rent_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lease_id" uuid,
	"due_date" date NOT NULL,
	"paid_date" date,
	"amount" numeric(10, 2) NOT NULL,
	"stripe_payment_id" text,
	"status" text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "tenant_integration_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"landlord_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"encrypted_secret" text NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_plan_quotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sms_limit" integer NOT NULL,
	"ai_token_limit" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"credit_score" integer,
	"annual_income" numeric(12, 2),
	"status" text DEFAULT 'applicant'
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"unit_number" text,
	"bedrooms" integer,
	"bathrooms" numeric(3, 1),
	"rent_amount" numeric(10, 2),
	"status" text DEFAULT 'vacant'
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"landlord_id" uuid,
	"ticket_id" uuid,
	"workflow_name" text NOT NULL,
	"trigger" text NOT NULL,
	"source" text DEFAULT 'app' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"correlation_id" text,
	"idempotency_key" text,
	"request_payload" jsonb,
	"response_payload" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "workflow_runs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_landlord_id_landlords_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."landlords"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_audit_logs" ADD CONSTRAINT "credential_audit_logs_landlord_id_landlords_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."landlords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_audit_logs" ADD CONSTRAINT "credential_audit_logs_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_landlord_id_landlords_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."landlords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_payments" ADD CONSTRAINT "rent_payments_lease_id_leases_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_integration_credentials" ADD CONSTRAINT "tenant_integration_credentials_landlord_id_landlords_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."landlords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_landlord_id_landlords_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."landlords"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_ticket_id_maintenance_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."maintenance_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_integration_credentials_landlord_provider_uq" ON "tenant_integration_credentials" USING btree ("landlord_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_plan_quotas_tenant_uq" ON "tenant_plan_quotas" USING btree ("tenant_id");
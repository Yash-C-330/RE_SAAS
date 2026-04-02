CREATE TABLE "communication_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"landlord_id" uuid NOT NULL,
	"tenant_id" uuid,
	"maintenance_ticket_id" uuid,
	"subject" text,
	"channel" text DEFAULT 'sms' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "communication_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"landlord_id" uuid NOT NULL,
	"sender_type" text NOT NULL,
	"sender_id" text,
	"direction" text NOT NULL,
	"channel" text NOT NULL,
	"body" text NOT NULL,
	"translated_body" text,
	"ai_summary" text,
	"delivery_status" text DEFAULT 'queued' NOT NULL,
	"provider_message_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_landlord_id_landlords_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."landlords"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_maintenance_ticket_id_maintenance_tickets_id_fk" FOREIGN KEY ("maintenance_ticket_id") REFERENCES "public"."maintenance_tickets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_thread_id_communication_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."communication_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_landlord_id_landlords_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."landlords"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "communication_threads_landlord_last_message_idx" ON "communication_threads" USING btree ("landlord_id","last_message_at");
--> statement-breakpoint
CREATE INDEX "communication_threads_tenant_idx" ON "communication_threads" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "communication_threads_maintenance_ticket_idx" ON "communication_threads" USING btree ("maintenance_ticket_id");
--> statement-breakpoint
CREATE INDEX "communication_messages_thread_created_idx" ON "communication_messages" USING btree ("thread_id","created_at");
--> statement-breakpoint
CREATE INDEX "communication_messages_landlord_created_idx" ON "communication_messages" USING btree ("landlord_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "communication_messages_provider_message_uq" ON "communication_messages" USING btree ("provider_message_id");

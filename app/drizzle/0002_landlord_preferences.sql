CREATE TABLE IF NOT EXISTS "landlord_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "landlord_id" uuid NOT NULL,
  "sms_limit" integer DEFAULT 250 NOT NULL,
  "email_limit" integer DEFAULT 500 NOT NULL,
  "ai_token_limit" integer DEFAULT 250000 NOT NULL,
  "email_notifications_enabled" boolean DEFAULT true NOT NULL,
  "sms_notifications_enabled" boolean DEFAULT true NOT NULL,
  "bank_link_confirmation_phrase" text DEFAULT 'I understand this bank account will be used for rent collection' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "landlord_preferences_landlord_uq" UNIQUE("landlord_id")
);

DO $$ BEGIN
  ALTER TABLE "landlord_preferences"
    ADD CONSTRAINT "landlord_preferences_landlord_id_landlords_id_fk"
    FOREIGN KEY ("landlord_id") REFERENCES "public"."landlords"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
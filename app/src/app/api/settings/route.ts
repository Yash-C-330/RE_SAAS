import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { landlordPreferences } from "@/lib/db/schema";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";

const DEFAULT_PREFERENCES = {
  smsLimit: 250,
  emailLimit: 500,
  aiTokenLimit: 250000,
  emailNotificationsEnabled: true,
  smsNotificationsEnabled: true,
  bankLinkConfirmationPhrase: "I understand this bank account will be used for rent collection",
};

export async function GET() {
  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const preferences = await db.query.landlordPreferences.findFirst({
    where: eq(landlordPreferences.landlordId, landlord.id),
  });

  return NextResponse.json({
    preferences: preferences ?? {
      id: null,
      landlordId: landlord.id,
      ...DEFAULT_PREFERENCES,
    },
  });
}

export async function PUT(req: NextRequest) {
  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const preferences = {
    smsLimit: parseInteger(body.smsLimit, DEFAULT_PREFERENCES.smsLimit),
    emailLimit: parseInteger(body.emailLimit, DEFAULT_PREFERENCES.emailLimit),
    aiTokenLimit: parseInteger(body.aiTokenLimit, DEFAULT_PREFERENCES.aiTokenLimit),
    emailNotificationsEnabled: parseBoolean(body.emailNotificationsEnabled, DEFAULT_PREFERENCES.emailNotificationsEnabled),
    smsNotificationsEnabled: parseBoolean(body.smsNotificationsEnabled, DEFAULT_PREFERENCES.smsNotificationsEnabled),
    bankLinkConfirmationPhrase:
      typeof body.bankLinkConfirmationPhrase === "string" && body.bankLinkConfirmationPhrase.trim().length > 0
        ? body.bankLinkConfirmationPhrase.trim()
        : DEFAULT_PREFERENCES.bankLinkConfirmationPhrase,
  };

  const saved = await db
    .insert(landlordPreferences)
    .values({
      landlordId: landlord.id,
      ...preferences,
    })
    .onConflictDoUpdate({
      target: landlordPreferences.landlordId,
      set: {
        ...preferences,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json({ preferences: saved[0] ?? null });
}

function parseInteger(value: unknown, fallback: number) {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? value : NaN;
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

function parseBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { credentialAuditLogs } from "@/lib/db/schema";
import { isIntegrationProvider } from "@/lib/integrations/providers";
import { validateProviderCredential } from "@/lib/integrations/validators";
import type { CredentialSecret } from "@/lib/tenant/credentials";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";
import { isManagedIntegrationsMode } from "@/lib/integrations/mode";

export async function POST(req: NextRequest) {
  if (isManagedIntegrationsMode()) {
    return NextResponse.json(
      { error: "Managed integrations mode is enabled. Validation is handled internally." },
      { status: 403 }
    );
  }

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

  const provider = body.provider;
  if (!isIntegrationProvider(provider)) {
    return NextResponse.json({ error: "provider is invalid" }, { status: 400 });
  }

  const secret = body.secret;
  if (!isCredentialSecret(secret)) {
    return NextResponse.json({ error: "secret must be an object of string values" }, { status: 400 });
  }

  const validation = await validateProviderCredential(provider, secret);
  if (!validation.ok) {
    await db.insert(credentialAuditLogs).values({
      landlordId: landlord.id,
      provider,
      action: "validate",
      actorType: "landlord",
      actorId: landlord.clerkUserId,
      details: { ok: false, message: validation.message },
    });
    return NextResponse.json(validation, { status: 400 });
  }

  await db.insert(credentialAuditLogs).values({
    landlordId: landlord.id,
    provider,
    action: "validate",
    actorType: "landlord",
    actorId: landlord.clerkUserId,
    details: { ok: true, message: validation.message },
  });

  return NextResponse.json(validation);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCredentialSecret(value: unknown): value is CredentialSecret {
  if (!isPlainObject(value)) return false;
  return Object.values(value).every((entry) => typeof entry === "string");
}

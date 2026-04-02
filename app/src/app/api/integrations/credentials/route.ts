import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { credentialAuditLogs, tenantIntegrationCredentials } from "@/lib/db/schema";
import { isIntegrationProvider } from "@/lib/integrations/providers";
import { validateProviderCredential } from "@/lib/integrations/validators";
import {
  decryptCredentialSecret,
  getConfiguredKeyVersions,
  maskCredentialSecret,
  type CredentialSecret,
  upsertTenantCredential,
} from "@/lib/tenant/credentials";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";
import { getManagedProviderStatus, isManagedIntegrationsMode } from "@/lib/integrations/mode";

export async function GET() {
  const managedMode = isManagedIntegrationsMode();
  if (managedMode) {
    return NextResponse.json(
      {
        error: "Managed integrations mode is enabled. Credential management endpoints are disabled.",
        mode: "managed",
        managedStatus: getManagedProviderStatus(),
      },
      { status: 403 }
    );
  }

  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const rows = await db.query.tenantIntegrationCredentials.findMany({
    where: and(
      eq(tenantIntegrationCredentials.landlordId, landlord.id),
      eq(tenantIntegrationCredentials.isActive, true)
    ),
  });

  return NextResponse.json({
    mode: "self_service",
    providers: rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      keyVersion: row.keyVersion,
      maskedSecret: maskCredentialSecret(decryptCredentialSecret(row.encryptedSecret).secret),
      metadata: row.metadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isActive: row.isActive,
    })),
    keyVersions: getConfiguredKeyVersions(),
  });
}

export async function POST(req: NextRequest) {
  if (isManagedIntegrationsMode()) {
    return NextResponse.json(
      { error: "Managed integrations mode is enabled. Credentials are handled internally." },
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

  const metadata = isPlainObject(body.metadata) ? body.metadata : undefined;
  const shouldValidate = body.validate !== false;

  if (shouldValidate) {
    const validation = await validateProviderCredential(provider, secret);
    if (!validation.ok) {
      await db.insert(credentialAuditLogs).values({
        landlordId: landlord.id,
        provider,
        action: "validate",
        actorType: "landlord",
        actorId: landlord.clerkUserId,
        details: {
          ok: false,
          message: validation.message,
        },
      });
      return NextResponse.json({ error: validation.message, validation }, { status: 400 });
    }

    await db.insert(credentialAuditLogs).values({
      landlordId: landlord.id,
      provider,
      action: "validate",
      actorType: "landlord",
      actorId: landlord.clerkUserId,
      details: {
        ok: true,
        message: validation.message,
      },
    });
  }

  const saved = await upsertTenantCredential({
    landlordId: landlord.id,
    provider,
    secret,
    metadata,
  });

  await db.insert(credentialAuditLogs).values({
    landlordId: landlord.id,
    provider,
    action: "update",
    actorType: "landlord",
    actorId: landlord.clerkUserId,
    details: {
      keyVersion: saved.keyVersion,
      fields: Object.keys(secret),
      masked: maskCredentialSecret(secret),
    },
  });

  return NextResponse.json(
    {
      id: saved.id,
      provider: saved.provider,
      keyVersion: saved.keyVersion,
      metadata: saved.metadata,
      updatedAt: saved.updatedAt,
      isActive: saved.isActive,
    },
    { status: 201 }
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCredentialSecret(value: unknown): value is CredentialSecret {
  if (!isPlainObject(value)) return false;
  return Object.values(value).every((entry) => typeof entry === "string");
}

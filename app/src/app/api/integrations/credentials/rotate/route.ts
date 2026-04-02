import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { credentialAuditLogs } from "@/lib/db/schema";
import { isIntegrationProvider } from "@/lib/integrations/providers";
import {
  getActiveKeyVersion,
  rotateAllTenantCredentials,
  rotateTenantCredential,
} from "@/lib/tenant/credentials";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";
import { isManagedIntegrationsMode } from "@/lib/integrations/mode";

export async function POST(req: NextRequest) {
  if (isManagedIntegrationsMode()) {
    return NextResponse.json(
      { error: "Managed integrations mode is enabled. Rotation is handled internally." },
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
    body = {};
  }

  const provider = body.provider;

  try {
    const activeKeyVersion = getActiveKeyVersion();

    if (provider === undefined || provider === null || provider === "") {
      const results = await rotateAllTenantCredentials(landlord.id);

      await Promise.all(
        results.map((row) =>
          db.insert(credentialAuditLogs).values({
            landlordId: landlord.id,
            provider: row.provider,
            action: "rotate",
            actorType: "landlord",
            actorId: landlord.clerkUserId,
            details: row,
          })
        )
      );

      return NextResponse.json({
        activeKeyVersion,
        rotated: results.filter((r) => r.rotated).length,
        total: results.length,
        results,
      });
    }

    if (!isIntegrationProvider(provider)) {
      return NextResponse.json({ error: "provider is invalid" }, { status: 400 });
    }

    const result = await rotateTenantCredential({
      landlordId: landlord.id,
      provider,
    });

    if (!result) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    await db.insert(credentialAuditLogs).values({
      landlordId: landlord.id,
      provider,
      action: "rotate",
      actorType: "landlord",
      actorId: landlord.clerkUserId,
      details: result,
    });

    return NextResponse.json({ activeKeyVersion, ...result });
  } catch (errorUnknown) {
    const message =
      errorUnknown instanceof Error ? errorUnknown.message : "Credential rotation failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

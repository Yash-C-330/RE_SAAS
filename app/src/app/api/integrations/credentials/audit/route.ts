import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { credentialAuditLogs } from "@/lib/db/schema";
import { isManagedIntegrationsMode } from "@/lib/integrations/mode";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";

export async function GET() {
  if (isManagedIntegrationsMode()) {
    return NextResponse.json(
      { error: "Managed integrations mode is enabled. Credential management endpoints are disabled." },
      { status: 403 }
    );
  }

  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const logs = await db.query.credentialAuditLogs.findMany({
    where: and(eq(credentialAuditLogs.landlordId, landlord.id)),
    orderBy: [desc(credentialAuditLogs.createdAt)],
    limit: 50,
  });

  return NextResponse.json({ logs });
}

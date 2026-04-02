import { NextResponse } from "next/server";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";
import { getIntegrationHealthSnapshot } from "@/server/services/automations.service";

export async function GET() {
  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const health = await getIntegrationHealthSnapshot(landlord.id);
  return NextResponse.json({ health });
}

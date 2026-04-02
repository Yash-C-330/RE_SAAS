import { NextResponse } from "next/server";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";
import { getAutomationConnectionRows } from "@/server/services/automations.service";

export async function GET() {
  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const automations = await getAutomationConnectionRows(landlord.id);
  return NextResponse.json({ automations });
}

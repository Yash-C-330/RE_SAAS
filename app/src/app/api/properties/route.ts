import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";

export async function GET() {
  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const result = await db.query.properties.findMany({
    where: eq(properties.landlordId, landlord.id),
    with: { units: true },
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
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

  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const unitsCountRaw = body.unitsCount;
  const parsedUnitsCount =
    typeof unitsCountRaw === "number"
      ? unitsCountRaw
      : typeof unitsCountRaw === "string"
      ? Number.parseInt(unitsCountRaw, 10)
      : 1;

  const unitsCount = Number.isFinite(parsedUnitsCount) && parsedUnitsCount > 0 ? parsedUnitsCount : 1;

  const city = typeof body.city === "string" ? body.city.trim() : null;
  const state = typeof body.state === "string" ? body.state.trim() : null;
  const zip = typeof body.zip === "string" ? body.zip.trim() : null;
  const type = typeof body.type === "string" ? body.type.trim() : null;

  const [property] = await db
    .insert(properties)
    .values({
      landlordId: landlord.id,
      address,
      city,
      state,
      zip,
      unitsCount,
      type,
    })
    .returning();

  return NextResponse.json(property, { status: 201 });
}


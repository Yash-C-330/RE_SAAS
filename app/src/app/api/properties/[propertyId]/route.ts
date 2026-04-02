import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ propertyId: string }> }
) {
  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const { propertyId } = await context.params;
  if (!propertyId) {
    return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.address === "string") {
    const address = body.address.trim();
    if (!address) {
      return NextResponse.json({ error: "address cannot be empty" }, { status: 400 });
    }
    updates.address = address;
  }

  if (typeof body.city === "string") {
    updates.city = body.city.trim() || null;
  }

  if (typeof body.state === "string") {
    updates.state = body.state.trim() || null;
  }

  if (typeof body.zip === "string") {
    updates.zip = body.zip.trim() || null;
  }

  if (body.unitsCount !== undefined) {
    const parsed =
      typeof body.unitsCount === "number"
        ? body.unitsCount
        : typeof body.unitsCount === "string"
        ? Number.parseInt(body.unitsCount, 10)
        : null;

    if (parsed === null || !Number.isFinite(parsed) || parsed < 1) {
      return NextResponse.json({ error: "unitsCount must be a positive integer" }, { status: 400 });
    }

    updates.unitsCount = parsed;
  }

  if (typeof body.type === "string") {
    updates.type = body.type.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields provided for update" }, { status: 400 });
  }

  const [updated] = await db
    .update(properties)
    .set(updates)
    .where(and(eq(properties.id, propertyId), eq(properties.landlordId, landlord.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ propertyId: string }> }
) {
  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const { propertyId } = await context.params;
  if (!propertyId) {
    return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.landlordId, landlord.id)))
    .returning({ id: properties.id });

  if (!deleted) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, id: deleted.id });
}

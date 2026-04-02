import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";

const TENANT_STATUS = ["applicant", "active", "past"] as const;

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const { tenantId } = await context.params;
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    updates.name = name;
  }

  if (typeof body.email === "string") {
    const email = body.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "valid email is required" }, { status: 400 });
    }
    updates.email = email;
  }

  if (typeof body.phone === "string") {
    updates.phone = body.phone.trim() || null;
  }

  if (body.creditScore !== undefined) {
    const parsed =
      typeof body.creditScore === "number"
        ? body.creditScore
        : typeof body.creditScore === "string" && body.creditScore.trim() !== ""
        ? Number.parseInt(body.creditScore, 10)
        : null;

    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 300 || parsed > 850)) {
      return NextResponse.json({ error: "creditScore must be between 300 and 850" }, { status: 400 });
    }

    updates.creditScore = parsed;
  }

  if (body.annualIncome !== undefined) {
    const parsed =
      typeof body.annualIncome === "number"
        ? body.annualIncome
        : typeof body.annualIncome === "string" && body.annualIncome.trim() !== ""
        ? Number.parseFloat(body.annualIncome)
        : null;

    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      return NextResponse.json({ error: "annualIncome must be a positive number" }, { status: 400 });
    }

    updates.annualIncome = parsed !== null ? String(parsed) : null;
  }

  if (typeof body.status === "string") {
    const status = body.status.trim();
    if (!TENANT_STATUS.includes(status as (typeof TENANT_STATUS)[number])) {
      return NextResponse.json({ error: "status is invalid" }, { status: 400 });
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields provided for update" }, { status: 400 });
  }

  const [updated] = await db
    .update(tenants)
    .set(updates)
    .where(and(eq(tenants.id, tenantId), eq(tenants.landlordId, landlord.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const { tenantId } = await context.params;
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(tenants)
    .where(and(eq(tenants.id, tenantId), eq(tenants.landlordId, landlord.id)))
    .returning({ id: tenants.id });

  if (!deleted) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, id: deleted.id });
}

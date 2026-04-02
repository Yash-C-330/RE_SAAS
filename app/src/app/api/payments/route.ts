import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leases, rentPayments, tenants, units } from "@/lib/db/schema";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";

export async function GET() {
  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const rows = await db
    .select({
      paymentId: rentPayments.id,
      dueDate: rentPayments.dueDate,
      paidDate: rentPayments.paidDate,
      amount: rentPayments.amount,
      status: rentPayments.status,
      tenantName: tenants.name,
      unitNumber: units.unitNumber,
      address: units.unitNumber,
      leaseStatus: leases.status,
    })
    .from(rentPayments)
    .innerJoin(leases, eq(rentPayments.leaseId, leases.id))
    .leftJoin(tenants, eq(leases.tenantId, tenants.id))
    .leftJoin(units, eq(leases.unitId, units.id))
    .where(eq(tenants.landlordId, landlord.id))
    .orderBy(desc(rentPayments.dueDate));

  return NextResponse.json({
    payments: rows.map((row) => ({
      id: row.paymentId,
      tenant: row.tenantName ?? "Unknown tenant",
      unit: row.unitNumber ?? "Unknown unit",
      amount: formatMoney(row.amount),
      status: normalizeStatus(row.status),
      dueDate: row.dueDate,
      paidDate: row.paidDate,
      leaseStatus: row.leaseStatus,
    })),
  });
}

function formatMoney(value: string | number | null | undefined) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(numeric);
}

function normalizeStatus(value: string | null | undefined) {
  const status = (value ?? "due").toLowerCase();
  if (status === "paid" || status === "late" || status === "failed") return status;
  return "due";
}
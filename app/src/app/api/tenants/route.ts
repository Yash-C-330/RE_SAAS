import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";

const TENANT_STATUS = ["applicant", "active", "past"] as const;

export async function GET() {
  const { landlord, error } = await requireCurrentLandlord();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const result = await db.query.tenants.findMany({
    where: eq(tenants.landlordId, landlord.id),
    orderBy: (table, { desc }) => [desc(table.id)],
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "valid email is required" }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : null;

  const creditScoreRaw = body.creditScore;
  const creditScore =
    typeof creditScoreRaw === "number"
      ? creditScoreRaw
      : typeof creditScoreRaw === "string" && creditScoreRaw.trim() !== ""
      ? Number.parseInt(creditScoreRaw, 10)
      : null;

  if (creditScore !== null && (!Number.isFinite(creditScore) || creditScore < 300 || creditScore > 850)) {
    return NextResponse.json({ error: "creditScore must be between 300 and 850" }, { status: 400 });
  }

  const annualIncomeRaw = body.annualIncome;
  const annualIncome =
    typeof annualIncomeRaw === "number"
      ? annualIncomeRaw
      : typeof annualIncomeRaw === "string" && annualIncomeRaw.trim() !== ""
      ? Number.parseFloat(annualIncomeRaw)
      : null;

  if (annualIncome !== null && (!Number.isFinite(annualIncome) || annualIncome < 0)) {
    return NextResponse.json({ error: "annualIncome must be a positive number" }, { status: 400 });
  }

  const statusRaw = typeof body.status === "string" ? body.status.trim() : "applicant";
  const status = TENANT_STATUS.includes(statusRaw as (typeof TENANT_STATUS)[number]) ? statusRaw : "applicant";

  const [created] = await db
    .insert(tenants)
    .values({
      landlordId: landlord.id,
      name,
      email,
      phone,
      creditScore,
      annualIncome: annualIncome !== null ? String(annualIncome) : null,
      status,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

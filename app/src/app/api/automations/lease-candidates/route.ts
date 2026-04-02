import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leases, rentPayments, tenants } from "@/lib/db/schema";
import { and, asc, desc, eq, gte, lt, ne } from "drizzle-orm";
import { enforceSimpleRateLimit } from "@/server/middleware/simple-rate-limit";

function isSchedulerAuthorized(req: NextRequest) {
  const incoming = (req.headers.get("x-api-key") ?? "").trim();
  const schedulerSecret = (process.env.N8N_SCHEDULER_API_KEY ?? "").trim();
  const callbackSecret = (process.env.N8N_CALLBACK_SECRET ?? "").trim();

  if (!incoming) return false;
  if (schedulerSecret && incoming === schedulerSecret) return true;
  return callbackSecret.length > 0 && incoming === callbackSecret;
}

/**
 * GET /api/automations/lease-candidates
 * Returns active leases with upcoming or overdue rent payments.
 * Requires x-landlord-id header for tenant context (used by n8n workflows).
 */
export async function GET(req: NextRequest) {
  try {
    if (!isSchedulerAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateKey = `scheduler:lease-candidates:${req.headers.get("x-landlord-id") ?? "unknown"}:${req.headers.get("x-forwarded-for") ?? "no-ip"}`;
    const rate = enforceSimpleRateLimit({
      key: rateKey,
      limit: 50,
      windowSeconds: 60,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfterSeconds: rate.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rate.retryAfterSeconds),
          },
        }
      );
    }

    const landlordIdHeader = req.headers.get("x-landlord-id")?.trim();
    if (!landlordIdHeader) {
      return NextResponse.json(
        { error: "Missing x-landlord-id header" },
        { status: 400 }
      );
    }

    if (!isUuid(landlordIdHeader)) {
      return NextResponse.json({ error: "Invalid x-landlord-id header" }, { status: 400 });
    }

    const landlordId = landlordIdHeader;

    // Get all active leases for this landlord
    const activeLeasesData = await db
      .select({
        leaseId: leases.id,
        tenantId: leases.tenantId,
        unitId: leases.unitId,
        monthlyRent: leases.monthlyRent,
        tenantName: tenants.name,
        email: tenants.email,
        phone: tenants.phone,
      })
      .from(leases)
      .innerJoin(tenants, eq(leases.tenantId, tenants.id))
      .where(
        and(
          eq(leases.status, "active"),
          eq(tenants.landlordId, landlordId)
        )
      );

    if (!activeLeasesData.length) {
      return NextResponse.json({ candidates: [] });
    }

    // For each lease, choose an actionable unpaid payment:
    // 1) next upcoming/today payment, else 2) most recent overdue payment.
    const candidates = await Promise.all(
      activeLeasesData.map(async (lease) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isoToday = today.toISOString().slice(0, 10);

        const nextUpcoming = await db
          .select({
            dueDate: rentPayments.dueDate,
            paidDate: rentPayments.paidDate,
            status: rentPayments.status,
          })
          .from(rentPayments)
          .where(
            and(
              eq(rentPayments.leaseId, lease.leaseId),
              ne(rentPayments.status, "paid"),
              gte(rentPayments.dueDate, isoToday)
            )
          )
          .orderBy(asc(rentPayments.dueDate))
          .limit(1);

        const latestOverdue =
          nextUpcoming.length > 0
            ? []
            : await db
                .select({
                  dueDate: rentPayments.dueDate,
                  paidDate: rentPayments.paidDate,
                  status: rentPayments.status,
                })
                .from(rentPayments)
                .where(
                  and(
                    eq(rentPayments.leaseId, lease.leaseId),
                    ne(rentPayments.status, "paid"),
                    lt(rentPayments.dueDate, isoToday)
                  )
                )
                .orderBy(desc(rentPayments.dueDate))
                .limit(1);

        const selectedPayment = nextUpcoming[0] ?? latestOverdue[0] ?? null;
        if (!selectedPayment) {
          return null;
        }

        const dueDate = new Date(selectedPayment.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        // Calculate days until due and overdue days
        const daysToDue = Math.ceil(
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        const overdueDays = Math.max(
          0,
          Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        );

        // Only include if it's upcoming (within 7 days) or overdue
        if (daysToDue <= 7 || overdueDays > 0) {
          return {
            leaseId: lease.leaseId,
            landlordId: landlordId,
            tenantName: lease.tenantName,
            email: lease.email,
            phone: lease.phone,
            monthlyRent: lease.monthlyRent,
            daysToDue,
            overdueDays,
          };
        }

        return null;
      })
    );

    // Filter out nulls and return
    const validCandidates = candidates.filter((c) => c !== null);

    return NextResponse.json({ candidates: validCandidates });
  } catch (error) {
    console.error("[lease-candidates]", error);
    return NextResponse.json(
      { error: "Failed to fetch lease candidates" },
      { status: 500 }
    );
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

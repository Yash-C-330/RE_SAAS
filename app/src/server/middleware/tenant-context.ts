import { NextRequest, NextResponse } from "next/server";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";

export type TenantContext = {
  tenantId: string;
  landlordId: string;
  clerkUserId: string;
};

export async function requireTenantContext(req: NextRequest): Promise<
  | { ok: true; context: TenantContext }
  | { ok: false; response: NextResponse }
> {
  const tenantId = req.headers.get("x-tenant-id")?.trim();
  if (!tenantId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "x-tenant-id header is required" }, { status: 400 }),
    };
  }

  const { landlord, error } = await requireCurrentLandlord();
  if (error || !landlord) {
    return {
      ok: false,
      response: NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: error?.status ?? 401 }),
    };
  }

  if (tenantId !== landlord.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "tenantId does not match authenticated tenant" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    context: {
      tenantId,
      landlordId: landlord.id,
      clerkUserId: landlord.clerkUserId,
    },
  };
}

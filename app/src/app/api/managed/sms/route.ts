import { NextRequest } from "next/server";
import { queueManagedSmsRequest } from "@/server/controllers/managed-integrations.controller";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return queueManagedSmsRequest(req);
}

import fs from "node:fs";
import path from "node:path";

const appDir = process.cwd();
const envPath = path.join(appDir, ".env.local");

function parseEnv(content) {
  const map = new Map();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const index = line.indexOf("=");
    if (index === -1) continue;

    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    map.set(key, value);
  }
  return map;
}

function isMissing(value) {
  return !value || value.includes("...") || value.includes("your-secret") || value.includes("user:password@host/dbname");
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!fs.existsSync(envPath)) {
    throw new Error("Missing .env.local in app directory");
  }

  const env = parseEnv(fs.readFileSync(envPath, "utf8"));
  const appUrl = env.get("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
  const callbackSecret = env.get("N8N_CALLBACK_SECRET");

  if (isMissing(callbackSecret)) {
    throw new Error("N8N_CALLBACK_SECRET is required in .env.local for simulated callback test");
  }

  console.log("Step 1: Create maintenance ticket via app API");
  const createRes = await fetch(`${appUrl}/api/maintenance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Tenant",
      email: "tenant@example.com",
      phone: "+15555550100",
      description: "Kitchen sink leak with water pooling under cabinet",
    }),
  });

  if (!createRes.ok) {
    const body = await safeJson(createRes);
    throw new Error(`Failed to create maintenance ticket (${createRes.status}): ${JSON.stringify(body)}`);
  }

  const created = await createRes.json();
  const { ticketId, workflowRunId, correlationId } = created;
  console.log(`Created ticketId=${ticketId}`);

  if (!ticketId) {
    throw new Error("ticketId missing from maintenance create response");
  }

  console.log("Step 2: Simulate n8n success callback");
  const callbackRes = await fetch(`${appUrl}/api/webhooks/n8n`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": callbackSecret,
    },
    body: JSON.stringify({
      workflowName: "maintenance-router",
      trigger: "webhook",
      outcome: "success",
      ticketId,
      workflowRunId,
      correlationId,
      details: {
        category: "plumbing",
        urgency: "high",
        status: "assigned",
        estimatedCost: 250,
        routeAction: "Notify landlord within 1 hour",
      },
      idempotencyKey: `maintenance-router:${ticketId}:sim`,
    }),
  });

  if (!callbackRes.ok) {
    const body = await safeJson(callbackRes);
    throw new Error(`Callback failed (${callbackRes.status}): ${JSON.stringify(body)}`);
  }

  console.log("Step 3: Verify ticket status updated in app API");
  await sleep(1000);

  const listRes = await fetch(`${appUrl}/api/maintenance`, { method: "GET" });
  if (!listRes.ok) {
    const body = await safeJson(listRes);
    throw new Error(`Failed to list tickets (${listRes.status}): ${JSON.stringify(body)}`);
  }

  const tickets = await listRes.json();
  const ticket = Array.isArray(tickets) ? tickets.find((item) => item.id === ticketId) : null;

  if (!ticket) {
    throw new Error("Created ticket was not found when listing maintenance tickets");
  }

  if (ticket.status !== "assigned") {
    throw new Error(`Expected status=assigned, found status=${ticket.status}`);
  }

  console.log("PASS Maintenance E2E simulation succeeded");
  console.log(JSON.stringify({ ticketId, workflowRunId, correlationId, status: ticket.status }, null, 2));
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

main().catch((error) => {
  console.error("FAIL Maintenance E2E simulation failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

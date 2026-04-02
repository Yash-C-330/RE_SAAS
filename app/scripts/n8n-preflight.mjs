import fs from "node:fs";
import path from "node:path";

const appDir = process.cwd();
const envPath = path.join(appDir, ".env.local");
const envExamplePath = path.join(appDir, ".env.example");

const requiredEnv = [
  "DATABASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "N8N_WEBHOOK_URL",
  "N8N_API_KEY",
  "N8N_CALLBACK_SECRET",
  "OPENAI_API_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "RESEND_API_KEY",
  "EMAIL_FROM",
];

const optionalEnv = [
  "DOCUSIGN_INTEGRATION_KEY",
  "DOCUSIGN_ACCOUNT_ID",
  "DOCUSIGN_PRIVATE_KEY",
  "STRIPE_SECRET_KEY",
  "CLOUDFLARE_R2_BUCKET",
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY",
  "CLOUDFLARE_R2_SECRET_KEY",
];

const requiredFiles = [
  "src/app/api/maintenance/route.ts",
  "src/app/api/webhooks/n8n/route.ts",
  "src/lib/db/schema.ts",
  "../workflows/n8n_maintenance_router.workflow.json",
  "../workflows/n8n_payload_examples.json",
  "../workflows/n8n_setup_guide.md",
];

const args = process.argv.slice(2);
const skipArg = args.find((arg) => arg.startsWith("--skip="));
const skippedEnv = new Set(
  skipArg
    ? skipArg
        .slice("--skip=".length)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : []
);

function parseEnv(content) {
  const map = new Map();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const firstEq = line.indexOf("=");
    if (firstEq === -1) continue;

    const key = line.slice(0, firstEq).trim();
    let value = line.slice(firstEq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    map.set(key, value);
  }

  return map;
}

function readEnvMap() {
  if (fs.existsSync(envPath)) {
    return {
      source: ".env.local",
      values: parseEnv(fs.readFileSync(envPath, "utf8")),
    };
  }

  if (fs.existsSync(envExamplePath)) {
    return {
      source: ".env.example",
      values: parseEnv(fs.readFileSync(envExamplePath, "utf8")),
    };
  }

  return {
    source: "none",
    values: new Map(),
  };
}

function isPlaceholder(value) {
  if (!value) return true;

  const placeholders = [
    "...",
    "your-",
    "user:password@host/dbname",
    "REPLACE_WITH",
    "sk_test_...",
    "pk_test_...",
    "whsec_...",
    "price_...",
    "AC...",
    "postgresql://user:password@host/dbname",
  ];

  const normalized = value.toLowerCase();
  return placeholders.some((token) => normalized.includes(token.toLowerCase()));
}

function checkEnv(values) {
  const missing = [];
  const placeholders = [];
  const optionalMissing = [];
  const skipped = [];

  for (const key of requiredEnv) {
    if (skippedEnv.has(key)) {
      skipped.push(key);
      continue;
    }

    const value = values.get(key);
    if (!value) {
      missing.push(key);
      continue;
    }
    if (isPlaceholder(value)) {
      placeholders.push(key);
    }
  }

  for (const key of optionalEnv) {
    if (skippedEnv.has(key)) {
      skipped.push(key);
      continue;
    }

    const value = values.get(key);
    if (!value || isPlaceholder(value)) {
      optionalMissing.push(key);
    }
  }

  return { missing, placeholders, optionalMissing, skipped };
}

function checkFiles() {
  const missing = [];
  for (const file of requiredFiles) {
    const absolute = path.resolve(appDir, file);
    if (!fs.existsSync(absolute)) {
      missing.push(file);
    }
  }
  return missing;
}

async function checkCallbackHealth(values) {
  const appUrl = values.get("NEXT_PUBLIC_APP_URL");
  const callbackSecret = values.get("N8N_CALLBACK_SECRET");

  if (!appUrl || !callbackSecret || isPlaceholder(appUrl) || isPlaceholder(callbackSecret)) {
    return {
      checked: false,
      ok: false,
      message: "Skipped callback test because NEXT_PUBLIC_APP_URL or N8N_CALLBACK_SECRET is not configured.",
    };
  }

  try {
    const res = await fetch(`${appUrl.replace(/\/$/, "")}/api/webhooks/n8n`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": callbackSecret,
      },
      body: JSON.stringify({
        workflowName: "preflight-check",
        trigger: "manual",
        outcome: "skipped",
        details: { source: "n8n-preflight" },
      }),
    });

    if (!res.ok) {
      const body = await safeReadJson(res);
      return {
        checked: true,
        ok: false,
        message: `Callback endpoint returned ${res.status}`,
        details: body,
      };
    }

    return {
      checked: true,
      ok: true,
      message: "Callback endpoint accepted signed request.",
    };
  } catch (error) {
    return {
      checked: true,
      ok: false,
      message: "Callback endpoint request failed.",
      details: error instanceof Error ? { error: error.message } : undefined,
    };
  }
}

async function safeReadJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function printList(title, values) {
  if (values.length === 0) {
    console.log(`PASS ${title}`);
    return;
  }

  console.log(`FAIL ${title}`);
  for (const value of values) {
    console.log(`  - ${value}`);
  }
}

async function main() {
  console.log("RE_SAAS n8n preflight");
  console.log("=====================");

  const env = readEnvMap();
  console.log(`Env source: ${env.source}`);

  const envResults = checkEnv(env.values);
  printList("Required env vars present", envResults.missing);
  printList("Required env vars not placeholders", envResults.placeholders);

  if (envResults.skipped.length > 0) {
    console.log("WARN Skipped env validation for");
    for (const key of envResults.skipped) {
      console.log(`  - ${key}`);
    }
  }

  console.log("WARN Optional env vars missing or placeholders");
  for (const key of envResults.optionalMissing) {
    console.log(`  - ${key}`);
  }

  const missingFiles = checkFiles();
  printList("Required n8n files exist", missingFiles);

  const callback = await checkCallbackHealth(env.values);
  if (!callback.checked) {
    console.log(`WARN ${callback.message}`);
  } else if (callback.ok) {
    console.log(`PASS ${callback.message}`);
  } else {
    console.log(`FAIL ${callback.message}`);
    if (callback.details) {
      console.log(`  details: ${JSON.stringify(callback.details)}`);
    }
  }

  const hasHardFailures =
    envResults.missing.length > 0 ||
    envResults.placeholders.length > 0 ||
    missingFiles.length > 0 ||
    (callback.checked && !callback.ok);

  console.log("");
  if (hasHardFailures) {
    console.log("Result: NOT READY");
    if (skippedEnv.size > 0) {
      console.log(`Skipped checks applied: ${[...skippedEnv].join(", ")}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Result: READY for n8n workflow import and E2E testing");
  if (skippedEnv.size > 0) {
    console.log(`Skipped checks applied: ${[...skippedEnv].join(", ")}`);
  }
}

main().catch((error) => {
  console.error("Unexpected preflight error", error);
  process.exitCode = 1;
});

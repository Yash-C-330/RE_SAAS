import OpenAI from "openai";
import Stripe from "stripe";
import twilio from "twilio";
import type { CredentialSecret, IntegrationProvider } from "@/lib/tenant/credentials";

export type ProviderValidationResult = {
  ok: boolean;
  provider: IntegrationProvider;
  message: string;
  details?: Record<string, unknown>;
};

export async function validateProviderCredential(
  provider: IntegrationProvider,
  secret: CredentialSecret
): Promise<ProviderValidationResult> {
  switch (provider) {
    case "twilio":
      return validateTwilio(secret);
    case "resend":
      return validateResend(secret);
    case "openai":
      return validateOpenAI(secret);
    case "stripe":
      return validateStripe(secret);
    case "docusign":
      return validateDocuSign(secret);
    default:
      return {
        ok: false,
        provider,
        message: "Unsupported provider",
      };
  }
}

async function validateTwilio(secret: CredentialSecret): Promise<ProviderValidationResult> {
  const accountSid = secret.accountSid;
  const authToken = secret.authToken;

  if (!accountSid || !authToken) {
    return { ok: false, provider: "twilio", message: "accountSid and authToken are required" };
  }

  try {
    const client = twilio(accountSid, authToken);
    const account = await client.api.accounts(accountSid).fetch();

    return {
      ok: true,
      provider: "twilio",
      message: "Twilio credentials are valid",
      details: { status: account.status, accountSid: account.sid },
    };
  } catch (error) {
    return {
      ok: false,
      provider: "twilio",
      message: formatError(error, "Failed to validate Twilio credentials"),
    };
  }
}

async function validateResend(secret: CredentialSecret): Promise<ProviderValidationResult> {
  const apiKey = secret.apiKey;
  if (!apiKey) {
    return { ok: false, provider: "resend", message: "apiKey is required" };
  }

  try {
    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        provider: "resend",
        message: `Resend rejected credentials with status ${response.status}`,
      };
    }

    return {
      ok: true,
      provider: "resend",
      message: "Resend credentials are valid",
    };
  } catch (error) {
    return {
      ok: false,
      provider: "resend",
      message: formatError(error, "Failed to validate Resend credentials"),
    };
  }
}

async function validateOpenAI(secret: CredentialSecret): Promise<ProviderValidationResult> {
  const apiKey = secret.apiKey;
  if (!apiKey) {
    return { ok: false, provider: "openai", message: "apiKey is required" };
  }

  try {
    const client = new OpenAI({ apiKey });
    const models = await client.models.list();

    return {
      ok: true,
      provider: "openai",
      message: "OpenAI credentials are valid",
      details: { firstModel: models.data?.[0]?.id ?? null },
    };
  } catch (error) {
    return {
      ok: false,
      provider: "openai",
      message: formatError(error, "Failed to validate OpenAI credentials"),
    };
  }
}

async function validateStripe(secret: CredentialSecret): Promise<ProviderValidationResult> {
  const secretKey = secret.secretKey;
  if (!secretKey) {
    return { ok: false, provider: "stripe", message: "secretKey is required" };
  }

  try {
    const client = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia",
    });

    const balance = await client.balance.retrieve();

    return {
      ok: true,
      provider: "stripe",
      message: "Stripe credentials are valid",
      details: { availableCurrencies: [...new Set(balance.available.map((item) => item.currency))] },
    };
  } catch (error) {
    return {
      ok: false,
      provider: "stripe",
      message: formatError(error, "Failed to validate Stripe credentials"),
    };
  }
}

async function validateDocuSign(secret: CredentialSecret): Promise<ProviderValidationResult> {
  const accessToken = secret.accessToken;
  const baseUrl = secret.baseUrl ?? "https://account-d.docusign.com";

  if (!accessToken) {
    return { ok: false, provider: "docusign", message: "accessToken is required" };
  }

  try {
    const response = await fetch(`${baseUrl}/oauth/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        provider: "docusign",
        message: `DocuSign rejected credentials with status ${response.status}`,
      };
    }

    const info = (await response.json()) as { sub?: string; name?: string };

    return {
      ok: true,
      provider: "docusign",
      message: "DocuSign credentials are valid",
      details: {
        userId: info.sub ?? null,
        name: info.name ?? null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      provider: "docusign",
      message: formatError(error, "Failed to validate DocuSign credentials"),
    };
  }
}

function formatError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return `${fallback}: ${error.message}`;
  }
  return fallback;
}

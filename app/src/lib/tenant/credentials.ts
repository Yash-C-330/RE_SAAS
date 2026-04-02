import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantIntegrationCredentials } from "@/lib/db/schema";

export type IntegrationProvider = "twilio" | "resend" | "openai" | "stripe" | "docusign";

export type CredentialSecret = Record<string, string>;

type EncryptionMaterial = {
  version: number;
  key: Buffer;
};

const ENCRYPTION_PREFIX = "v";
const KEY_PATTERN = /^TENANT_CREDENTIALS_KEY_V(\d+)$/;

export function getActiveKeyVersion() {
  const raw = process.env.TENANT_CREDENTIALS_ACTIVE_KEY_VERSION ?? "1";
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error("TENANT_CREDENTIALS_ACTIVE_KEY_VERSION must be a positive integer");
  }
  return parsed;
}

function getEncryptionMaterial(version: number): EncryptionMaterial {
  const keyEnv = process.env[`TENANT_CREDENTIALS_KEY_V${version}`];
  if (!keyEnv) {
    throw new Error(`Missing tenant credentials key TENANT_CREDENTIALS_KEY_V${version}`);
  }

  const key = decodeKey(keyEnv);
  if (key.length !== 32) {
    throw new Error(`TENANT_CREDENTIALS_KEY_V${version} must decode to exactly 32 bytes`);
  }

  return { version, key };
}

function decodeKey(key: string) {
  const trimmed = key.trim();
  if (trimmed.startsWith("base64:")) {
    return Buffer.from(trimmed.slice("base64:".length), "base64");
  }
  if (trimmed.startsWith("hex:")) {
    return Buffer.from(trimmed.slice("hex:".length), "hex");
  }
  return Buffer.from(trimmed, "base64");
}

function parseEncryptedEnvelope(encrypted: string) {
  const parts = encrypted.split(".");
  if (parts.length !== 4 || !parts[0].startsWith(ENCRYPTION_PREFIX)) {
    throw new Error("Invalid credential envelope format");
  }

  const version = Number.parseInt(parts[0].slice(1), 10);
  if (!Number.isFinite(version) || version < 1) {
    throw new Error("Invalid credential envelope version");
  }

  return {
    version,
    iv: Buffer.from(parts[1], "base64url"),
    authTag: Buffer.from(parts[2], "base64url"),
    ciphertext: Buffer.from(parts[3], "base64url"),
  };
}

export function encryptCredentialSecret(secret: CredentialSecret, version = getActiveKeyVersion()) {
  const material = getEncryptionMaterial(version);
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", material.key, iv);
  const plaintext = Buffer.from(JSON.stringify(secret), "utf8");

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `v${material.version}.${iv.toString("base64url")}.${authTag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptCredentialSecret(encryptedSecret: string) {
  const envelope = parseEncryptedEnvelope(encryptedSecret);
  const material = getEncryptionMaterial(envelope.version);

  const decipher = crypto.createDecipheriv("aes-256-gcm", material.key, envelope.iv);
  decipher.setAuthTag(envelope.authTag);

  const plaintext = Buffer.concat([decipher.update(envelope.ciphertext), decipher.final()]);
  const parsed = JSON.parse(plaintext.toString("utf8")) as CredentialSecret;

  return {
    secret: parsed,
    keyVersion: envelope.version,
  };
}

export function rotateEncryptedSecret(encryptedSecret: string) {
  const { secret, keyVersion } = decryptCredentialSecret(encryptedSecret);
  const targetVersion = getActiveKeyVersion();

  if (keyVersion === targetVersion) {
    return {
      encryptedSecret,
      fromVersion: keyVersion,
      toVersion: targetVersion,
      rotated: false,
    };
  }

  return {
    encryptedSecret: encryptCredentialSecret(secret, targetVersion),
    fromVersion: keyVersion,
    toVersion: targetVersion,
    rotated: true,
  };
}

export async function upsertTenantCredential(params: {
  landlordId: string;
  provider: IntegrationProvider;
  secret: CredentialSecret;
  metadata?: Record<string, unknown>;
}) {
  const keyVersion = getActiveKeyVersion();
  const encryptedSecret = encryptCredentialSecret(params.secret, keyVersion);

  const [result] = await db
    .insert(tenantIntegrationCredentials)
    .values({
      landlordId: params.landlordId,
      provider: params.provider,
      encryptedSecret,
      keyVersion,
      metadata: params.metadata ?? null,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: [tenantIntegrationCredentials.landlordId, tenantIntegrationCredentials.provider],
      set: {
        encryptedSecret,
        keyVersion,
        metadata: params.metadata ?? null,
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}

export async function getTenantCredential(params: {
  landlordId: string;
  provider: IntegrationProvider;
}) {
  const record = await db.query.tenantIntegrationCredentials.findFirst({
    where: and(
      eq(tenantIntegrationCredentials.landlordId, params.landlordId),
      eq(tenantIntegrationCredentials.provider, params.provider),
      eq(tenantIntegrationCredentials.isActive, true)
    ),
  });

  if (!record) return null;

  return {
    ...record,
    ...decryptCredentialSecret(record.encryptedSecret),
  };
}

export async function rotateTenantCredential(params: {
  landlordId: string;
  provider: IntegrationProvider;
}) {
  const record = await db.query.tenantIntegrationCredentials.findFirst({
    where: and(
      eq(tenantIntegrationCredentials.landlordId, params.landlordId),
      eq(tenantIntegrationCredentials.provider, params.provider),
      eq(tenantIntegrationCredentials.isActive, true)
    ),
  });

  if (!record) {
    return null;
  }

  const rotation = rotateEncryptedSecret(record.encryptedSecret);

  if (!rotation.rotated) {
    return {
      provider: record.provider,
      rotated: false,
      fromVersion: rotation.fromVersion,
      toVersion: rotation.toVersion,
    };
  }

  await db
    .update(tenantIntegrationCredentials)
    .set({
      encryptedSecret: rotation.encryptedSecret,
      keyVersion: rotation.toVersion,
      updatedAt: new Date(),
    })
    .where(eq(tenantIntegrationCredentials.id, record.id));

  return {
    provider: record.provider,
    rotated: true,
    fromVersion: rotation.fromVersion,
    toVersion: rotation.toVersion,
  };
}

export async function rotateAllTenantCredentials(landlordId: string) {
  const rows = await db.query.tenantIntegrationCredentials.findMany({
    where: and(
      eq(tenantIntegrationCredentials.landlordId, landlordId),
      eq(tenantIntegrationCredentials.isActive, true)
    ),
  });

  const results: Array<{ provider: string; rotated: boolean; fromVersion: number; toVersion: number }> = [];

  for (const row of rows) {
    const rotation = rotateEncryptedSecret(row.encryptedSecret);

    if (rotation.rotated) {
      await db
        .update(tenantIntegrationCredentials)
        .set({
          encryptedSecret: rotation.encryptedSecret,
          keyVersion: rotation.toVersion,
          updatedAt: new Date(),
        })
        .where(eq(tenantIntegrationCredentials.id, row.id));
    }

    results.push({
      provider: row.provider,
      rotated: rotation.rotated,
      fromVersion: rotation.fromVersion,
      toVersion: rotation.toVersion,
    });
  }

  return results;
}

export function getConfiguredKeyVersions() {
  return Object.keys(process.env)
    .map((k) => k.match(KEY_PATTERN))
    .filter((v): v is RegExpMatchArray => Boolean(v))
    .map((match) => Number.parseInt(match[1], 10))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
}

export function maskCredentialSecret(secret: CredentialSecret) {
  const masked: Record<string, string> = {};

  for (const [key, value] of Object.entries(secret)) {
    masked[key] = maskValue(value);
  }

  return masked;
}

export function assertSupportedProvider(value: unknown): value is IntegrationProvider {
  return value === "twilio" || value === "resend" || value === "openai" || value === "stripe" || value === "docusign";
}

function maskValue(value: string) {
  if (value.length <= 8) {
    return "*".repeat(Math.max(value.length, 4));
  }
  return `${value.slice(0, 4)}${"*".repeat(Math.max(value.length - 8, 4))}${value.slice(-4)}`;
}

"use client";

import { useEffect, useMemo, useState } from "react";

type Provider = "twilio" | "resend" | "openai" | "stripe" | "docusign";

type ProviderRow = {
  id: string;
  provider: Provider;
  keyVersion: number;
  metadata: Record<string, unknown> | null;
  updatedAt: string | null;
  isActive: boolean;
};

type CredentialsResponse = {
  mode?: "managed" | "self_service";
  providers?: ProviderRow[];
  managedStatus?: Partial<Record<Provider, boolean>>;
};

type AuditLog = {
  id: string;
  provider: string | null;
  action: string;
  actorType: string;
  actorId: string | null;
  createdAt: string | null;
  details: Record<string, unknown> | null;
};

const PROVIDERS: Provider[] = ["twilio", "resend", "openai", "stripe", "docusign"];

export function IntegrationCredentialsPanel() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [mode, setMode] = useState<"managed" | "self_service">("self_service");
  const [managedStatus, setManagedStatus] = useState<Partial<Record<Provider, boolean>>>({});

  const [selectedProvider, setSelectedProvider] = useState<Provider>("twilio");
  const [secretJson, setSecretJson] = useState('{\n  "accountSid": "",\n  "authToken": ""\n}');
  const [metadataJson, setMetadataJson] = useState('{\n  "label": "primary"\n}');

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  const connected = useMemo(() => new Set(providers.map((p) => p.provider)), [providers]);

  useEffect(() => {
    void refreshAll();
  }, []);

  async function refreshAll() {
    setLoading(true);
    setMessage("");

    try {
      const [credentialsRes, auditRes] = await Promise.all([
        fetch("/api/integrations/credentials", { cache: "no-store" }),
        fetch("/api/integrations/credentials/audit", { cache: "no-store" }),
      ]);

      if (credentialsRes.ok) {
        const credentialsData = (await credentialsRes.json()) as CredentialsResponse;
        setMode(credentialsData.mode ?? "self_service");
        setProviders(credentialsData.providers ?? []);
        setManagedStatus(credentialsData.managedStatus ?? {});
      }

      if (auditRes.ok) {
        const auditData = (await auditRes.json()) as { logs: AuditLog[] };
        setLogs(auditData.logs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function validateOnly() {
    const secret = parseJson(secretJson, "secret");
    if (!secret) return;

    await runAction("validate", async () => {
      const res = await fetch("/api/integrations/credentials/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, secret }),
      });

      const body = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? body.message ?? "Validation failed");
      }

      setMessage(body.message ?? "Credentials validated");
      await refreshAll();
    });
  }

  async function saveCredential() {
    const secret = parseJson(secretJson, "secret");
    if (!secret) return;

    const metadata = parseJson(metadataJson, "metadata", true);
    if (metadata === undefined) return;

    await runAction("save", async () => {
      const res = await fetch("/api/integrations/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          secret,
          metadata,
          validate: true,
        }),
      });

      const body = (await res.json()) as { error?: string; provider?: string; keyVersion?: number };
      if (!res.ok) {
        throw new Error(body.error ?? "Save failed");
      }

      setMessage(`Saved ${body.provider} credential (key v${body.keyVersion ?? "?"})`);
      await refreshAll();
    });
  }

  async function rotate(provider?: Provider) {
    await runAction(provider ? `rotate-${provider}` : "rotate-all", async () => {
      const res = await fetch("/api/integrations/credentials/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(provider ? { provider } : {}),
      });

      const body = (await res.json()) as {
        error?: string;
        rotated?: number | boolean;
        provider?: string;
        toVersion?: number;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Rotation failed");
      }

      if (provider) {
        setMessage(`Rotated ${provider} to key version ${body.toVersion ?? "?"}`);
      } else {
        const rotatedCount = typeof body.rotated === "number" ? body.rotated : 0;
        setMessage(`Rotation complete. Updated ${rotatedCount} credentials.`);
      }
      await refreshAll();
    });
  }

  async function runAction(name: string, fn: () => Promise<void>) {
    setBusyAction(name);
    setMessage("");
    try {
      await fn();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setBusyAction(null);
    }
  }

  function parseJson(value: string, fieldName: string, allowEmpty = false) {
    if (allowEmpty && value.trim().length === 0) {
      return null;
    }

    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`${fieldName} must be a JSON object`);
      }
      return parsed;
    } catch {
      setMessage(`${fieldName} must be valid JSON object`);
      return undefined;
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold text-[var(--ink-900)]">Tenant Integration Credentials</h2>
        <p className="mt-1 text-sm text-[var(--ink-500)]">
          Save provider credentials per landlord, validate before use, and rotate encryption keys safely.
        </p>

        {mode === "managed" && (
          <div className="mt-4 rounded-xl border border-[var(--sand-200)] bg-[var(--sand-100)] px-4 py-3 text-sm text-[var(--ink-700)]">
            Managed mode is enabled. Provider credentials are handled internally by your operations team.
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PROVIDERS.map((provider) => (
            <div key={provider} className="rounded-xl border border-[var(--sand-200)] bg-white px-3 py-2">
              <p className="text-sm font-semibold uppercase text-[var(--ink-700)]">{provider}</p>
              <p
                className={
                  mode === "managed"
                    ? managedStatus[provider]
                      ? "text-xs text-emerald-600"
                      : "text-xs text-amber-600"
                    : connected.has(provider)
                      ? "text-xs text-emerald-600"
                      : "text-xs text-amber-600"
                }
              >
                {mode === "managed"
                  ? managedStatus[provider]
                    ? "Connected (managed)"
                    : "Pending internal setup"
                  : connected.has(provider)
                    ? "Connected"
                    : "Not connected"}
              </p>
            </div>
          ))}
        </div>

        {mode === "self_service" && (
          <>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <label className="text-sm text-[var(--ink-700)]">
            Provider
            <select
              className="mt-1 w-full rounded-xl border border-[var(--sand-200)] bg-white px-3 py-2"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as Provider)}
            >
              {PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-[var(--ink-700)]">
            Metadata (JSON)
            <textarea
              className="mt-1 h-28 w-full rounded-xl border border-[var(--sand-200)] bg-white px-3 py-2 font-mono text-xs"
              value={metadataJson}
              onChange={(e) => setMetadataJson(e.target.value)}
            />
          </label>

          <label className="text-sm text-[var(--ink-700)] lg:col-span-2">
            Secret (JSON)
            <textarea
              className="mt-1 h-40 w-full rounded-xl border border-[var(--sand-200)] bg-white px-3 py-2 font-mono text-xs"
              value={secretJson}
              onChange={(e) => setSecretJson(e.target.value)}
            />
          </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-[var(--sand-100)] px-4 py-2 text-sm font-semibold text-[var(--ink-800)]"
            onClick={() => void validateOnly()}
            disabled={busyAction !== null}
          >
            {busyAction === "validate" ? "Validating..." : "Validate"}
          </button>
          <button
            type="button"
            className="rounded-xl bg-[var(--mint-500)] px-4 py-2 text-sm font-semibold text-white"
            onClick={() => void saveCredential()}
            disabled={busyAction !== null}
          >
            {busyAction === "save" ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            className="rounded-xl bg-[var(--ink-900)] px-4 py-2 text-sm font-semibold text-white"
            onClick={() => void rotate(selectedProvider)}
            disabled={busyAction !== null}
          >
            {busyAction === `rotate-${selectedProvider}` ? "Rotating..." : "Rotate selected"}
          </button>
          <button
            type="button"
            className="rounded-xl border border-[var(--sand-300)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-700)]"
            onClick={() => void rotate()}
            disabled={busyAction !== null}
          >
            {busyAction === "rotate-all" ? "Rotating all..." : "Rotate all"}
          </button>
            </div>
          </>
        )}

        {message && <p className="mt-3 text-sm text-[var(--ink-700)]">{message}</p>}
      </div>

      <div className="glass-card p-5">
        <h3 className="text-base font-semibold text-[var(--ink-900)]">Credential audit trail</h3>
        <p className="mt-1 text-sm text-[var(--ink-500)]">Latest 50 events for create, validate, rotate, and runtime n8n access.</p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--sand-200)] text-[var(--ink-500)]">
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Provider</th>
                <th className="px-2 py-2">Action</th>
                <th className="px-2 py-2">Actor</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-[var(--sand-100)] text-[var(--ink-800)]">
                  <td className="px-2 py-2">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}</td>
                  <td className="px-2 py-2">{log.provider ?? "-"}</td>
                  <td className="px-2 py-2">{log.action}</td>
                  <td className="px-2 py-2">{log.actorType}</td>
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr>
                  <td className="px-2 py-4 text-[var(--ink-500)]" colSpan={4}>
                    No credential audit entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

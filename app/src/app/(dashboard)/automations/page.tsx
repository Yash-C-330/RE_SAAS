"use client";

import { useEffect, useMemo, useState } from "react";
import { IntegrationCredentialsPanel } from "@/components/automations/integration-credentials-panel";

type AutomationRow = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  triggerType: "webhook" | "cron" | "inbound";
  integrations: string[];
  manualRunSupported: boolean;
  connected: boolean;
  missingProviders: string[];
  n8nReady: boolean;
  lastStatus: string | null;
  lastRunAt: string | null;
};

type HealthSnapshot = {
  checkedAt: string;
  databaseOk: boolean;
  n8nConfigured: boolean;
  providersConfigured: number;
  providersTotal: number;
  providerStatus: Record<string, boolean>;
  failedRunsLast24h: number;
  lastSuccessfulRunAt: string | null;
};

export default function AutomationsPage() {
  const [workflows, setWorkflows] = useState<AutomationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectedCount = useMemo(() => workflows.filter((wf) => wf.connected).length, [workflows]);

  useEffect(() => {
    void loadAutomations();
  }, []);

  async function loadAutomations() {
    setLoading(true);
    setError(null);
    try {
      const [automationsResponse, healthResponse] = await Promise.all([
        fetch("/api/automations", { cache: "no-store" }),
        fetch("/api/integrations/health", { cache: "no-store" }),
      ]);

      const payload = (await automationsResponse.json()) as {
        automations?: AutomationRow[];
        error?: string;
      };
      const healthPayload = (await healthResponse.json()) as {
        health?: HealthSnapshot;
        error?: string;
      };

      if (!automationsResponse.ok) {
        throw new Error(payload.error ?? "Failed to load automation status");
      }

      if (!healthResponse.ok) {
        throw new Error(healthPayload.error ?? "Failed to load integration health");
      }

      setWorkflows(payload.automations ?? []);
      setHealth(healthPayload.health ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load automation status");
    } finally {
      setLoading(false);
    }
  }

  async function runNow(workflowId: string) {
    setBusyId(workflowId);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/automations/${workflowId}/run`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; workflowRunId?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to trigger automation");
      }

      setMessage(`Triggered ${workflowId}. Run ID: ${payload.workflowRunId ?? "pending"}`);
      await loadAutomations();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Failed to trigger automation");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-[var(--ink-900)]">Automations</h1>
        <p className="mt-1 text-sm text-[var(--ink-500)]">n8n workflows running on your behalf. Status, provider readiness, and run controls are now live.</p>
        <p className="mt-2 text-xs font-semibold text-[var(--ink-600)]">
          Connected: {connectedCount}/{workflows.length || 0}
        </p>
        {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      </div>

      {health ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-500)]">Database</p>
            <p className={`mt-1 text-sm font-semibold ${health.databaseOk ? "text-emerald-700" : "text-rose-700"}`}>
              {health.databaseOk ? "Healthy" : "Unavailable"}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-500)]">n8n Bridge</p>
            <p className={`mt-1 text-sm font-semibold ${health.n8nConfigured ? "text-emerald-700" : "text-amber-700"}`}>
              {health.n8nConfigured ? "Configured" : "Missing config"}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-500)]">Providers</p>
            <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">
              {health.providersConfigured}/{health.providersTotal} ready
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-500)]">Failed Runs (24h)</p>
            <p className={`mt-1 text-sm font-semibold ${health.failedRunsLast24h > 0 ? "text-rose-700" : "text-emerald-700"}`}>
              {health.failedRunsLast24h}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4">
        {loading ? (
          <div className="glass-card p-5 text-sm text-[var(--ink-500)]">Loading automations...</div>
        ) : null}

        {!loading && workflows.map((wf) => (
          <div
            key={wf.id}
            className="glass-card flex items-start justify-between gap-4 p-5"
          >
            <div className="flex-1">
              <p className="font-semibold text-[var(--ink-900)]">{wf.name}</p>
              <p className="mt-1 text-sm text-[var(--ink-500)]">{wf.description}</p>

              {!wf.connected ? (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  {wf.n8nReady ? `Missing providers: ${wf.missingProviders.join(", ") || "none"}` : "n8n configuration is incomplete"}
                </p>
              ) : null}

              {wf.connected && !wf.manualRunSupported ? (
                <p className="mt-2 text-xs text-[var(--ink-500)]">
                  Runs automatically via {wf.triggerType === "cron" ? "schedule" : "inbound events"} in n8n.
                </p>
              ) : null}

              {wf.lastStatus ? (
                <p className="mt-2 text-xs text-[var(--ink-500)]">
                  Last run: {wf.lastStatus}
                  {wf.lastRunAt ? ` at ${new Date(wf.lastRunAt).toLocaleString()}` : ""}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-[var(--sand-100)] px-2.5 py-1 text-xs font-medium text-[var(--ink-700)]">
                  {wf.trigger}
                </span>
                {wf.integrations.map((i) => (
                  <span key={i} className="rounded-full bg-[var(--mint-500)]/10 px-2.5 py-1 text-xs font-medium text-[var(--mint-600)]">
                    {i}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 shrink-0">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  wf.connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {wf.connected ? "Connected" : "Not connected"}
              </span>
              <button
                type="button"
                onClick={() => void runNow(wf.id)}
                disabled={!wf.connected || !wf.manualRunSupported || busyId === wf.id}
                className="rounded-lg bg-[var(--ink-900)] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                {!wf.manualRunSupported ? "Auto" : busyId === wf.id ? "Running..." : "Run now"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <IntegrationCredentialsPanel />
    </div>
  );
}


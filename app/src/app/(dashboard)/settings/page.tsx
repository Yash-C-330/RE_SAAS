"use client";

import { useEffect, useMemo, useState } from "react";

type QuotaState = {
  smsLimit: number;
  emailLimit: number;
  aiTokenLimit: number;
  bankLinkConfirmationPhrase: string;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
};

type SettingsResponse = {
  preferences?: Partial<QuotaState> & { id?: string | null; landlordId?: string | null };
  error?: string;
};

const DEFAULT_QUOTA_STATE: QuotaState = {
  smsLimit: 250,
  emailLimit: 500,
  aiTokenLimit: 250000,
  bankLinkConfirmationPhrase: "I understand this bank account will be used for rent collection",
  emailNotificationsEnabled: true,
  smsNotificationsEnabled: true,
};

export default function SettingsPage() {
  const [quotas, setQuotas] = useState<QuotaState>(DEFAULT_QUOTA_STATE);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const payload = (await response.json()) as SettingsResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load settings");
      }

      setQuotas((current) => ({
        ...current,
        ...(payload.preferences ?? {}),
        smsLimit: payload.preferences?.smsLimit ?? current.smsLimit,
        emailLimit: payload.preferences?.emailLimit ?? current.emailLimit,
        aiTokenLimit: payload.preferences?.aiTokenLimit ?? current.aiTokenLimit,
        bankLinkConfirmationPhrase:
          payload.preferences?.bankLinkConfirmationPhrase ?? current.bankLinkConfirmationPhrase,
        emailNotificationsEnabled: payload.preferences?.emailNotificationsEnabled ?? current.emailNotificationsEnabled,
        smsNotificationsEnabled: payload.preferences?.smsNotificationsEnabled ?? current.smsNotificationsEnabled,
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    const parts = [] as string[];
    if (quotas.emailNotificationsEnabled) parts.push(`${quotas.emailLimit} emails/mo`);
    if (quotas.smsNotificationsEnabled) parts.push(`${quotas.smsLimit} SMS/mo`);
    parts.push(`${quotas.aiTokenLimit.toLocaleString()} AI tokens/mo`);
    return parts.join(" • ");
  }, [quotas]);

  function updateQuota<K extends keyof QuotaState>(key: K, value: QuotaState[K]) {
    setQuotas((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function saveSettings() {
    setSaved(false);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quotas),
      });
      const payload = (await response.json()) as SettingsResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save settings");
      }

      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save settings");
    }
  }

  return (
    <div className="space-y-6">
      <section className="glass-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-500)]">Settings</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--ink-900)]">Communication and billing controls</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--ink-500)]">
          Keep quotas explicit, let landlords choose what they actually use, and make critical financial actions require clear confirmation.
        </p>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <article className="glass-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--ink-900)]">Monthly quota settings</h2>
              <p className="mt-1 text-sm text-[var(--ink-500)]">Users can choose what is included instead of being forced into bloated tiers.</p>
            </div>
            <span className="rounded-full bg-[var(--mint-500)]/10 px-3 py-1 text-xs font-semibold text-[var(--mint-700)]">
              Transparent mode
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="rounded-2xl border border-[var(--sand-200)] bg-white p-4 text-sm text-[var(--ink-700)]">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-[var(--ink-900)]">Email reminders</span>
                <input
                  type="checkbox"
                  checked={quotas.emailNotificationsEnabled}
                  onChange={(event) => updateQuota("emailNotificationsEnabled", event.target.checked)}
                  disabled={loading}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--ink-500)]">Set the monthly reminder budget. Keep it high enough for every tenant, not hidden behind a pricing tier.</p>
              <input
                type="range"
                min={50}
                max={5000}
                step={50}
                value={quotas.emailLimit}
                onChange={(event) => updateQuota("emailLimit", Number(event.target.value))}
                className="mt-4 w-full"
                disabled={loading}
              />
              <p className="mt-2 text-sm font-semibold text-[var(--ink-900)]">{quotas.emailLimit} emails / month</p>
            </label>

            <label className="rounded-2xl border border-[var(--sand-200)] bg-white p-4 text-sm text-[var(--ink-700)]">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-[var(--ink-900)]">SMS reminders</span>
                <input
                  type="checkbox"
                  checked={quotas.smsNotificationsEnabled}
                  onChange={(event) => updateQuota("smsNotificationsEnabled", event.target.checked)}
                  disabled={loading}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--ink-500)]">Used for rent reminders and urgent maintenance follow-up. Buyers choose the quantity, not a bundled plan.</p>
              <input
                type="range"
                min={25}
                max={2500}
                step={25}
                value={quotas.smsLimit}
                onChange={(event) => updateQuota("smsLimit", Number(event.target.value))}
                className="mt-4 w-full"
                disabled={loading}
              />
              <p className="mt-2 text-sm font-semibold text-[var(--ink-900)]">{quotas.smsLimit} SMS / month</p>
            </label>

            <label className="rounded-2xl border border-[var(--sand-200)] bg-white p-4 text-sm text-[var(--ink-700)] md:col-span-2">
              <span className="font-semibold text-[var(--ink-900)]">AI token allowance</span>
              <p className="mt-2 text-xs text-[var(--ink-500)]">Enough for summaries, triage, and drafting without overcomplicating the billing model.</p>
              <input
                type="range"
                min={50000}
                max={1000000}
                step={50000}
                value={quotas.aiTokenLimit}
                onChange={(event) => updateQuota("aiTokenLimit", Number(event.target.value))}
                className="mt-4 w-full"
                disabled={loading}
              />
              <p className="mt-2 text-sm font-semibold text-[var(--ink-900)]">{quotas.aiTokenLimit.toLocaleString()} AI tokens / month</p>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={loading}
              className="rounded-xl bg-[var(--mint-500)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--mint-600)] disabled:opacity-60"
            >
              {loading ? "Loading..." : "Save settings"}
            </button>
            <p className={`text-sm ${saved ? "text-emerald-700" : "text-[var(--ink-500)]"}`}>
              {saved ? "Settings saved." : "Adjust the knobs, then save once."}
            </p>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="glass-card p-6">
            <h2 className="text-lg font-semibold text-[var(--ink-900)]">Current summary</h2>
            <p className="mt-2 text-sm text-[var(--ink-500)]">{loading ? "Loading saved preferences..." : summary}</p>
          </article>

          <article className="glass-card p-6">
            <h2 className="text-lg font-semibold text-[var(--ink-900)]">Bank-link confirmation</h2>
            <p className="mt-2 text-sm text-[var(--ink-500)]">
              Require a typed confirmation before linking a bank account for automated rent collection.
            </p>
            <div className="mt-4 rounded-2xl border border-[var(--sand-200)] bg-white p-4 text-sm text-[var(--ink-700)]">
              <p className="font-semibold text-[var(--ink-900)]">Required phrase</p>
              <p className="mt-1">{quotas.bankLinkConfirmationPhrase}</p>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantIntegrationCredentials } from "@/lib/db/schema";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";
import { getManagedProviderStatus, isManagedIntegrationsMode } from "@/lib/integrations/mode";

const REQUIRED_PROVIDERS = ["openai", "twilio", "resend"] as const;

const attentionItems = [
  {
    title: "2 rent payments need action",
    description: "Open the payment desk to mark offline payments, remove late fees, or send a reminder.",
    href: "/payments",
    tone: "amber",
  },
  {
    title: "1 maintenance request is waiting",
    description: "Review the triage queue and use the AI suggestion to assign the next step.",
    href: "/maintenance",
    tone: "mint",
  },
  {
    title: "Bank-link confirmation has not been completed",
    description: "Require a typed confirmation before enabling automatic rent collection.",
    href: "/settings",
    tone: "sand",
  },
] as const;

export default async function DashboardPage() {
  const { userId } = await auth();
  const landlordResult = await requireCurrentLandlord();
  const connectedProviders = new Set<string>();
  const managedMode = isManagedIntegrationsMode();

  if (managedMode) {
    const managedStatus = getManagedProviderStatus();
    for (const provider of REQUIRED_PROVIDERS) {
      if (managedStatus[provider]) {
        connectedProviders.add(provider);
      }
    }
  } else if (landlordResult.landlord) {
    const providerRows = await db.query.tenantIntegrationCredentials.findMany({
      where: and(
        eq(tenantIntegrationCredentials.landlordId, landlordResult.landlord.id),
        eq(tenantIntegrationCredentials.isActive, true)
      ),
      columns: { provider: true },
    });

    for (const row of providerRows) {
      connectedProviders.add(row.provider);
    }
  }

  const onboardingItems = REQUIRED_PROVIDERS.map((provider) => ({
    provider,
    connected: connectedProviders.has(provider),
  }));
  const pendingCount = onboardingItems.filter((item) => !item.connected).length;

  return (
    <div className="space-y-6">
      <section className="glass-card overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-500)]">Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--ink-900)] sm:text-4xl">What needs attention today</h1>
            <p className="mt-2 text-sm text-[var(--ink-500)]">
              Signed in as {userId ? "an authenticated user" : "guest mode"}. Focus on the handful of tasks that actually need a decision.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/payments" className="rounded-xl bg-[var(--mint-500)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--mint-600)]">
              Open payments
            </Link>
            <Link href="/settings" className="rounded-xl border border-[var(--sand-200)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--sand-50)]">
              Review quotas
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="glass-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--ink-900)]">Today’s attention queue</h2>
              <p className="mt-1 text-sm text-[var(--ink-500)]">A short list of actions that unblock cash flow and operations.</p>
            </div>
            <span className="rounded-full bg-[var(--mint-500)]/10 px-3 py-1 text-xs font-semibold text-[var(--mint-700)]">
              {pendingCount} setup item{pendingCount === 1 ? "" : "s"} remaining
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {attentionItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--sand-200)] bg-white p-4 transition hover:bg-[var(--sand-50)]"
              >
                <div>
                  <h3 className="text-sm font-semibold text-[var(--ink-900)]">{item.title}</h3>
                  <p className="mt-1 text-sm text-[var(--ink-500)]">{item.description}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[item.tone]}`}>Open</span>
              </Link>
            ))}
          </div>
        </article>

        <article className="glass-card p-6">
          <h2 className="text-lg font-semibold text-[var(--ink-900)]">Workflow health</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <HealthCard label="Rent collection" value="Ready for reminders" tone="emerald" />
            <HealthCard label="Maintenance triage" value="AI suggestions live" tone="mint" />
            <HealthCard label="Bank link" value="Confirmation required" tone="amber" />
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total units" value="--" sub="across all properties" />
        <MetricCard label="Rent collected" value="--" sub="this month" />
        <MetricCard label="Overdue payments" value="--" sub="needs action" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="glass-card p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--ink-900)]">Integration readiness</h2>
              <p className="mt-1 text-sm text-[var(--ink-500)]">Required providers for core workflows.</p>
            </div>
            <Link href="/automations" className="text-sm font-semibold text-[var(--mint-700)] hover:underline">
              View automations
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {onboardingItems.map((item) => (
              <div key={item.provider} className="rounded-2xl border border-[var(--sand-200)] bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-500)]">{item.provider}</p>
                <p className={item.connected ? "mt-2 text-sm font-semibold text-emerald-600" : "mt-2 text-sm font-semibold text-amber-700"}>
                  {item.connected ? (managedMode ? "Connected (managed)" : "Connected") : (managedMode ? "Pending internal setup" : "Pending")}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card p-6">
          <h2 className="text-lg font-semibold text-[var(--ink-900)]">Recent activity</h2>
          <div className="mt-4 space-y-3">
            <ActivityRow title="Maintenance request created" description="Tenant submitted a new issue from the mobile form." />
            <ActivityRow title="Reminder draft prepared" description="AI drafted the next rent reminder for review." />
            <ActivityRow title="Payment desk opened" description="Landlord reviewed overdue balances from one screen." />
          </div>
        </article>
      </section>
    </div>
  );
}

const toneClasses: Record<(typeof attentionItems)[number]["tone"], string> = {
  amber: "bg-amber-100 text-amber-700",
  mint: "bg-emerald-100 text-emerald-700",
  sand: "bg-[var(--sand-100)] text-[var(--ink-700)]",
};

function HealthCard({ label, value, tone }: { label: string; value: string; tone: "emerald" | "mint" | "amber" }) {
  const classes: Record<typeof tone, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    mint: "bg-[var(--mint-500)]/10 text-[var(--mint-700)]",
    amber: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="rounded-2xl border border-[var(--sand-200)] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-500)]">{label}</p>
      <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes[tone]}`}>{value}</p>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="glass-card p-5">
      <p className="text-sm text-[var(--ink-500)]">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-[var(--ink-900)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--ink-500)]">{sub}</p>
    </div>
  );
}

function ActivityRow({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-[var(--sand-200)] bg-white p-4">
      <p className="text-sm font-semibold text-[var(--ink-900)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--ink-500)]">{description}</p>
    </div>
  );
}
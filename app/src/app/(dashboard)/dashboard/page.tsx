import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantIntegrationCredentials } from "@/lib/db/schema";
import { requireCurrentLandlord } from "@/lib/tenant/landlord";
import { getManagedProviderStatus, isManagedIntegrationsMode } from "@/lib/integrations/mode";

const REQUIRED_PROVIDERS = ["openai", "twilio", "resend"] as const;

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

  // TODO: fetch real stats per landlord once landlord_id resolved via Clerk userId
  const stats = [
    { label: "Total Units", value: "--", sub: "across all properties" },
    { label: "Rent Collected", value: "--", sub: "this month" },
    { label: "Overdue Payments", value: "--", sub: "needs action" },
    { label: "Open Tickets", value: "--", sub: "maintenance queue" },
  ];

  return (
    <div className="space-y-6">
      <section className="glass-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-500)]">Dashboard</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--ink-900)]">Welcome back</h1>
        <p className="mt-2 text-sm text-[var(--ink-500)]">Signed in as {userId ? "an authenticated user" : "guest mode"}. Monitor operations and workflow health below.</p>
      </section>

      <section className="glass-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink-900)]">Setup checklist</h2>
            <p className="mt-1 text-sm text-[var(--ink-500)]">
              {managedMode
                ? `Integrations are managed internally for you. ${pendingCount === 0 ? "Everything required is configured." : `${pendingCount} items still need internal setup.`}`
                : `Connect required providers for automation workflows. ${pendingCount === 0 ? "All required integrations are connected." : `${pendingCount} remaining.`}`}
            </p>
          </div>
          <Link
            href="/automations"
            className="rounded-xl bg-[var(--mint-500)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--mint-600)]"
          >
            Open Automations
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {onboardingItems.map((item) => (
            <div key={item.provider} className="rounded-xl border border-[var(--sand-200)] bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-500)]">{item.provider}</p>
              <p className={item.connected ? "mt-2 text-sm font-semibold text-emerald-600" : "mt-2 text-sm font-semibold text-amber-700"}>
                {item.connected ? (managedMode ? "Connected (managed)" : "Connected") : (managedMode ? "Pending internal setup" : "Pending")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-5">
            <p className="text-sm text-[var(--ink-500)]">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold text-[var(--ink-900)]">{s.value}</p>
            <p className="mt-1 text-xs text-[var(--ink-500)]">{s.sub}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-[var(--ink-900)]">Recent Activity</h2>
          <p className="mt-3 text-sm text-[var(--ink-500)]">No activity yet. Create your first property and submit a maintenance request to populate the timeline.</p>
        </div>
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-[var(--ink-900)]">Workflow Status</h2>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--sand-200)] bg-white px-4 py-3">
            <p className="text-sm font-medium text-[var(--ink-700)]">Maintenance router</p>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Setup pending</span>
          </div>
        </div>
      </section>
    </div>
  );
}


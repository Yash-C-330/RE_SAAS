import Link from "next/link";

export default function HomePage() {
  return (
    <main className="grain-overlay min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--ink-700)]">
            AI Property Manager
          </p>
          <div className="hidden gap-2 sm:flex">
            <Link href="/sign-in" className="rounded-full border border-[var(--sand-200)] px-4 py-2 text-sm font-medium text-[var(--ink-700)] hover:bg-white">
              Sign in
            </Link>
            <Link href="/sign-up" className="rounded-full bg-[var(--mint-500)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--mint-600)]">
              Start free
            </Link>
          </div>
        </header>

        <section className="glass-card relative overflow-hidden p-8 sm:p-12">
          <div className="absolute -right-12 -top-10 h-40 w-40 rounded-full bg-[var(--amber-500)]/15 blur-2xl" />
          <div className="absolute -left-12 bottom-0 h-44 w-44 rounded-full bg-[var(--mint-500)]/20 blur-2xl" />

          <p className="relative z-10 inline-flex rounded-full border border-[var(--sand-200)] bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-700)]">
            Workflow-first landlord OS
          </p>
          <h1 className="relative z-10 mt-5 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            Scale rental operations with a
            <span className="brand-gradient"> human-feeling AI autopilot</span>
          </h1>
          <p className="relative z-10 mt-5 max-w-2xl text-base text-[var(--ink-500)] sm:text-lg">
            From maintenance triage to monthly owner reporting, your workflows run automatically while you stay in control.
          </p>

          <div className="relative z-10 mt-8 flex flex-wrap gap-3">
            <Link href="/sign-up" className="rounded-xl bg-[var(--mint-500)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--mint-600)]">
              Create account
            </Link>
            <Link href="/maintenance/new" className="rounded-xl border border-[var(--sand-200)] bg-white px-5 py-3 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--sand-50)]">
              Test tenant form
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Rent reminders", "7/3/1 day sequences, overdue escalation, and audit logs."],
            ["Maintenance routing", "AI urgency + category tags and instant owner notifications."],
            ["Owner intelligence", "Monthly NOI snapshots and action plans generated for you."],
          ].map(([title, description]) => (
            <article key={title} className="glass-card p-6">
              <h2 className="text-base font-semibold text-[var(--ink-900)]">{title}</h2>
              <p className="mt-2 text-sm text-[var(--ink-500)]">{description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

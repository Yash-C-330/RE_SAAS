import Link from "next/link";
import { PricingSection } from "@/components/marketing/pricing-section";

export default function PricingPage() {
  return (
    <main className="grain-overlay min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--ink-700)]">
            AI Property Manager
          </Link>
          <Link href="/sign-up" className="rounded-full bg-[var(--mint-500)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--mint-600)]">
            Start free
          </Link>
        </header>

        <section className="mt-8 glass-card relative overflow-hidden p-8 sm:p-12">
          <div className="absolute -right-12 -top-10 h-40 w-40 rounded-full bg-[var(--amber-500)]/15 blur-2xl" />
          <div className="absolute -left-12 bottom-0 h-44 w-44 rounded-full bg-[var(--mint-500)]/20 blur-2xl" />

          <p className="relative z-10 inline-flex rounded-full border border-[var(--sand-200)] bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-700)]">
            Transparent pricing
          </p>
          <h1 className="relative z-10 mt-5 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            Pricing that scales with your portfolio, not with hidden feature gates.
          </h1>
          <p className="relative z-10 mt-5 max-w-2xl text-base text-[var(--ink-500)] sm:text-lg">
            Small landlords need a clear formula, predictable billing, and core workflows included from day one.
          </p>
        </section>

        <PricingSection />
      </div>
    </main>
  );
}
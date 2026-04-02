import Link from "next/link";
import { formatUsd, PRICING_EXAMPLES, PRICING_MODEL } from "@/lib/pricing";

export function PricingSection() {
  return (
    <section className="mt-8 rounded-[2rem] border border-[var(--sand-200)] bg-white/85 p-6 shadow-[0_24px_80px_rgba(31,29,27,0.08)] backdrop-blur sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--mint-700)]">
            Pricing
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)] sm:text-3xl">
            One simple formula. No feature traps.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-500)] sm:text-base">
            Small landlords should not have to decode bundles or pay extra for basic workflows.
            This model keeps the base platform predictable and scales only when your portfolio grows.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--sand-200)] bg-[var(--sand-50)] px-5 py-4 text-sm text-[var(--ink-700)]">
          <p className="font-semibold text-[var(--ink-900)]">{PRICING_MODEL.name}</p>
          <p className="mt-1">
            {formatUsd(PRICING_MODEL.baseFee)} / month includes up to {PRICING_MODEL.includedUnits} units.
          </p>
          <p className="mt-1">Then {formatUsd(PRICING_MODEL.extraUnitFee)} per additional unit.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {PRICING_EXAMPLES.map((example) => (
          <article key={example.units} className="rounded-2xl border border-[var(--sand-200)] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">
              {example.label}
            </p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--ink-900)]">{example.units} units</h3>
                <p className="mt-1 text-sm text-[var(--ink-500)]">{example.note}</p>
              </div>
              <p className="text-2xl font-bold text-[var(--mint-700)]">{formatUsd(example.price)}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[var(--sand-200)] bg-[var(--mint-50)] p-5">
          <h3 className="text-base font-semibold text-[var(--ink-900)]">Included in the base fee</h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--ink-600)]">
            {PRICING_MODEL.includedFeatures.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--mint-500)]" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-[var(--sand-200)] bg-[var(--sand-50)] p-5">
          <h3 className="text-base font-semibold text-[var(--ink-900)]">Optional add-ons only</h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--ink-600)]">
            {PRICING_MODEL.addOns.map((addon) => (
              <li key={addon} className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--amber-500)]" />
                <span>{addon}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/sign-up" className="rounded-xl bg-[var(--mint-500)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--mint-600)]">
          Start free
        </Link>
        <Link href="/maintenance/new" className="rounded-xl border border-[var(--sand-200)] bg-white px-5 py-3 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--sand-50)]">
          Try the tenant flow
        </Link>
      </div>
    </section>
  );
}
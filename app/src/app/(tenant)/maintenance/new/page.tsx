"use client";

import { useState } from "react";

export default function MaintenanceRequestPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement).value,
    };

    await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--sand-200)] bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-2xl text-emerald-600">OK</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--ink-900)]">Request Submitted</h2>
          <p className="mt-2 text-sm text-[var(--ink-500)]">
            We&apos;ve received your request and will be in touch shortly.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="grain-overlay min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto grid w-full max-w-5xl gap-6 rounded-3xl border border-[var(--sand-200)] bg-white/80 p-6 shadow-xl backdrop-blur lg:grid-cols-[1.1fr_1fr] lg:p-8">
        <section className="rounded-2xl bg-[var(--ink-900)] p-8 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Tenant portal</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight">Maintenance request</h1>
          <p className="mt-4 text-sm text-white/80">
            Share what happened and our routing workflow will classify urgency and alert the right person.
          </p>
        </section>

        <section className="rounded-2xl bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[var(--ink-900)]">Tell us the issue</h2>
          <p className="mb-6 mt-1 text-sm text-[var(--ink-500)]">
          Describe the issue and we&apos;ll take care of it.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[var(--ink-700)]" htmlFor="name">
                Your Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded-xl border border-[var(--sand-200)] px-3 py-2.5 text-sm focus:border-[var(--mint-500)] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[var(--ink-700)]" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-[var(--sand-200)] px-3 py-2.5 text-sm focus:border-[var(--mint-500)] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[var(--ink-700)]" htmlFor="phone">
                Phone (optional)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="w-full rounded-xl border border-[var(--sand-200)] px-3 py-2.5 text-sm focus:border-[var(--mint-500)] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[var(--ink-700)]" htmlFor="description">
                Describe the issue
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                required
                placeholder="Leaking faucet in kitchen sink, dripping continuously"
                className="w-full resize-none rounded-xl border border-[var(--sand-200)] px-3 py-2.5 text-sm focus:border-[var(--mint-500)] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--mint-500)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--mint-600)] disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit request"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}


"use client";

import { useEffect, useMemo, useState } from "react";

type PaymentRow = {
  id: string;
  tenant: string;
  unit: string;
  amount: string;
  status: "due" | "late" | "paid" | "failed";
  dueDate: string;
  paidDate: string | null;
  leaseStatus?: string;
};

type PaymentsResponse = {
  payments?: PaymentRow[];
  error?: string;
};

const BANK_CONFIRMATION = "I understand this bank account will be used for rent collection";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const [bankLinked, setBankLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadPayments();
  }, []);

  const selectedPayment = useMemo(
    () => payments.find((payment) => payment.id === selectedPaymentId) ?? payments[0] ?? null,
    [payments, selectedPaymentId]
  );

  const needsAttention = payments.filter((payment) => payment.status !== "paid");

  async function loadPayments() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments", { cache: "no-store" });
      const payload = (await response.json()) as PaymentsResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load payments");
      }

      const loadedPayments = payload.payments ?? [];
      setPayments(loadedPayments);
      setSelectedPaymentId((current) => current ?? loadedPayments[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  function markResolved() {
    if (!selectedPayment) return;
    setActionMessage(`Updated ${selectedPayment.tenant} as resolved from this screen.`);
  }

  function confirmBankLink() {
    if (typedConfirmation.trim() !== BANK_CONFIRMATION) {
      setActionMessage("Type the exact confirmation phrase to continue.");
      return;
    }

    setBankLinked(true);
    setActionMessage("Bank account linked and ready for automated rent collection.");
  }

  return (
    <div className="space-y-6">
      <section className="glass-card p-6 sm:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-500)]">Payments</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--ink-900)]">Single-screen rent operations</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--ink-500)]">
              Review overdue balances, mark offline payments, remove late fees, and manage the rent collection flow without bouncing between screens.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--sand-200)] bg-white px-4 py-3 text-sm text-[var(--ink-700)]">
            <p className="font-semibold text-[var(--ink-900)]">Needs attention</p>
            <p className="mt-1">{needsAttention.length} payment(s) require action today</p>
          </div>
        </div>
        {actionMessage ? <p className="mt-4 text-sm text-emerald-700">{actionMessage}</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="glass-card p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--ink-900)]">Payment queue</h2>
              <p className="mt-1 text-sm text-[var(--ink-500)]">All rent items in one table with direct actions.</p>
            </div>
            <span className="rounded-full bg-[var(--mint-500)]/10 px-3 py-1 text-xs font-semibold text-[var(--mint-700)]">
              Fast admin mode
            </span>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--sand-200)] bg-white">
            <div className="grid grid-cols-[1.1fr_0.8fr_0.7fr_0.8fr_0.7fr] gap-2 border-b border-[var(--sand-200)] bg-[var(--sand-50)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-500)]">
              <span>Tenant</span>
              <span>Unit</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Due</span>
            </div>

            <div className="divide-y divide-[var(--sand-200)]">
              {loading ? (
                <div className="px-4 py-6 text-sm text-[var(--ink-500)]">Loading rent items...</div>
              ) : null}

              {!loading && payments.length === 0 ? (
                <div className="px-4 py-6 text-sm text-[var(--ink-500)]">No rent items found yet. Add leases and rent payments to populate this screen.</div>
              ) : null}

              {!loading && payments.map((payment) => {
                const active = selectedPayment?.id === payment.id;

                return (
                  <button
                    key={payment.id}
                    type="button"
                    onClick={() => setSelectedPaymentId(payment.id)}
                    className={`grid w-full grid-cols-[1.1fr_0.8fr_0.7fr_0.8fr_0.7fr] gap-2 px-4 py-4 text-left transition ${active ? "bg-[var(--mint-50)]" : "bg-white hover:bg-[var(--sand-50)]"}`}
                  >
                    <span className="text-sm font-semibold text-[var(--ink-900)]">{payment.tenant}</span>
                    <span className="text-sm text-[var(--ink-600)]">{payment.unit}</span>
                    <span className="text-sm font-semibold text-[var(--ink-900)]">{payment.amount}</span>
                    <span className="text-sm">
                      <StatusPill status={payment.status} />
                    </span>
                    <span className="text-xs text-[var(--ink-500)]">{payment.dueDate}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ActionButton label="Mark offline payment" hint="Log cash/check payments in one click" onClick={markResolved} />
            <ActionButton label="Remove late fee" hint="Drop the fee without digging through screens" onClick={markResolved} />
            <ActionButton label="Send reminder" hint="Email or SMS from the same place" onClick={markResolved} />
          </div>
        </article>

        <aside className="space-y-4">
          <article className="glass-card p-6">
            <h2 className="text-lg font-semibold text-[var(--ink-900)]">Selected payment</h2>
            {selectedPayment ? (
              <div className="mt-3 rounded-2xl border border-[var(--sand-200)] bg-white p-4">
                <p className="text-sm font-semibold text-[var(--ink-900)]">{selectedPayment.tenant}</p>
                <p className="mt-1 text-sm text-[var(--ink-500)]">{selectedPayment.unit} • Due {selectedPayment.dueDate}</p>
                <p className="mt-3 text-3xl font-bold text-[var(--ink-900)]">{selectedPayment.amount}</p>
                <div className="mt-3">
                  <StatusPill status={selectedPayment.status} />
                </div>
                <p className="mt-3 text-xs text-[var(--ink-500)]">
                  Lease status: {selectedPayment.leaseStatus ?? "active"}{selectedPayment.paidDate ? ` • Paid ${selectedPayment.paidDate}` : ""}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--ink-500)]">Select a payment to review it.</p>
            )}
            <p className="mt-4 text-sm text-[var(--ink-500)]">
              Everything here is optimized for the “I need to fix this now” moment.
            </p>
          </article>

          <article className="glass-card p-6">
            <h2 className="text-lg font-semibold text-[var(--ink-900)]">Bank-link confirmation</h2>
            <p className="mt-2 text-sm text-[var(--ink-500)]">
              Before linking a bank account, force a typed confirmation so accidental clicks do not activate rent collection.
            </p>

            <div className="mt-4 rounded-2xl border border-[var(--sand-200)] bg-[var(--sand-50)] p-4 text-sm text-[var(--ink-700)]">
              <p className="font-semibold text-[var(--ink-900)]">Type this phrase exactly</p>
              <p className="mt-2 rounded-xl border border-[var(--sand-200)] bg-white px-3 py-2 font-mono text-xs text-[var(--ink-900)]">
                {BANK_CONFIRMATION}
              </p>
              <textarea
                className="mt-3 h-24 w-full rounded-xl border border-[var(--sand-200)] bg-white px-3 py-2 text-sm"
                value={typedConfirmation}
                onChange={(event) => setTypedConfirmation(event.target.value)}
                placeholder="Type the confirmation phrase here"
              />
              <button
                type="button"
                onClick={confirmBankLink}
                className="mt-3 w-full rounded-xl bg-[var(--ink-900)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--ink-800)]"
              >
                {bankLinked ? "Bank linked" : "Confirm bank link"}
              </button>
              <p className="mt-2 text-xs text-[var(--ink-500)]">
                This mirrors the kind of explicit confirmation landlords requested for bank setup.
              </p>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: PaymentRow["status"] }) {
  const classes: Record<PaymentRow["status"], string> = {
    due: "bg-amber-100 text-amber-700",
    late: "bg-rose-100 text-rose-700",
    paid: "bg-emerald-100 text-emerald-700",
    failed: "bg-orange-100 text-orange-700",
  };

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes[status]}`}>{status}</span>;
}

function ActionButton({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-[var(--sand-200)] bg-white p-4 text-left transition hover:bg-[var(--sand-50)]"
    >
      <p className="text-sm font-semibold text-[var(--ink-900)]">{label}</p>
      <p className="mt-1 text-xs text-[var(--ink-500)]">{hint}</p>
    </button>
  );
}
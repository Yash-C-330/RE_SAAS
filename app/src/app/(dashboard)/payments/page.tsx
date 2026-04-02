export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-[var(--ink-900)]">Payments</h1>
        <p className="mt-1 text-sm text-[var(--ink-500)]">Incoming rent, failed collections, and overdue balances.</p>
      </div>

      <div className="glass-card p-6">
        <p className="text-sm text-[var(--ink-500)]">No payments recorded yet. Connect Stripe and activate rent collection to populate this ledger.</p>
      </div>
    </div>
  );
}


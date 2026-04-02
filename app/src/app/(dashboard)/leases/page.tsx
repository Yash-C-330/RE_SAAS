export default function LeasesPage() {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-[var(--ink-900)]">Leases</h1>
        <p className="mt-1 text-sm text-[var(--ink-500)]">Track active terms, renewals, and expiring agreements.</p>
      </div>

      <div className="glass-card p-6">
        <p className="text-sm text-[var(--ink-500)]">No leases yet. Once units and tenants are connected, lease timelines will appear here.</p>
      </div>
    </div>
  );
}


export default function MaintenancePage() {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-[var(--ink-900)]">Maintenance</h1>
        <p className="mt-1 text-sm text-[var(--ink-500)]">Request intake, triage, assignment, and closure tracking.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {["Open", "In Progress", "Resolved"].map((status) => (
          <div key={status} className="glass-card p-5 text-center">
            <p className="text-3xl font-bold text-[var(--ink-900)]">0</p>
            <p className="mt-1 text-sm text-[var(--ink-500)]">{status}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <p className="text-sm text-[var(--ink-500)]">No maintenance tickets yet. Submit one from the tenant portal to test your automation pipeline.</p>
      </div>
    </div>
  );
}


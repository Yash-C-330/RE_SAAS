export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-[var(--ink-900)]">Reports</h1>
        <p className="mt-1 text-sm text-[var(--ink-500)]">Owner summaries, NOI snapshots, and monthly performance insights.</p>
      </div>

      <div className="glass-card p-6">
        <p className="text-sm text-[var(--ink-500)]">
          Reports are generated automatically on the 1st of each month and sent by email.
          Generated files will also appear here for download.
        </p>
      </div>
    </div>
  );
}


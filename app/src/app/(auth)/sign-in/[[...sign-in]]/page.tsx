import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="grain-overlay min-h-screen bg-[var(--sand-50)] px-4 py-10 sm:px-6">
      <div className="mx-auto grid w-full max-w-5xl gap-6 rounded-3xl border border-[var(--sand-200)] bg-white/80 p-6 shadow-xl backdrop-blur lg:grid-cols-2 lg:p-10">
        <section className="hidden rounded-2xl bg-[var(--ink-900)] p-8 text-white lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Welcome back</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight">Command your rentals from one calm control room.</h1>
          <p className="mt-4 text-sm text-white/75">Track payments, maintenance, and renewals with workflow-driven automation.</p>
        </section>
        <section className="flex items-center justify-center rounded-2xl bg-white p-4 sm:p-6">
          <SignIn />
        </section>
      </div>
    </main>
  );
}

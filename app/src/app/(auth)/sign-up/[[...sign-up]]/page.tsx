import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="grain-overlay min-h-screen bg-[var(--sand-50)] px-4 py-10 sm:px-6">
      <div className="mx-auto grid w-full max-w-5xl gap-6 rounded-3xl border border-[var(--sand-200)] bg-white/80 p-6 shadow-xl backdrop-blur lg:grid-cols-2 lg:p-10">
        <section className="hidden rounded-2xl bg-[var(--mint-600)] p-8 text-white lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">Get started</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight">Launch your first automated property workflow today.</h1>
          <p className="mt-4 text-sm text-white/85">Set up rent reminders, ticket triage, and reporting in one place.</p>
        </section>
        <section className="flex items-center justify-center rounded-2xl bg-white p-4 sm:p-6">
          <SignUp />
        </section>
      </div>
    </main>
  );
}

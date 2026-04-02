# Build Instruction: Next.js App (`app/`)

This document contains every file needed to recreate the `app/` folder exactly.
Create each file at the specified path with the exact content shown.

After creating all files, run:
```bash
cd app
npm install
cp .env.example .env.local   # then fill in your keys
npm run db:push
npm run dev
```

---

## File Tree

```
app/
├── .env.example
├── drizzle.config.ts
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── src/
    ├── middleware.ts
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── (auth)/
    │   │   ├── sign-in/[[...sign-in]]/page.tsx
    │   │   └── sign-up/[[...sign-up]]/page.tsx
    │   ├── (dashboard)/
    │   │   ├── layout.tsx
    │   │   ├── automations/page.tsx
    │   │   ├── dashboard/page.tsx
    │   │   ├── leases/page.tsx
    │   │   ├── maintenance/page.tsx
    │   │   ├── payments/page.tsx
    │   │   ├── properties/page.tsx
    │   │   ├── reports/page.tsx
    │   │   └── tenants/page.tsx
    │   ├── (tenant)/
    │   │   └── maintenance/new/page.tsx
    │   └── api/
    │       ├── maintenance/route.ts
    │       ├── properties/route.ts
    │       └── webhooks/
    │           ├── n8n/route.ts
    │           └── stripe/route.ts
    ├── components/
    │   └── layout/
    │       └── side-nav.tsx
    └── lib/
        ├── openai.ts
        ├── stripe.ts
        ├── utils.ts
        └── db/
            ├── index.ts
            └── schema.ts
```

---

## Root Config Files

### `app/package.json`

```json
{
  "name": "ai-property-manager",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:generate": "drizzle-kit generate"
  },
  "dependencies": {
    "next": "15.2.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@clerk/nextjs": "^6.0.0",
    "@neondatabase/serverless": "^0.10.0",
    "drizzle-orm": "^0.40.0",
    "drizzle-zod": "^0.7.0",
    "zod": "^3.23.8",
    "stripe": "^17.0.0",
    "@stripe/stripe-js": "^5.0.0",
    "resend": "^4.0.0",
    "twilio": "^5.0.0",
    "openai": "^4.0.0",
    "@aws-sdk/client-s3": "^3.0.0",
    "@aws-sdk/s3-request-presigner": "^3.0.0",
    "ioredis": "^5.3.2",
    "date-fns": "^4.0.0",
    "lucide-react": "^0.511.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4",
    "eslint": "^9",
    "eslint-config-next": "15.2.3",
    "drizzle-kit": "^0.30.0"
  }
}
```

---

### `app/next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.clerk.com" },
      { protocol: "https", hostname: "*.cloudflare.com" },
    ],
  },
};

export default nextConfig;
```

---

### `app/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

### `app/tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
```

---

### `app/drizzle.config.ts`

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

### `app/.env.example`

```env
# ─── App ──────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─── Auth (Clerk) ─────────────────────────────────────────────────────────────
# Get keys from https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# ─── Database (Neon / Supabase PostgreSQL) ────────────────────────────────────
# Get from https://neon.tech or https://supabase.com
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# ─── Cache (Upstash Redis) ────────────────────────────────────────────────────
REDIS_URL=redis://...

# ─── File Storage (Cloudflare R2) ─────────────────────────────────────────────
CLOUDFLARE_R2_BUCKET=property-manager
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_PUBLIC_URL=https://pub-....r2.dev

# ─── Automation (n8n) ─────────────────────────────────────────────────────────
N8N_WEBHOOK_URL=https://n8n.yourdomain.com
N8N_API_KEY=...
N8N_CALLBACK_SECRET=your-secret-for-n8n-callbacks

# ─── Email (Resend) ───────────────────────────────────────────────────────────
# Get from https://resend.com
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# ─── SMS (Twilio) ─────────────────────────────────────────────────────────────
# Get from https://console.twilio.com
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# ─── AI (OpenAI) ──────────────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...

# ─── Payments & Billing (Stripe) ──────────────────────────────────────────────
# Get from https://dashboard.stripe.com
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_GROWTH_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...

# ─── E-Signatures (DocuSign) ──────────────────────────────────────────────────
DOCUSIGN_INTEGRATION_KEY=...
DOCUSIGN_ACCOUNT_ID=...
DOCUSIGN_PRIVATE_KEY=...

# ─── Background Checks (Checkr) ───────────────────────────────────────────────
CHECKR_API_KEY=...

# ─── Income Verification (Plaid) ──────────────────────────────────────────────
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=sandbox

# ─── Accounting (QuickBooks) ──────────────────────────────────────────────────
QUICKBOOKS_CLIENT_ID=...
QUICKBOOKS_CLIENT_SECRET=...
```

---

## `src/` Files

### `app/src/middleware.ts`

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Tenant-facing public routes
  "/apply(.*)",
  "/maintenance/new(.*)",
  "/pay(.*)",
  // Webhooks
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

---

### `app/src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

### `app/src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Property Manager Autopilot",
  description: "Automated rent reminders, maintenance, lease renewals, and owner reports for independent landlords.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

---

### `app/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`

```tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <SignIn />
    </main>
  );
}
```

---

### `app/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

```tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <SignUp />
    </main>
  );
}
```

---

### `app/src/app/(dashboard)/layout.tsx`

```tsx
import { SideNav } from "@/components/layout/side-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <SideNav />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
```

---

### `app/src/app/(dashboard)/dashboard/page.tsx`

```tsx
import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { userId } = await auth();

  // TODO: fetch real stats per landlord once landlord_id resolved via Clerk userId
  const stats = [
    { label: "Total Units", value: "—", sub: "across all properties" },
    { label: "Rent Collected", value: "—", sub: "this month" },
    { label: "Overdue Payments", value: "—", sub: "need attention" },
    { label: "Open Tickets", value: "—", sub: "maintenance requests" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="text-3xl font-semibold text-slate-900 mt-1">{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Recent Activity</h2>
        <p className="text-sm text-slate-400">No activity yet. Add a property to get started.</p>
      </div>
    </div>
  );
}
```

---

### `app/src/app/(dashboard)/properties/page.tsx`

```tsx
export default function PropertiesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
        <button className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          + Add Property
        </button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-sm text-slate-400">No properties yet. Add your first property to begin.</p>
      </div>
    </div>
  );
}
```

---

### `app/src/app/(dashboard)/tenants/page.tsx`

```tsx
export default function TenantsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
        <button className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          + Add Tenant
        </button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-sm text-slate-400">No tenants yet.</p>
      </div>
    </div>
  );
}
```

---

### `app/src/app/(dashboard)/leases/page.tsx`

```tsx
export default function LeasesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Leases</h1>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-sm text-slate-400">No leases yet.</p>
      </div>
    </div>
  );
}
```

---

### `app/src/app/(dashboard)/payments/page.tsx`

```tsx
export default function PaymentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Payments</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-sm text-slate-400">No payments recorded yet.</p>
      </div>
    </div>
  );
}
```

---

### `app/src/app/(dashboard)/maintenance/page.tsx`

```tsx
export default function MaintenancePage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Maintenance</h1>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {["Open", "In Progress", "Resolved"].map((status) => (
          <div key={status} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">0</p>
            <p className="text-sm text-slate-500 mt-1">{status}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-sm text-slate-400">No maintenance tickets.</p>
      </div>
    </div>
  );
}
```

---

### `app/src/app/(dashboard)/reports/page.tsx`

```tsx
export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Reports</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-sm text-slate-400">
          Reports are generated automatically on the 1st of each month and sent to your email.
          They&apos;ll also appear here for download.
        </p>
      </div>
    </div>
  );
}
```

---

### `app/src/app/(dashboard)/automations/page.tsx`

```tsx
const WORKFLOWS = [
  {
    id: "rent-reminders",
    name: "Rent Reminder Sequences",
    description: "Sends email + SMS reminders 7, 3, 1 day before due. Escalates overdue accounts.",
    trigger: "Daily cron — 8:00 AM",
    integrations: ["Twilio", "Resend", "OpenAI"],
  },
  {
    id: "maintenance-router",
    name: "Maintenance Request Router",
    description: "AI classifies urgency, notifies landlord, assigns vendor, tracks to resolution.",
    trigger: "Webhook — tenant form/SMS",
    integrations: ["OpenAI", "Twilio"],
  },
  {
    id: "lease-renewal",
    name: "Lease Renewal Campaign",
    description: "90/60/30-day drip campaign. Auto-generates DocuSign lease on confirmation.",
    trigger: "Daily cron",
    integrations: ["OpenAI", "DocuSign", "Resend"],
  },
  {
    id: "monthly-reports",
    name: "Monthly Owner Reports",
    description: "Generates AI-written PDF report with cash flow, NOI, and maintenance summary.",
    trigger: "Monthly cron — 1st @ 6:00 AM",
    integrations: ["OpenAI", "QuickBooks", "S3"],
  },
  {
    id: "tenant-screening",
    name: "Tenant Screening Pipeline",
    description: "Background check + income verification + AI scoring. Auto-approves or flags.",
    trigger: "Webhook — rental application",
    integrations: ["Checkr", "Plaid", "OpenAI", "DocuSign"],
  },
  {
    id: "ai-response-bot",
    name: "AI Tenant Response Bot",
    description: "Classifies inbound tenant messages and auto-replies or escalates to landlord.",
    trigger: "Inbound SMS / email",
    integrations: ["OpenAI", "Twilio"],
  },
];

export default function AutomationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Automations</h1>
      <p className="text-sm text-slate-500 mb-6">
        n8n workflows running on your behalf. Connect n8n to activate.
      </p>
      <div className="grid gap-4">
        {WORKFLOWS.map((wf) => (
          <div
            key={wf.id}
            className="bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-4"
          >
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{wf.name}</p>
              <p className="text-sm text-slate-500 mt-1">{wf.description}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  {wf.trigger}
                </span>
                {wf.integrations.map((i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    {i}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 shrink-0">
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded font-medium">
                Not connected
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### `app/src/app/(tenant)/maintenance/new/page.tsx`

```tsx
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
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Request Submitted</h2>
          <p className="text-slate-500 mt-2 text-sm">
            We&apos;ve received your request and will be in touch shortly.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-lg w-full">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Maintenance Request</h1>
        <p className="text-sm text-slate-500 mb-6">
          Describe the issue and we&apos;ll take care of it.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="name">
              Your Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="phone">
              Phone (for urgent issues)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="description">
              Describe the Issue
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              required
              placeholder="e.g. Leaking faucet in kitchen sink, water dripping constantly..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </main>
  );
}
```

---

### `app/src/app/api/maintenance/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maintenanceTickets } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, description, unitId, tenantId } = body;

    const [ticket] = await db
      .insert(maintenanceTickets)
      .values({
        unitId: unitId ?? null,
        tenantId: tenantId ?? null,
        description,
        status: "open",
      })
      .returning();

    // Trigger n8n maintenance router workflow (fire-and-forget)
    if (process.env.N8N_WEBHOOK_URL) {
      await fetch(`${process.env.N8N_WEBHOOK_URL}/webhook/maintenance-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-N8N-API-KEY": process.env.N8N_API_KEY ?? "",
        },
        body: JSON.stringify({ ticketId: ticket.id, name, email, phone, description }),
      }).catch(console.error);
    }

    return NextResponse.json({ success: true, ticketId: ticket.id }, { status: 201 });
  } catch (err) {
    console.error("[maintenance POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  const tickets = await db.query.maintenanceTickets.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return NextResponse.json(tickets);
}
```

---

### `app/src/app/api/properties/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { properties, landlords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const landlord = await db.query.landlords.findFirst({
    where: eq(landlords.clerkUserId, userId),
  });
  if (!landlord) return NextResponse.json([]);

  const result = await db.query.properties.findMany({
    where: eq(properties.landlordId, landlord.id),
    with: { units: true },
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const landlord = await db.query.landlords.findFirst({
    where: eq(landlords.clerkUserId, userId),
  });
  if (!landlord) return NextResponse.json({ error: "Landlord not found" }, { status: 404 });

  const [property] = await db
    .insert(properties)
    .values({ ...body, landlordId: landlord.id })
    .returning();

  return NextResponse.json(property, { status: 201 });
}
```

---

### `app/src/app/api/webhooks/stripe/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { landlords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("[stripe] checkout completed", session.id);
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log("[stripe] payment succeeded", invoice.id);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      await db
        .update(landlords)
        .set({ plan: "cancelled" })
        .where(eq(landlords.stripeCustomerId, customerId));
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
```

---

### `app/src/app/api/webhooks/n8n/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { automationLogs, maintenanceTickets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * n8n calls back here after completing a workflow run.
 * Payload: { workflowName, trigger, outcome, details, landlordId?, ticketId? }
 */
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.N8N_CALLBACK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { workflowName, trigger, outcome, details, landlordId, ticketId } = body;

  await db.insert(automationLogs).values({
    landlordId: landlordId ?? null,
    workflowName,
    trigger,
    outcome,
    details,
  });

  if (workflowName === "maintenance-router" && ticketId && details?.status) {
    await db
      .update(maintenanceTickets)
      .set({ status: details.status })
      .where(eq(maintenanceTickets.id, ticketId));
  }

  return NextResponse.json({ received: true });
}
```

---

### `app/src/components/layout/side-nav.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  CreditCard,
  Wrench,
  Zap,
  BarChart3,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { href: "/properties",  label: "Properties",  icon: Building2 },
  { href: "/tenants",     label: "Tenants",     icon: Users },
  { href: "/leases",      label: "Leases",      icon: FileText },
  { href: "/payments",    label: "Payments",    icon: CreditCard },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/automations", label: "Automations", icon: Zap },
  { href: "/reports",     label: "Reports",     icon: BarChart3 },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 h-screen bg-white border-r border-slate-200 flex flex-col">
      <div className="px-5 py-5 border-b border-slate-100">
        <p className="font-bold text-slate-900 text-sm leading-tight">
          AI Property Manager
          <br />
          <span className="text-blue-600 font-semibold">Autopilot</span>
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-slate-100">
        <UserButton afterSignOutUrl="/" showName />
      </div>
    </aside>
  );
}
```

---

### `app/src/lib/db/schema.ts`

```typescript
import {
  pgTable,
  uuid,
  text,
  integer,
  decimal,
  date,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const landlords = pgTable("landlords", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").unique().notNull(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  plan: text("plan").default("starter"), // starter | growth | pro | enterprise
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  landlordId: uuid("landlord_id")
    .references(() => landlords.id, { onDelete: "cascade" })
    .notNull(),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  unitsCount: integer("units_count").default(1),
  type: text("type"), // single_family | multi_family | commercial
});

export const units = pgTable("units", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .references(() => properties.id, { onDelete: "cascade" })
    .notNull(),
  unitNumber: text("unit_number"),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }),
  status: text("status").default("vacant"), // vacant | occupied | maintenance
});

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  creditScore: integer("credit_score"),
  annualIncome: decimal("annual_income", { precision: 12, scale: 2 }),
  status: text("status").default("applicant"), // applicant | active | past
});

export const leases = pgTable("leases", {
  id: uuid("id").primaryKey().defaultRandom(),
  unitId: uuid("unit_id").references(() => units.id),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  securityDeposit: decimal("security_deposit", { precision: 10, scale: 2 }),
  docusignEnvelopeId: text("docusign_envelope_id"),
  status: text("status").default("pending"), // pending | active | expired | terminated
});

export const rentPayments = pgTable("rent_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  leaseId: uuid("lease_id").references(() => leases.id),
  dueDate: date("due_date").notNull(),
  paidDate: date("paid_date"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  stripePaymentId: text("stripe_payment_id"),
  status: text("status").default("pending"), // pending | paid | late | failed
});

export const maintenanceTickets = pgTable("maintenance_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  unitId: uuid("unit_id").references(() => units.id),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  category: text("category"), // plumbing | electrical | hvac | appliance | cosmetic
  urgency: text("urgency"),   // emergency | high | normal | low
  description: text("description"),
  vendorId: text("vendor_id"),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  status: text("status").default("open"), // open | assigned | in_progress | resolved
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const automationLogs = pgTable("automation_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  landlordId: uuid("landlord_id").references(() => landlords.id),
  workflowName: text("workflow_name"),
  trigger: text("trigger"),
  outcome: text("outcome"), // success | failed | skipped
  details: jsonb("details"),
  ranAt: timestamp("ran_at", { withTimezone: true }).defaultNow(),
});
```

---

### `app/src/lib/db/index.ts`

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
```

---

### `app/src/lib/stripe.ts`

```typescript
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export const PLANS = {
  starter: {
    name: "Starter",
    price: 49,
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    unitLimit: 5,
  },
  growth: {
    name: "Growth",
    price: 149,
    priceId: process.env.STRIPE_GROWTH_PRICE_ID!,
    unitLimit: 25,
  },
  pro: {
    name: "Pro",
    price: 349,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    unitLimit: 100,
  },
  enterprise: {
    name: "Enterprise",
    price: null,
    priceId: null,
    unitLimit: Infinity,
  },
} as const;
```

---

### `app/src/lib/openai.ts`

```typescript
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});
```

---

### `app/src/lib/utils.ts`

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function daysUntil(date: Date | string): number {
  const target = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
```
# AI Property Manager Autopilot

Automated rent reminders, maintenance ticketing, lease renewals, and monthly owner reports for independent landlords managing 5–50 units.

**Stack:** Next.js 15 · PostgreSQL (Neon) · n8n · Clerk · Stripe · Twilio · OpenAI  
**Framework:** [WAT](CLAUDE.md) (Workflows → Agents → Tools)

---

## Quick Start

### 1. Install Node.js
Download from [nodejs.org](https://nodejs.org) (LTS). After installing, restart your terminal.

### 2. Install dependencies
```bash
cd app
npm install
```

### 3. Configure environment
```bash
cp .env.example .env.local
# Fill in your keys (Clerk, Neon, Stripe, Twilio, OpenAI, etc.)
```

### 4. Set up the database
Create a free PostgreSQL database at [neon.tech](https://neon.tech), copy the connection string into `DATABASE_URL`, then run:
```bash
npm run db:push
```

### 5. Run the dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
real-estate-saas/
├── app/                        # Next.js 15 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/         # Clerk sign-in / sign-up
│   │   │   ├── (dashboard)/    # Landlord dashboard
│   │   │   │   ├── dashboard/
│   │   │   │   ├── properties/
│   │   │   │   ├── tenants/
│   │   │   │   ├── leases/
│   │   │   │   ├── payments/
│   │   │   │   ├── maintenance/
│   │   │   │   ├── automations/
│   │   │   │   └── reports/
│   │   │   ├── (tenant)/       # Public tenant-facing pages
│   │   │   │   └── maintenance/new/
│   │   │   └── api/            # API routes + webhooks
│   │   ├── components/
│   │   │   └── layout/side-nav.tsx
│   │   └── lib/
│   │       ├── db/             # Drizzle ORM + schema
│   │       ├── stripe.ts
│   │       ├── openai.ts
│   │       └── utils.ts
│   ├── drizzle.config.ts
│   └── package.json
│
├── workflows/                  # WAT: n8n workflow SOPs (Markdown)
│   ├── rent_reminders.md
│   ├── maintenance_router.md
│   ├── lease_renewal.md
│   └── monthly_reports.md
│
├── tools/                      # WAT: Python execution scripts
│   ├── send_sms.py
│   ├── send_email.py
│   ├── classify_maintenance.py
│   ├── draft_message.py
│   └── requirements.txt
│
├── CLAUDE.md                   # Agent operating instructions
├── research.md                 # Market research
└── architecture.md            # Full technical spec
```

---

## Services to Set Up

| Service | Purpose | Free Tier |
|---|---|---|
| [Neon](https://neon.tech) | PostgreSQL database | 0.5 GB free |
| [Clerk](https://clerk.com) | Auth + user management | 10k MAU free |
| [Stripe](https://stripe.com) | SaaS billing + rent collection | Free (2.9% + $0.30 per tx) |
| [Resend](https://resend.com) | Transactional email | 3k/month free |
| [Twilio](https://twilio.com) | SMS | $15 trial credit |
| [OpenAI](https://platform.openai.com) | AI for classification + drafting | Pay as you go |
| [Cloudflare R2](https://cloudflare.com/r2) | File storage for reports | 10 GB free |
| [Railway](https://railway.app) | Host n8n automation engine | $5/month |

---

## Pricing Tiers

| Plan | Price | Units | Features |
|---|---|---|---|
| Starter | $49/month | 5 | Rent reminders, maintenance tickets, basic reports |
| Growth | $149/month | 25 | + Lease renewals, tenant screening, AI response bot |
| Pro | $349/month | 100 | + Monthly owner reports, QuickBooks sync, DocuSign |
| Enterprise | Custom | ∞ | + White-label, custom workflows, dedicated support |

---

## MVP Checklist (10 Weeks)

- [ ] **Week 1–2:** Next.js + Neon + Clerk + Stripe billing page
- [ ] **Week 3–4:** n8n setup + Workflow 1 (rent reminders) + Workflow 2 (maintenance)
- [ ] **Week 5–6:** Workflow 3 (lease renewal) + Workflow 4 (monthly reports) + DocuSign
- [ ] **Week 7–8:** Dashboard UI + Tenant portal + Workflow 5 (screening)
- [ ] **Week 9–10:** Onboarding wizard + testing + bug fixes → **launch**

## Absolute Minimum to Charge $49/month (2 weeks)

1. Tenant maintenance form (`/maintenance/new`) ✓
2. n8n workflow classifies it + notifies landlord via SMS ✓  
3. Stripe subscription page → `$49/month` ✓
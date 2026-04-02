# 7-Day Launch Master Plan

**Status:** Ready to Execute | **Target:** April 7, 2026 | **Owner:** You

---

## 🎯 The Goal

Launch a **multi-tenant property management automation platform** with:
- ✅ Single codebase (no per-tenant DevOps overhead)
- ✅ Shared n8n instance (one workflow = all landlords)
- ✅ Production security (IP whitelist, encrypted creds, rate limiting)
- ✅ Live monitoring (daily SQL queries, Sentry alerts)
- ✅ Scalable architecture (supports 100+ landlords day 1)

---

## MagicDoor Replication Track

Based on public product and help docs, MagicDoor's operating pattern is:
- One shared platform across landlord sizes and property types, not one stack per landlord.
- Text-first tenant operations (reminders, updates, support), with AI-assisted responses and translation.
- Maintenance AI runbooks that triage requests, assign urgency scores, and coordinate tenant-vendor communication.
- Portfolio-level visibility across properties, units, payments, renewals, and maintenance.
- Simple packaging and onboarding that scales from small landlords to larger portfolios.

For our product, this confirms the current multi-tenant direction (landlord_id isolation + shared app/n8n) is correct. To match execution quality, prioritize these additions:

### P0 (Launch Week): Must Have to Replicate Core Behavior

1. Multi-landlord scheduler orchestration
   - Run one cron workflow that iterates all eligible landlords.
   - Replace single `N8N_LANDLORD_ID` execution with landlord batch processing and per-landlord callbacks.

2. Unified communication inbox
   - Store tenant messages and outbound reminders in a single thread model.
   - Keep channel metadata (sms/email), delivery status, and AI summary for operator visibility.

3. Maintenance triage scoring
   - Add numeric urgency score (1-100) to maintenance tickets.
   - Route by SLA thresholds (emergency/high/normal/low) with deterministic escalations.

4. Integration health and fallback
   - Add provider health checks (Twilio/Resend/Stripe/OpenAI) to dashboard.
   - Add fallback channel behavior (SMS fail -> email, email fail -> landlord alert).

5. Metering and plan enforcement
   - Enforce active-lease limits and usage quotas by plan at runtime.
   - Record usage events for transparent billing and quota alerts.

### P1 (Week 2): Operational Depth

1. Role-based landlord teams
   - Add staff roles (owner, manager, agent, accounting) with scoped permissions.

2. Portfolio dashboard parity
   - Add occupancy, delinquency, maintenance backlog, renewal pipeline, and cashflow tiles.

3. Onboarding compression
   - Guided setup flow: import properties -> connect bank/payments -> invite tenants -> activate automations.

4. Audit and trust posture
   - Keep immutable audit events for workflow actions and credential access.
   - Add retention policy and export for compliance workflows.

### P2 (Weeks 3-4): Scale and Differentiation

1. Multi-language tenant assistant with guardrails.
2. Landlord-specific AI policy profiles (tone, escalation policy, legal constraints).
3. Vendor performance analytics (response time, completion time, cost variance).
4. Proactive maintenance suggestions from ticket history and recurring categories.

### Deployment Decisions to Keep

- App: Vercel (or Railway) with one shared deployment.
- Database: Supabase/Neon Postgres with strict tenant scoping and indexed landlord filters.
- Automation: n8n Cloud or self-hosted n8n with a shared worker model.
- Secrets: platform secret manager now; KMS/Vault in phase 2 when compliance or rotation burden increases.

### Replication Success Criteria

By launch, consider MagicDoor-style core replicated when all are true:
- One run can process multiple landlords safely with isolated outcomes.
- Tenant comms and maintenance actions are visible per thread and per property.
- AI handles first-pass triage and drafting while deterministic rules enforce escalations.
- Portfolio KPIs and workflow outcomes are visible in one dashboard.
- Billing/quotas enforce plan boundaries without manual ops intervention.

---

## 📋 What You Built So Far

| Component | Status | Files |
| --- | --- | --- |
| Next.js App (frontend + API) | ✅ Ready | `app/src/**` |
| Multi-tenant schema (landlord_id isolation) | ✅ Ready | `schema.ts` |
| Drizzle ORM relations | ✅ Ready | `schema.ts` propertiesRelations |
| Clerk auth + middleware | ✅ Ready | `middleware.ts` |
| Automation catalog (6 workflows) | ✅ Ready | `lib/automations/catalog.ts` |
| Live status API | ✅ Ready | `/api/automations` |
| Webhook run trigger | ✅ Ready | `/api/automations/[id]/run` |
| Lease candidates endpoint | ✅ Ready | `/api/automations/lease-candidates` |
| n8n callback receiver | ✅ Ready | `/api/webhooks/n8n` |
| Rent reminders workflow (single-landlord) | ✅ Ready | `n8n_rent_reminders.workflow.json` |
| Batch rent reminders workflow | ✅ NEW | `n8n_rent_reminders_batch.workflow.json` |

---

## 🚀 What You Need To Do (7 Days)

### Day 1: Infrastructure (2-3 hours)
1. **Create Supabase/Neon database**
   - [ ] Sign up at https://supabase.com or https://neon.tech
   - [ ] Copy DATABASE_URL
   - [ ] Run migrations: `npx drizzle-kit push`

2. **Verify Clerk is ready**
   - [ ] Get NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY
   - [ ] Set CORS origins to production URL

3. **Create n8n Cloud account**
   - [ ] Sign up at https://n8n.cloud
   - [ ] Get API key from settings

4. **Organize secrets**
   - [ ] Copy `.env.example` → `.env.production`
   - [ ] Fill in ALL values (see `.env.production` template)
   - [ ] Keep locally, never commit

---

### Day 2: Deploy App (1-2 hours)
1. **Push to Vercel**
   ```bash
   npm install -g vercel
   cd app
   vercel --prod --env-file .env.production
   ```
   - [ ] Note deployed URL
   - [ ] Update `NEXT_PUBLIC_APP_URL` if changed
   - [ ] Add all secrets to Vercel dashboard

2. **Seed demo data**
   ```bash
   DATABASE_URL=postgresql://... npx ts-node scripts/seed.ts
   ```
   - [ ] Creates 2 demo landlords, 3 properties, 3 leases
   - [ ] Ready for testing

---

### Day 2-3: Deploy n8n & Wire Workflows (1-2 hours)
1. **Import workflows into n8n**
   - [ ] Create `n8n_rent_reminders.workflow.json` workflow
   - [ ] Set environment variables (N8N_LANDLORD_ID, etc.)

2. **Test webhook callback**
   - [ ] Manual trigger on workflow
   - [ ] Check `automation_logs` table → should have entry
   - [ ] Verify callback was successful

3. **Activate workflow**
   - [ ] Toggle workflow active = true
   - [ ] Will run tomorrow at 8 AM cron

---

### Day 3: End-to-End Testing (1-2 hours)
1. **Test lease candidates API**
   ```bash
   curl -H "x-landlord-id: 00000000-0000-0000-0000-000000000001" \
     https://app.yourdomain.com/api/automations/lease-candidates
   ```
   - [ ] Returns real lease data

2. **Test manual workflow run**
   - [ ] Dashboard → click "Run now"
   - [ ] Check `workflow_runs` table → status = 'success'
   - [ ] Check `automation_logs` table → outcome = 'success'

3. **Monitor n8n execution**
   - [ ] n8n UI → all nodes green
   - [ ] No timeout errors
   - [ ] Callback response 200 OK

---

### Day 4: Production Hardening (1-2 hours)
1. **Add error retry logic**
   - [ ] Exponential backoff on webhook failures
   - [ ] Max 3 retries with 2s/4s/8s delays

2. **Add rate limiting**
   - [ ] `/api/webhooks/n8n`: 50 req/min per landlord
   - [ ] Returns 429 when exceeded

3. **Add monitoring queries**
   - [ ] Create automation_status view
   - [ ] Query daily for KPIs

---

### Day 5: Security Audit (1-2 hours)
See SECURITY_CHECKLIST.md—focus on critical items:
- [ ] No secrets in git
- [ ] Database IP whitelist enabled
- [ ] HTTPS enforced
- [ ] Secrets not in logs
- [ ] Backup tested & restorable

---

### Day 6: Documentation & Handoff (1 hour)
- [ ] README updated with prod deployment commands
- [ ] Architecture diagram in docs
- [ ] Admin account created for support
- [ ] On-call rotation documented

---

### Day 7: Launch! (1 hour)
- [ ] Final smoke tests (all APIs return 200)
- [ ] Enable monitoring alerts (Slack/email)
- [ ] Announce to landlords
- [ ] Monitor error logs for 24h post-launch

---

## 📁 Files Created/Modified This Session

| File | Purpose | Status |
| --- | --- | --- |
| `DEPLOYMENT.md` | Complete 7-day deployment guide | ✅ Ready |
| `SECURITY_CHECKLIST.md` | Production security sign-off items | ✅ Ready |
| `QUICKSTART_DEPLOY.md` | Quick reference (this week) | ✅ Ready |
| `scripts/seed.ts` | Seed demo data (2 landlords + leases + tenants) | ✅ Ready |
| `n8n_rent_reminders_batch.workflow.json` | Multi-landlord batch workflow | ✅ Ready |
| `.env.production` | Production secrets template + rotation schedule | ✅ Ready |
| `src/app/api/automations/lease-candidates/route.ts` | Real database leak query endpoint | ✅ Ready |

---

## 🏗️ Architecture Summary

```
┌─ Users (Web) ────────────────────────────────────────────┐
│                                                            │
│   https://app.yourdomain.com (Vercel)                    │
│   • Clerk authentication                                  │
│   • Dashboard (React components)                          │
│   • API routes (Next.js)                                  │
│                                                            │
└────────────┬──────────────────────────┬──────────────────┘
             │                          │
       (HTTP)│                          │ (HTTP)
             │                          │
    ┌────────▼────────┐        ┌───────▼──────────┐
    │ Supabase       │        │  n8n Cloud       │
    │ PostgreSQL     │        │  Workflows       │
    │                │        │  Scheduling      │
    │ • landlords    │        │  Integrations    │
    │ • properties   │        │  • Twilio SMS    │
    │ • leases       │        │  • Resend email  │
    │ • automations  │        │  • OpenAI        │
    │ • workflow_runs│        │                  │
    │                │        │ (Multi-landlord) │
    └────────────────┘        └──────────────────┘
```

**Key principle: Multi-tenant via landlord_id row filtering (not separate databases)**

---

## 💰 Hosting Stack (Cheapest Production)

| Service | Provider | Cost | Notes |
| --- | --- | --- | --- |
| App + Frontend | Vercel | $20/mo | Auto-scales, HTTPS included |
| Database | Supabase | $25/mo | Postgres, daily backups |
| Workflows | n8n Cloud | $50/mo | Managed, no DevOps needed |
| Auth | Clerk | $0 | Free tier sufficient for <5k users |
| Cache/Redis | Upstash | $0-10 | Optional, for scaling |
| **Total** | | **$95-125/mo** | Includes all features |

*Costs scale linearly with SMS/email volume (~$0.01 per SMS, $0.05 per email)*

---

## ✅ Deployment Checklist

### Before Starting
- [ ] Read DEPLOYMENT.md (15 min)
- [ ] Read QUICKSTART_DEPLOY.md (5 min)
- [ ] Gather all secrets (Clerk keys, n8n API key, etc.)
- [ ] Create `.env.production` locally

### Day 1-2
- [ ] Supabase project + DATABASE_URL ✓
- [ ] Migrations run successfully ✓
- [ ] n8n Cloud account ready ✓
- [ ] Vercel app deployed ✓

### Day 2-3
- [ ] Demo data seeded ✓
- [ ] n8n workflows imported ✓
- [ ] Lease candidates endpoint tested ✓
- [ ] Callback endpoints working ✓

### Day 3-4
- [ ] Manual workflow trigger works ✓
- [ ] automation_logs table populated ✓
- [ ] All retry + error handling in place ✓
- [ ] Rate limiting configured ✓

### Day 5-6
- [ ] Security checklist completed ✓
- [ ] All secrets rotated ✓
- [ ] Monitoring queries set up ✓
- [ ] Backup tested ✓

### Day 7
- [ ] Final smoke tests pass ✓
- [ ] Alerts configured ✓
- [ ] Documentation complete ✓
- [ ] Launch ✓

---

## 🆘 Troubleshooting Quick Links

**Problem** | **Solution** | **File**
--- | --- | ---
App not deployed | Check Vercel logs: `vercel logs --prod` | QUICKSTART_DEPLOY.md § Day 2
Callback errors | Test with curl, verify x-api-key header | DEPLOYMENT.md § 6
n8n not executing | Check n8n execution history, verify env vars | QUICKSTART_DEPLOY.md § Day 3
Database connection timeout | Check IP whitelist + SSL mode in Supabase | DEPLOYMENT.md § 2
Multi-landlord isolation not working | Verify landlord_id filtering in all queries | SECURITY_CHECKLIST.md § Database Security

---

## 📊 Success Metrics (Post-Launch)

Monitor these daily:

```sql
-- Execution success rate (target: > 95%)
SELECT 
  outcome, 
  COUNT(*) 
FROM workflow_runs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY outcome;

-- Callback latency (target: < 5s avg)
SELECT 
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as latency_sec
FROM workflow_runs
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Active landlords (target: growing)
SELECT COUNT(DISTINCT landlord_id) 
FROM workflow_runs 
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## 🎓 Learning Resources (If Stuck)

- **Vercel Deploy:** https://vercel.com/docs/deployments/production-deployments
- **Supabase Quick Start:** https://supabase.com/docs/guides/getting-started
- **n8n Docs:** https://docs.n8n.io/
- **Drizzle Relations:** https://orm.drizzle.team/docs/rqb#querying-relational-data
- **Clerk Docs:** https://clerk.com/docs

---

## 🎯 Next Steps (After Launch)

**Week 2:**
- [ ] Add self-service credential upload UI
- [ ] Implement batch multi-landlord workflow
- [ ] Add audit logging dashboard

**Week 3:**
- [ ] Advanced monitoring + Datadog
- [ ] Performance optimization
- [ ] User feedback incorporation

**Week 4+:**
- [ ] Scale to 100+ landlords
- [ ] Add more automation workflows
- [ ] Start monetization

---

## 💬 Questions?

Review the detailed docs in order:
1. **DEPLOYMENT.md** — Complete architecture + step-by-step
2. **QUICKSTART_DEPLOY.md** — This week's checklist
3. **SECURITY_CHECKLIST.md** — Before going live
4. **.env.production** — All required secrets + format

**You're ready. Let's ship! 🚀**

---

**Update this file as you progress:**

```
[✅] Day 1: Infrastructure ready by [DATE]
[✅] Day 2: App + n8n deployed by [DATE]
[✅] Day 3: E2E testing complete by [DATE]
[✅] Day 4: Production hardening done by [DATE]
[✅] Day 5: Security audit passed by [DATE]
[✅] Day 6: Documentation complete by [DATE]
[✅] Day 7: LAUNCHED! 🎉
```

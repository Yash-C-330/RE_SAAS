# 🚀 Production Launch Checklist (Quick Reference)

**Timeline:** 7 days | **Target Date:** 2026-04-07

---

## ⏰ Day 1: Infrastructure Setup (2-3 hours)

### 1. Database (Supabase/Neon)
```bash
# Supabase
- Go to https://supabase.com
- Create project → Copy DATABASE_URL
- Dashboard → SQL Editor → Run migrations

# Neon (alternative)
- Go to https://neon.tech
- Create project → Copy DATABASE_URL
- Run: psql $DATABASE_URL < migrations.sql
```

### 2. Auth (Clerk)
```bash
# Already configured, just verify
- Go to https://dashboard.clerk.com
- Settings → Copy NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY
- Settings → CORS Origins → Add production URL
```

### 3. n8n Cloud
```bash
# n8n Cloud (fastest)
- Go to https://n8n.cloud → Sign up
- Workspace → Settings → Copy API Key
- Save as N8N_API_KEY
```

**⏸️ Stop & organize all secrets into a text file**

---

## ⏰ Day 2: Deployment (1-2 hours)

### 1. Deploy App to Vercel

```bash
# Method A: Command line
npm install -g vercel
cd app
vercel --prod --env-file .env.production
# Follow prompts, select project

# Method B: GitHub
git push main  # If Vercel is linked to GitHub
# Vercel auto-deploys on push
```

**After deployment:**
- Note the URL: `https://app-name-xyz.vercel.app`
- Update `NEXT_PUBLIC_APP_URL` in `.env.production`
- Add custom domain in Vercel settings (optional)

### 2. Set Secrets in Vercel
```bash
# Vercel dashboard → Project → Settings → Environment Variables
# Add all from .env.production:

NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
DATABASE_URL=postgresql://...
N8N_WEBHOOK_URL=https://n8n.yourdomain.com
N8N_API_KEY=...
N8N_CALLBACK_SECRET=...
# ... rest of secrets
```

### 3. Seed Demo Data

```bash
# After app is deployed, seed database
cd app
DATABASE_URL=postgresql://... npx ts-node scripts/seed.ts

# Output should show:
# ✅ Database seeded successfully!
# Landlords: 2
# Properties: 2
# Units: 3
# Tenants: 3
# Leases: 3
```

---

## ⏰ Day 2-3: n8n Setup (1 hour)

### 1. Create n8n Workflows

In n8n Cloud dashboard:

```bash
# Project → Workflows → New
# Import from file → select n8n_rent_reminders.workflow.json
```

### 2. Configure Workflow Environment

In n8n → Settings → Environment Variables:

```bash
N8N_LANDLORD_ID=00000000-0000-0000-0000-000000000001
N8N_CALLBACK_SECRET=<your-secret>
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
N8N_APP_CALLBACK_URL=https://app.yourdomain.com
INTEGRATIONS_MODE=managed
```

### 3. Test Callback

```bash
# In n8n: Open rent-reminders workflow
# Click play (manual trigger)
# Watch execution → should see HTTP - Callback to App succeed
# Check app: SELECT * FROM automation_logs ORDER BY ran_at DESC LIMIT 1
# Should show success entry
```

### 4. Activate Workflow

```bash
# In n8n UI: Toggle "active" = true
# Cron will run tomorrow at specified time
```

---

## ⏰ Day 3: Wiring & Testing (1-2 hours)

### 1. Test Lease Candidates Endpoint

```bash
curl -H "x-landlord-id: 00000000-0000-0000-0000-000000000001" \
  https://app.yourdomain.com/api/automations/lease-candidates

# Expected response:
# {
#   "candidates": [
#     {
#       "leaseId": "...",
#       "landlordId": "00000000-0000-0000-0000-000000000001",
#       "tenantName": "Alex Chen",
#       "email": "alex@tenants.demo",
#       "phone": "+15551234567",
#       "daysToDue": 5,
#       "overdueDays": 0
#     },
#     ...
#   ]
# }
```

### 2. Test Manual Workflow Trigger

```bash
# From app dashboard: Click "Run now" on rent-reminders
# Check app logs: curl https://app.yourdomain.com/api/automations

# Should show: "Connected: 1/6" and workflow_runs table has entry
```

### 3. Monitor Automation Logs

```bash
# In database, check:
SELECT * FROM automation_logs 
  WHERE created_at > NOW() - INTERVAL '1 hour'
  ORDER BY ran_at DESC;

# Should show successful runs
```

---

## ⏰ Day 4: End-to-End Test (1 hour)

### Rent Reminders Full Flow

```bash
# 1. Verify demo data has unpaid lease:
SELECT * FROM rent_payments 
  WHERE status = 'pending' 
  AND due_date <= NOW() + INTERVAL '7 days';

# 2. Manually trigger workflow:
curl -X POST https://app.yourdomain.com/api/automations/rent-reminders/run \
  -H "Authorization: Bearer <clerk-token>" \
  -H "Content-Type: application/json"

# 3. Check callback was recorded:
SELECT * FROM workflow_runs 
  WHERE workflow_name = 'rent-reminders' 
  ORDER BY created_at DESC LIMIT 1;
# Should have status = 'success'

# 4. Monitor n8n execution:
# n8n UI → Executions → Select workflow → View latest run
# Should show all nodes green ✓
```

---

## ⏰ Day 5: Error Handling & Monitoring (1-2 hours)

### 1. Add Error Retry Logic

```typescript
// In src/app/api/automations/[automationId]/run/route.ts
// Add exponential backoff retry on n8n failures:

const maxRetries = 3;
let lastError;
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    const response = await fetch(webhookUrl, { ... });
    if (response.ok) return response;
  } catch (e) {
    lastError = e;
    await sleep(Math.pow(2, attempt) * 1000); // 2s, 4s, 8s
  }
}
throw lastError;
```

### 2. Add Rate Limiting

```typescript
// In middleware.ts
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,             // 50 requests per minute
  keyGenerator: (req) => req.headers['x-landlord-id'] || req.ip,
});

// Apply to webhook route
```

### 3. Set Up Monitoring Dashboard

```sql
-- Create view for monitoring:
CREATE OR REPLACE VIEW automation_status AS
SELECT 
  workflow_name,
  outcome,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_sec
FROM workflow_runs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY workflow_name, outcome;

-- Query daily:
SELECT * FROM automation_status ORDER BY workflow_name;
```

---

## ⏰ Day 6: Security Checklist (1-2 hours)

### Critical Items Only (Not Full Checklist)

- [ ] No secrets in git
  ```bash
  git log --all -S 'sk_live' --oneline  # Empty?
  git log --all -S 'postgres://' --oneline  # Empty?
  ```

- [ ] HTTPS enforced
  ```bash
  curl -I http://app.yourdomain.com  # 301 to https?
  ```

- [ ] Database IP whitelist
  ```bash
  # Supabase: Only allow Vercel IP (show in Vercel settings)
  ```

- [ ] Secrets not in logs
  ```bash
  vercel logs --prod | grep -i "password\|secret"  # Empty?
  ```

- [ ] Webhook validates secret
  ```bash
  # POST /api/webhooks/n8n without x-api-key
  # Should return 401
  ```

- [ ] Database backups working
  ```bash
  # Supabase: Dashboard → Backups → View latest
  # Try restore to staging DB
  ```

**See SECURITY_CHECKLIST.md for full list**

---

## ⏰ Day 7: Launch! (1 hour)

### Final Checks

```bash
# 1. Test all core flows one more time
curl https://app.yourdomain.com/api/automations  # 200?
curl https://app.yourdomain.com/api/properties   # 200?

# 2. Verify no recent errors
vercel logs --prod | tail -20  # All 200s?

# 3. Check database is healthy
psql $DATABASE_URL -c "SELECT count(*) FROM landlords;"  # 2?

# 4. Test manual workflow trigger
# Click "Run now" in dashboard → succeeds?

# 5. Check automation_logs table
# SELECT * FROM automation_logs ORDER BY ran_at DESC LIMIT 5;
# All status = 'success'?
```

### Production Handoff

- [ ] Documentation updated
- [ ] Admin user created in production
- [ ] Demo landlord can sign in and see properties
- [ ] Monitoring set to Slack/email alerts
- [ ] On-call rotation for week 1

---

## 🔥 Emergency Contacts

**When things break:**

1. **App not loading** → Check Vercel logs: `vercel logs --prod`
2. **Database unavailable** → Supabase dashboard status page
3. **n8n not triggering** → Check n8n UI execution history
4. **Callback errors** → Check workspace logs: curl endpoint + verify headers
5. **Secrets exposed** → Rotate immediately + re-deploy

---

## 📊 Success Metrics (Day 8+)

Monitor daily:

```sql
-- Active landlords
SELECT COUNT(DISTINCT landlord_id) FROM workflow_runs 
  WHERE created_at > NOW() - INTERVAL '24 hours';

-- Successful automations
SELECT outcome, COUNT(*) FROM workflow_runs 
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY outcome;

-- Error rate
SELECT COUNT(*) FILTER (WHERE status = 'failed') :: FLOAT / COUNT(*) * 100 as error_pct
FROM workflow_runs WHERE created_at > NOW() - INTERVAL '24 hours';
-- Target: < 5%
```

---

## 🎉 You're Live!

**Celebrate!** Your production system is running. Now focus on:
- Monitoring error logs
- Fixing user-reported bugs
- Scaling infrastructure as needed (week 2+)

Good luck! 🚀

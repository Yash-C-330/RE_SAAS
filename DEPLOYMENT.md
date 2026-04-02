# Production Deployment Blueprint (1-Week Launch)

**Timeline:** Day 1-7 | **Target:** 2026-04-07

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Users (Web Browser)                       │
│              https://app.yourdomain.com                      │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
   ┌────▼─────────────┐           ┌──────▼───────────┐
   │  Vercel/Railway  │           │    n8n Cloud     │
   │   (Next.js App)  │           │   or Self-Host   │
   │  • Frontend UI   │           │  • Workflows     │
   │  • API routes    │           │  • Scheduling    │
   └────┬─────────────┘           └──────┬───────────┘
        │                                 │
        └────────────────┬────────────────┘
                    (HTTPS)
                         │
        ┌────────────────┴────────────────┐
        │    Shared Single Database       │
        │     (Supabase/Neon)             │
        │   PostgreSQL with row-level     │
        │   tenant isolation (landlord_id)│
        └─────────────────────────────────┘
```

**Key principle:** One backend, one database, multi-tenant via landlord_id row filtering.

---

## 1. Hosting Choices (Fastest Path to Production)

### Recommended Stack (Fewest moving parts)

| Component | Provider | Cost | Time to Deploy |
| --- | --- | --- | --- |
| App (frontend + API) | Vercel | $0-20/mo | 5 min |
| Database | Supabase (Postgres) | $25/mo+ | 2 min |
| Workflow / Automation | n8n Cloud | $50-100/mo | 10 min |
| Auth | Clerk (existing) | $0 free tier | Already setup |
| Redis/Cache | Upstash | $0-10/mo | 2 min |
| Monitoring | Vercel (built-in) | Included | 0 min |

**Total setup time: ~20 minutes**

### Alternative: Single-Server (Full Control)

If you prefer single-host:
- **Railway** or **Fly.io** for both app + n8n
- Easier config, less vendor lock-in
- Slightly more OpEx

---

## 2. Step-by-Step Deployment (Days 1-3)

### Day 1: Production Database Setup

#### Supabase (Recommended)
1. Go to https://supabase.com → Sign up
2. Create org and project
3. Copy `DATABASE_URL` connection string
4. Run migrations:
   ```bash
   cd app
   npx drizzle-kit push
   ```
5. Seed demo data (see section 6 below)
6. Test connection:
   ```bash
   psql <your-db-url> -c "SELECT count(*) FROM landlords"
   ```

#### Or Neon
1. Go to https://neon.tech → Sign up
2. Create project, copy connection string
3. Same migration + seed steps

**Result:** Production database live with landlord + leases ready.

---

### Day 1: Environment Secrets Setup

Create `.env.production` (DO NOT commit):
```bash
# App (Vercel/Railway)
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
DATABASE_URL=postgresql://...@...supabase.co/...

# n8n Connectivity
N8N_WEBHOOK_URL=https://n8n.yourdomain.com  # or https://app-name-n8n.railway.app
N8N_API_KEY=n8n-api-key-from-cloud
N8N_CALLBACK_SECRET=<generate-random-32-char>
N8N_APP_CALLBACK_URL=https://app.yourdomain.com
N8N_LANDLORD_ID=<primary-demo-landlord-uuid>  # Only needed if running scheduled workflows

# Integrations (Managed Mode)
INTEGRATIONS_MODE=managed
OPENAI_API_KEY=sk_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Encryption for tenant credentials
TENANT_CREDENTIALS_ACTIVE_KEY_VERSION=1
TENANT_CREDENTIALS_KEY_V1=$(echo -n "your-32-byte-random-key" | base64)

# Optional: Monitoring
SENTRY_DSN=https://...@sentry.io/...
```

**Action:** Add to Vercel/Railway secrets dashboard (not in code).

---

### Day 2: Deploy App

#### Option A: Vercel (Fastest)
```bash
npm install -g vercel

vercel login
cd app
vercel --prod --env-file .env.production
# Follow prompts, select project, deploy
```

After deployment:
- Update `NEXT_PUBLIC_APP_URL` to deployed URL
- Re-deploy with correct callback URL

#### Option B: Railway
```bash
npm install -g railway

railway login
cd app
railway up --environment production
# Railway auto-deploys on git push if linked
```

**Result:** App live at https://app.yourdomain.com

---

### Day 2: Set up n8n

#### Option A: n8n Cloud (No ops)
1. https://n8n.cloud → Sign up
2. Create workspace
3. Admin panel → Settings → Copy API Key
4. Add to app env: `N8N_API_KEY=...`

#### Option B: Self-Host on Railway
```bash
railway up --environment production \
  -e N8N_USER_MANAGEMENT_JWT_SECRET=<random> \
  -e N8N_ENCRYPTION_KEY=<random> \
  -e DATABASE_URL=postgres://... \
  -e N8N_HOST=https://n8n.yourdomain.com
```

**For this week:** Use n8n Cloud (no support needed).

---

### Day 3: Wire n8n ↔ App

#### 1. Test callback endpoint
```bash
curl -X POST https://app.yourdomain.com/api/webhooks/n8n \
  -H "x-api-key: $N8N_CALLBACK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowName": "test",
    "trigger": "manual",
    "outcome": "success",
    "landlordId": "00000000-0000-0000-0000-000000000001",
    "correlationId": "test-123"
  }'
# Expected: 200 OK
```

#### 2. Import n8n workflows
In n8n UI:
- Projects → Import from file
- Upload `n8n_rent_reminders.workflow.json`
- Update env vars in HTTP node
- **Enable workflow** (toggle active = true)

#### 3. Test rent-reminders cron
In n8n UI:
- Open workflow
- Manual run (play button)
- Check app database for automation_logs entry
- Verify callback was recorded

**Result:** n8n can reach app, workflows execute and callback successfully.

---

## 3. Multi-Landlord Tenant Isolation

### Database Layer (Already in schema)
Every table has `landlord_id` foreign key:
```sql
SELECT * FROM properties WHERE landlord_id = $1;
SELECT * FROM leases WHERE tenant_id IN (SELECT id FROM tenants WHERE landlord_id = $1);
```

### API Layer (Query filtering)
Example (already implemented in `/api/properties`):
```typescript
const properties = await db
  .select()
  .from(properties)
  .where(eq(properties.landlordId, landlord.id));
```

### n8n Layer (Header-based routing)
Workflows pass `x-landlord-id` header:
```json
{
  "method": "GET",
  "url": "{{ $env.NEXT_PUBLIC_APP_URL + '/api/automations/lease-candidates' }}",
  "headers": {
    "x-landlord-id": "{{ $env.N8N_LANDLORD_ID }}"
  }
}
```

**Audit check:** Verify in staging:
```sql
-- Should return 0 rows (no data leakage)
SELECT * FROM automation_logs 
  WHERE landlord_id != '00000000-0000-0000-0000-000000000001'
  AND created_by_user = 'user-from-landlord-1';
```

---

## 4. Multi-Landlord Batch Workflow (Optional, recommend Phase 2)

For now, create ONE workflow that processes multiple landlords:

**n8n_batch_rent_reminders.workflow.json** structure:
```
Schedule Trigger (daily 8 AM)
  ↓
Fetch Active Landlords (GET /api/admin/landlords-with-leases internal endpoint)
  ↓
Loop: For Each Landlord
  ├─ Fetch lease candidates (GET /api/automations/lease-candidates, x-landlord-id header)
  ├─ Classify + filter reminders
  ├─ Send callbacks per landlord
  └─ Log run summary
  ↓
Summary callback (all landlords processed)
```

**For week 1:** Keep simple—one n8n workflow, one N8N_LANDLORD_ID in env, processes one landlord per cron.

In week 2, add internal `/api/admin/landlords-with-leases` endpoint for batch mode.

---

## 5. Security Checklist (Day 6)

- [ ] Database: IP whitelist on Supabase (only app IP)
- [ ] Database: Enable SSL (default in Supabase/Neon)
- [ ] Clerk: Verify CORS origins in dashboard
- [ ] App: Rate limit on `/api/webhooks/n8n` (50 req/min per landlord_id)
- [ ] App: Validate `x-api-key` header on webhook (constant-time compare)
- [ ] n8n: Public API auth enabled in Settings
- [ ] n8n: Never expose N8N_API_KEY in client-side code
- [ ] Vercel: Enable branch protection + require reviews
- [ ] Secrets: All env vars use platform secret managers (not .env files in prod)
- [ ] Logs: Monitor automation_logs table for errors daily
- [ ] HTTPS: Enforce in Vercel settings / Railway config

---

## 6. Network Architecture & Callbacks

### Flow: Manual Trigger (User clicks "Run Now")
```
User clicks → App API /api/automations/[id]/run
  ↓
App constructs webhook URL (tries /webhook/{path} then /webhook-test/{path})
  ↓
App POSTs to n8n webhook URL with landlord_id, user context
  ↓
n8n executes workflow
  ↓
n8n POSTs callback to app /api/webhooks/n8n with x-api-key header
  ↓
App receives, verifies secret, updates workflow_runs table
  ↓
App response 200 OK
```

### Flow: Scheduled Trigger (Cron 8 AM)
```
n8n Schedule Trigger fires
  ↓
n8n fetches lease candidates from app /api/automations/lease-candidates
  ↓
n8n filters + classifies (all in-memory, no DB access)
  ↓
n8n sends SMS/emails (Twilio, Resend via managed mode)
  ↓
n8n callback POST to app /api/webhooks/n8n
  ↓
App logs outcome in automation_logs
```

**Callback verification in app:**
```typescript
const incomingSecret = req.headers.get('x-api-key');
const expected = process.env.N8N_CALLBACK_SECRET;
if (!timingSafeCompare(incomingSecret, expected)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

## 7. Environment Variables by Service

### Vercel App (.env.production)
```
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
DATABASE_URL
N8N_WEBHOOK_URL
N8N_CALLBACK_SECRET
N8N_APP_CALLBACK_URL
OPENAI_API_KEY
TWILIO_*
RESEND_API_KEY
EMAIL_FROM
STRIPE_*
TENANT_CREDENTIALS_*
```

### n8n (.env or Docker Compose)
```
DATABASE_URL (if self-hosted)
N8N_HOST (domain URL)
N8N_ENCRYPTION_KEY (random)
N8N_USER_MANAGEMENT_JWT_SECRET (random)
N8N_ALLOW_INTERNAL_API=true
N8N_DISABLE_PRODUCTION_MAIN_PROCESS=false
```

### Workflows (Hardcoded in workflow JSON or n8n env)
```
N8N_LANDLORD_ID
N8N_CALLBACK_SECRET
NEXT_PUBLIC_APP_URL
N8N_APP_CALLBACK_URL
EMAIL_FROM (for templates)
INTEGRATIONS_MODE
```

---

## 8. Minimum Viable Monitoring (Day 5-6)

### Database Queries to Monitor
```sql
-- Active failed workflows
SELECT * FROM workflow_runs 
  WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '24 hours'
  ORDER BY updated_at DESC LIMIT 10;

-- Recent automation logs
SELECT workflow_name, outcome, COUNT(*) 
  FROM automation_logs 
  WHERE ran_at > NOW() - INTERVAL '24 hours'
  GROUP BY workflow_name, outcome;

-- Callback latency
SELECT 
  workflow_name,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_latency_sec
FROM workflow_runs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY workflow_name;
```

### App Logs to Watch
```bash
# Vercel logs
vercel logs --prod

# n8n logs (if self-hosted)
docker logs n8n-container

# Database slow queries (Supabase dashboard → Logs)
```

---

## 9. Day-by-Day Execution

| Day | Task | Owner | Validation |
| --- | --- | --- | --- |
| 1 | Setup Supabase, seed demo landlords/leases | You | SELECT count(*) FROM landlords → 2+ |
| 1 | Create .env.production, add to vault | You | All secrets present in Vercel/Railway |
| 2 | Deploy app to Vercel/Railway | You | curl https://app.yourdomain.com → 200 |
| 2 | Setup n8n Cloud, get API key | You | Login to n8n dashboard |
| 3 | Import + test rent-reminders workflow | You | Manual run → callback reaches app |
| 3 | Wire webhook paths & callbacks | You | curl /api/webhooks/n8n → 200 |
| 4 | Run end-to-end with demo data | You | Check automation_logs table |
| 5 | Add error retry logic (optional) | You | Simulate failure → retry after 30s |
| 5 | Add basic rate limiting | You | curl with limit header → 429 after 50 req |
| 6 | Create grafana/datadog dashboard OR SQL monitoring | You | View last 24 hr workflow runs |
| 6 | Run security checklist | You | All items checked ✓ |
| 7 | Load test with 10+ demo landlords | You | Monitor db/app during batch run |
| 7 | Customer handover docs + launch | You | Share docs, go live |

---

## 10. Cost Estimate (Monthly)

| Service | Tier | Cost |
| --- | --- | --- |
| Vercel | Pro | $20 |
| Supabase | Small | $25 |
| n8n Cloud | Standard | $50 |
| Clerk | Pro (if needed) | $0-50 |
| Upstash Redis | Free-$10 | $0-10 |
| Twilio | Pay-as-you-go | $0-50 (SMS) |
| Resend | Pay-as-you-go | $0-20 (email) |
| **Total** | | **$165-225/mo** |

*Scales up linearly with SMS/email volume.*

---

## 11. Post-Launch Improvements (Week 2+)

1. **Self-service credentials UI** — Let landlords add their own API keys
2. **Batch multi-landlord workflow** — Process all landlords in one cron
3. **Advanced monitoring** — Datadog, Sentry, custom alerts
4. **High-availability n8n** — Cluster mode, auto-failover
5. **Key rotation service** — Automated credential cycling
6. **Audit logging** — Who triggered what workflow and when
7. **Webhook retry policy** — Exponential backoff + DLQ

---

## Troubleshooting

### Callback ECONNREFUSED
- Check `N8N_APP_CALLBACK_URL` is reachable from n8n network
- If n8n in Docker: use `http://host.docker.internal:3000` (Mac/Windows) or `http://172.17.0.1:3000` (Linux)
- Test: `curl http://<callback-url>/api/webhooks/n8n -v`

### Lease candidates return 0
- Check `N8N_LANDLORD_ID` env var in n8n workflow
- Verify landlord_id exists in database: `SELECT * FROM landlords WHERE id = '...'`
- Verify leases exist: `SELECT * FROM leases WHERE id IN (SELECT id FROM leases)`

### App not receiving callbacks
- Check X-API-KEY header in n8n workflow matches `N8N_CALLBACK_SECRET`
- Check app logs in Vercel dashboard for 401/403 errors
- Verify workflow_runs table is getting created

### Database connection timeout
- Check DATABASE_URL in Vercel secrets
- Check IP whitelist on Supabase (allow Vercel IPs)
- Test locally: `psql <url> -c "SELECT 1"`

---

**Ready to deploy? Confirm:**
1. Supabase project created ✓
2. n8n Cloud account ready ✓
3. Vercel/Railway up ✓
4. All secrets populated ✓
5. Demo data seeded ✓

Then run Day 2-3 steps!

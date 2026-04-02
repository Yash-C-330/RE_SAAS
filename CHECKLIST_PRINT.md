# 🚀 Print This: 7-Day Launch Checklist

**Start Date:** __________ | **Target Launch:** 7 Days Later

---

## 📋 DAY 1: INFRASTRUCTURE (2-3 hours)

### Morning (30 min)
- [ ] Read DEPLOYMENT.md § 2 (step-by-step walkthrough)
- [ ] Open Supabase sign-up: https://supabase.com
- [ ] Open n8n sign-up: https://n8n.cloud
- [ ] Have Clerk keys ready (from prev setup)

### Setup Database (30 min)
```bash
# Supabase
- [ ] Create account & org
- [ ] Create PostgreSQL project
- [ ] Copy DATABASE_URL from Connection Pooler
- [ ] Test: psql <url> -c "SELECT 1"
- [ ] Run migrations: npx drizzle-kit push
```

### Setup n8n (20 min)
```bash
# n8n Cloud
- [ ] Create account & workspace
- [ ] Go to Settings → API Keys
- [ ] Generate API key
- [ ] Save as N8N_API_KEY
```

### Collect All Secrets (30 min)
Using .env.production as template:
- [ ] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY `pk_live_...`
- [ ] CLERK_SECRET_KEY `sk_live_...`
- [ ] DATABASE_URL `postgresql://...`
- [ ] N8N_API_KEY `n8n_api_...`
- [ ] N8N_CALLBACK_SECRET (generate: `openssl rand -hex 16`)
- [ ] OPENAI_API_KEY `sk_...`
- [ ] TWILIO_ACCOUNT_SID `AC...`
- [ ] TWILIO_AUTH_TOKEN
- [ ] TWILIO_FROM_NUMBER `+1...`
- [ ] RESEND_API_KEY `re_...`
- [ ] EMAIL_FROM `noreply@yourdomain.com`
- [ ] STRIPE_SECRET_KEY `sk_live_...`
- [ ] STRIPE_WEBHOOK_SECRET `whsec_...`
- [ ] TENANT_CREDENTIALS_KEY_V1 (base64 32-byte key)

**End of Day 1:**
- [ ] `.env.production` filled in completely
- [ ] Database reachable (`psql` works)
- [ ] n8n API key verified
- All secrets safely stored (not in git)

---

## 📦 DAY 2: DEPLOYMENT (1-2 hours)

### Deploy App to Vercel (30 min)
```bash
- [ ] npm install -g vercel
- [ ] cd app && vercel login
- [ ] vercel --prod --env-file .env.production
- [ ] Note deployed URL (e.g., app-xyz.vercel.app)
- [ ] Update NEXT_PUBLIC_APP_URL if domain changed
```

### Add Secrets to Vercel (20 min)
```bash
- [ ] Vercel dashboard → Project → Settings → Environment Variables
- [ ] Paste all vars from .env.production
- [ ] Verify all pasted correctly
- [ ] Redeploy: git push (if GitHub linked) or vercel --prod again
```

### Seed Demo Data (20 min)
```bash
- [ ] DATABASE_URL=postgresql://... npx ts-node scripts/seed.ts
- [ ] (from app directory)
- [ ] Output shows: ✅ Database seeded successfully!
- [ ] Verify: psql... "SELECT COUNT(*) FROM landlords" → 2
```

**End of Day 2:**
- [ ] App deployed to Vercel
- [ ] All secrets in Vercel dashboard
- [ ] Demo data in database (2 landlords, 3 properties, 3 leases)

---

## ⚙️ DAY 2-3: N8N SETUP (1-2 hours)

### Import Workflows (20 min)
```
- [ ] Go to n8n dashboard → Projects
- [ ] New Workflow → Import from File
- [ ] Select n8n_rent_reminders.workflow.json
- [ ] Repeat for n8n_rent_reminders_batch.workflow.json
```

### Configure Environment (20 min)
```
n8n Settings → Environment Variables:
- [ ] N8N_LANDLORD_ID=00000000-0000-0000-0000-000000000001
- [ ] N8N_CALLBACK_SECRET=<your-secret>
- [ ] NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
- [ ] N8N_APP_CALLBACK_URL=https://app.yourdomain.com
- [ ] INTEGRATIONS_MODE=managed
```

### Test Workflow (20 min)
```bash
- [ ] Open rent-reminders workflow in n8n UI
- [ ] Click play button (manual trigger)
- [ ] Watch nodes execute (should all turn green ✓)
- [ ] Check HTTP - Callback to App node → should succeed
- [ ] Check app: psql... "SELECT * FROM automation_logs ORDER BY ran_at DESC LIMIT 1"
- [ ] Should show: outcome='success'
```

**End of Day 2-3:**
- [ ] n8n workflows imported + active
- [ ] Callback secret matches both places
- [ ] Manual test passes (workflow runs successfully)

---

## 🧪 DAY 3-4: E2E TESTING (1-2 hours)

### Test API Endpoints (20 min)
```bash
- [ ] curl -H "x-landlord-id: 00000000-0000-0000-0000-000000000001" \
        https://app.yourdomain.com/api/automations/lease-candidates
- [ ] Returns JSON with 3+ lease candidates
```

### Test Manual Trigger (20 min)
```bash
- [ ] Open app dashboard in browser
- [ ] Click "Run now" on rent-reminders automation
- [ ] Check workflow_runs table: 
      SELECT * FROM workflow_runs WHERE workflow_name='rent-reminders' ORDER BY created_at DESC LIMIT 1
- [ ] Status should be: 'success'
```

### Monitor n8n (10 min)
```
- [ ] n8n UI → Executions → View latest run
- [ ] All nodes should be green ✓
- [ ] No timeout or 403 errors
```

**End of Day 3-4:**
- [ ] All APIs return 200 OK
- [ ] Manual workflow trigger works end-to-end
- [ ] automation_logs + workflow_runs tables populated

---

## 🛡️ DAY 4-5: ERROR HANDLING (1-2 hours)

### Add Retry Logic (30 min)
```bash
- [ ] Edit: src/app/api/automations/[automationId]/run/route.ts
- [ ] Add exponential backoff (2s, 4s, 8s retries)
- [ ] Test: npm run build (should compile)
- [ ] Deploy: vercel --prod
```

### Add Rate Limiting (30 min)
```bash
- [ ] Edit: src/app/api/webhooks/n8n/route.ts
- [ ] Add rate limit checker (50 req/min per landlord_id)
- [ ] Test 60 rapid requests:
      for i in {1..60}; do curl ... ; done
- [ ] Should see 429 responses after 50
- [ ] Build + deploy: npm run build && vercel --prod
```

### Add Monitoring Queries (30 min)
```sql
- [ ] Save to Notion / Slack command:
      SELECT outcome, COUNT(*) FROM workflow_runs 
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY outcome;
- [ ] Schedule to run daily at 9 AM
- [ ] Alert if error_rate > 5%
```

**End of Day 4-5:**
- [ ] Error retry logic in place
- [ ] Rate limiting prevents abuse
- [ ] Daily monitoring queries saved

---

## 🔐 DAY 5-6: SECURITY AUDIT (1-2 hours)

### Critical Security Checks (1 hour)
```bash
- [ ] No secrets in git: git log --all -S 'sk_live' --oneline
      (Should be empty)
- [ ] Database IP whitelist: 
      Supabase Dashboard → Settings → Network → Allow Vercel IP
- [ ] HTTPS enforced: curl -I http://app.yourdomain.com
      (Should show 301 → https)
- [ ] Backup tested: Restore DB to staging, run migration
- [ ] Webhook validates secret: 
      curl /api/webhooks/n8n without x-api-key → 401
```

### Full Checklist (1 hour)
```
- [ ] Review SECURITY_CHECKLIST.md items 1-3 (Secrets & Keys)
- [ ] Review SECURITY_CHECKLIST.md items 4-5 (Database & Auth)
- [ ] Review SECURITY_CHECKLIST.md items 6-7 (API & Deployment)
- [ ] Check all boxes: ✓✓✓
```

**End of Day 5-6:**
- [ ] All critical security items ✓
- [ ] Backup restoration tested
- [ ] No secrets exposed in logs/git

---

## 📚 DAY 6: DOCUMENTATION (1 hour)

- [ ] Update README.md with production deploy commands
- [ ] Create runbook doc (what to do if X breaks)
- [ ] Document N8N_LANDLORD_ID usage
- [ ] Create admin account for support
- [ ] List 24/7 on-call contact

**End of Day 6:**
- [ ] Docs complete for support handoff
- [ ] Runbook written for common issues

---

## 🚀 DAY 7: LAUNCH (1 hour)

### Final Smoke Tests (30 min)
```bash
- [ ] curl https://app.yourdomain.com/api/automations → 200 ✓
- [ ] curl https://app.yourdomain.com/api/properties → 200 ✓
- [ ] Log in to dashboard as test user → works ✓
- [ ] Click "Run now" on automation → succeeds ✓
- [ ] Check automation_logs: SELECT outcome, COUNT(*) ... → all success ✓
```

### Enable Monitoring Alerts (15 min)
```
- [ ] Slack webhook for error_rate > 5%
- [ ] Email alert if app down (Vercel status page)
- [ ] Manual daily check: run KPI queries
```

### Announce & Go Live (15 min)
```
- [ ] Email to landlords: "Platform live at https://app.yourdomain.com"
- [ ] Post launch tweet/announcement
- [ ] Monitor logs for 1 hour post-launch
- [ ] Celebrate! 🎉
```

**End of Day 7:**
- [ ] ✅ LIVE TO CUSTOMERS
- [ ] ✅ Monitoring alerts active
- [ ] ✅ On-call ready

---

## 📊 POST-LAUNCH (Week 2)

### Daily Monitoring (5 min)
```sql
-- Success rate (target: > 95%)
SELECT outcome, COUNT(*) FROM workflow_runs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY outcome;

-- Error rate (target: < 5%)
SELECT (COUNT(*) FILTER (WHERE status='failed') :: FLOAT / COUNT(*)) * 100 as error_pct
FROM workflow_runs WHERE created_at > NOW() - INTERVAL '24 hours';
```

### Weekly Improvements
- [ ] Week 2: Add self-service credential UI
- [ ] Week 2: Batch multi-landlord workflow
- [ ] Week 3: Advanced monitoring (Datadog)
- [ ] Week 4: Scale to 1000 landlords

---

## 🆘 Emergency Contacts

| Problem | Solution |
| --- | --- |
| App not responding | `vercel logs --prod` |
| Database down | Supabase status page + restore from backup |
| n8n not triggering | n8n execution history + env vars check |
| Callback errors | Test curl + verify headers |
| Need to rollback | `vercel rollback` in Vercel dashboard |

---

## ✅ Final Sign-Off

**Prepared by:** ______________________ **Date:** __________

**Approved by:** ______________________ **Date:** __________

**Launched by:** ______________________ **Date:** __________

---

**Printed:** __________ | **Status:** ☐ In Progress | ☐ Complete | ☐ Launched 🚀

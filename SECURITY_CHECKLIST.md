# Production Security Checklist ✅

**When to use:** Day 6 of 7-day launch | **Owner:** DevOps/Security | **Target:** 100% complete before launch

---

## 🔐 Secrets & Keys

- [ ] No credentials in git history
  ```bash
  git log --all -S 'sk_live' --oneline  # Should be empty
  git log --all -S 'postgres://' --oneline  # Should be empty
  ```

- [ ] All secrets in platform secret manager (Vercel/Railway secrets, not .env files)
  
- [ ] `.env.production` exists locally but `.gitignore` blocks it
  ```bash
  cat .gitignore | grep "\.env"
  # Should show: .env.local, .env.production, etc.
  ```

- [ ] Database password strength: 32+ chars, random
  ```bash
  # Verify in provider dashboard (Supabase/Neon)
  ```

- [ ] Encryption keys are 32 bytes (256-bit) base64
  ```bash
  echo -n "$TENANT_CREDENTIALS_KEY_V1" | base64 -d | wc -c
  # Should output: 32
  ```

- [ ] API keys have minimal permissions
  - [ ] OpenAI: `chat.completions` scope only
  - [ ] Stripe: No write access (read + webhook only)
  - [ ] Twilio: SMS send scope only
  - [ ] n8n: API + Workflow trigger scopes only

- [ ] No hardcoded secrets in workflow JSON files
  ```bash
  grep -r "sk_live\|sk_test" workflows/
  # Should be empty
  ```

---

## 🌐 Database Security

- [ ] Database URL uses `sslmode=require` for PostgreSQL
  ```bash
  echo $DATABASE_URL | grep "sslmode=require"
  # Must match
  ```

- [ ] IP whitelist enabled in database provider
  - [ ] Supabase: Dashboard → Project Settings → Database → Network
  - [ ] Only allow Vercel IP + your dev IP
  - [ ] Block 0.0.0.0/0

- [ ] Database backups enabled and tested
  - [ ] Supabase: Enabled (default, daily)
  - [ ] Recovery tested: can restore from backup
  
- [ ] No public access to database port (5432)
  ```bash
  # From external network—should timeout
  nc -zv <supabase-host> 5432
  # Should fail / timeout
  ```

- [ ] Row-level security check: landlord_id filtering works
  ```sql
  -- Run as tenant-1:
  SELECT * FROM properties WHERE landlord_id = 'tenant-2-id';
  -- Must return 0 rows
  ```

- [ ] Connection pooling enabled (Supabase: default, check Settings)

---

## 🔑 Authentication (Clerk)

- [ ] CORS origins configured in Clerk dashboard
  - [ ] Production: `https://app.yourdomain.com`
  - [ ] Dev: `http://localhost:3000`
  - [ ] Staging: `https://staging-app.yourdomain.com`

- [ ] Redirect URLs match in Clerk settings
  - [ ] Sign-in: `/sign-in`
  - [ ] Sign-up: `/sign-up`
  - [ ] After sign-in: `/dashboard`

- [ ] Test sign-in flow end-to-end in production
  - [ ] Create test landlord account
  - [ ] Verify email confirmation works
  - [ ] Check JWT tokens in LocalStorage (chrome dev tools)

- [ ] Session timeout configured (default 7 days)

- [ ] Webhook from Clerk enabled (if using user events)

---

## 🌐 API & Endpoints Security

- [ ] Rate limiting enabled on `/api/webhooks/n8n`
  ```bash
  # Simulates 100 requests to webhook
  for i in {1..100}; do
    curl -s -o /dev/null -w "%{http_code}\n" \
      -H "x-api-key: $N8N_CALLBACK_SECRET" \
      https://app.yourdomain.com/api/webhooks/n8n
  done | sort | uniq -c
  # Should show 429 after rate limit exceeded
  ```

- [ ] API routes validate all headers
  - [ ] `/api/webhooks/n8n`: Requires `x-api-key` header
  - [ ] Lease-candidates: Requires `x-landlord-id` header
  - [ ] Constant-time comparison used (not `===`)

  ```typescript
  // Verify in code:
  const crypto = require('crypto');
  crypto.timingSafeEqual(Buffer.from(incoming), Buffer.from(expected));
  ```

- [ ] CORS headers correct
  ```bash
  curl -I https://app.yourdomain.com/api/properties
  # Should NOT have Access-Control-Allow-Origin: *
  ```

- [ ] CSP header set
  ```bash
  curl -I https://app.yourdomain.com
  # Should show Content-Security-Policy header
  ```

- [ ] X-Frame-Options set (clickjacking protection)
  ```bash
  curl -I https://app.yourdomain.com | grep X-Frame-Options
  # Should show: DENY or SAMEORIGIN
  ```

- [ ] No sensitive data in error messages
  ```bash
  # Trigger 500 error, check response
  curl https://app.yourdomain.com/api/properties?invalid=true
  # Should NOT show database connection string or secrets
  ```

---

## 🚀 Deployment & Infrastructure

- [ ] HTTPS enforced (all traffic redirects to https://)
  ```bash
  curl -I http://app.yourdomain.com
  # Should show 301 -> https://
  ```

- [ ] Vercel/Railway branch protection enabled
  - [ ] Require code review before merge to main
  - [ ] Block direct pushes to production branch

- [ ] Build logs do not expose secrets
  ```bash
  # Check Vercel/Railway build logs
  # Should NOT show DATABASE_URL, API keys, tokens
  ```

- [ ] Deployment status webhook configured (optional: Slack alerts)

- [ ] Rollback plan documented
  ```bash
  # Can recovery database from 24h backup
  # Can revert to previous app version in Vercel
  ```

---

## 🤖 n8n Security

- [ ] n8n API authentication working
  ```bash
  curl -X GET https://n8n.yourdomain.com/api/v1/workflows \
    -H "X-N8N-API-KEY: $N8N_API_KEY"
  # Should return 200 (not 401)
  ```

- [ ] Callback secret in n8n matches env var
  - [ ] Verify in n8n workflow's "HTTP - Callback to App" node
  - [ ] Value: `{{ $env.N8N_CALLBACK_SECRET }}`

- [ ] n8n doesn't expose workflow execution logs publicly
  ```bash
  # From n8n dashboard: Executions → Select workflow
  # Should require authentication
  ```

- [ ] Workflow files do NOT contain secrets (they use env vars)

- [ ] n8n installation is not publicly accessible
  ```bash
  curl https://n8n.yourdomain.com/
  # Should require login or show n8n login page
  ```

---

## 📝 Logging & Monitoring

- [ ] App logs are collected (Vercel logs, not stdout)
  ```bash
  vercel logs --prod
  # Should show recent requests
  ```

- [ ] Database query logs monitored (optional)
  - [ ] Supabase: Dashboard → Logs
  - [ ] Check for slow queries (>1s)

- [ ] Alert configured for failed authentication
  - [ ] Example: Slack webhook on 5+ failed Clerk validations

- [ ] Secrets NOT logged
  ```bash
  # Check logs for DATABASE_URL, API keys
  vercel logs --prod | grep -i "password\|secret\|api-key"
  # Should be empty
  ```

- [ ] Error tracking enabled (Sentry or similar)
  - [ ] Test: Trigger intentional error
  - [ ] Verify appears in Sentry dashboard
  - [ ] NO PII in error context

---

## 💾 Data Privacy & GDPR

- [ ] Privacy Policy linked in app footer

- [ ] Data retention policy documented
  - [ ] Automation logs: Keep 90 days?
  - [ ] Workflow runs: Keep 30 days?
  - [ ] Old backups: Delete after 365 days?

- [ ] No user data in analytics (Google Analytics, Mixpanel, etc.)
  - [ ] If using analytics: Anonymize IP, no PII
  - [ ] Clause in Privacy Policy

- [ ] Delete/export data endpoints available (GDPR Article 15, 17)
  - [ ] TBD: `/api/landlords/[id]/export` endpoint
  - [ ] TBD: `/api/landlords/[id]/delete-account` endpoint

---

## 🔧 Third-Party Integrations

- [ ] Stripe webhook signature validated
  ```typescript
  // Verify in code:
  const sig = req.headers['stripe-signature'];
  stripe.webhooks.constructEvent(body, sig, webhookSecret);
  ```

- [ ] Twilio webhook (if used) authenticates requests
  ```bash
  # From Twilio docs: Validate request signature
  ```

- [ ] OpenAI API calls use proper error handling
  - [ ] Don't expose raw API errors to client
  - [ ] Log errors server-side for debugging

---

## 🧪 Testing & Validation

- [ ] Production database backup restores successfully
  ```bash
  # Restore to staging DB, run integration tests
  npm run test:integration
  ```

- [ ] Canary deployment: Deploy to 10% of traffic first
  - [ ] Monitor error rates for 1 hour
  - [ ] Then roll out to 100%

- [ ] Load test with concurrent users
  ```bash
  # Using Apache Bench or k6:
  ab -n 1000 -c 50 https://app.yourdomain.com/api/properties
  # Should handle 50 concurrent users
  ```

- [ ] Security headers validated
  ```bash
  # Use: https://securityheaders.com
  # Enter: https://app.yourdomain.com
  # Should get A or B grade
  ```

- [ ] OWASP Top 10 checklist
  - [ ] SQL Injection: Drizzle ORM parameterized ✓
  - [ ] Broken Auth: Clerk + session validation ✓
  - [ ] Sensitive Data: HTTPS + encryption ✓
  - [ ] XXE: Next.js auto-protects ✓
  - [ ] Broken Access: Landlord_id row filtering ✓
  - [ ] CSRF: Next.js middleware ✓
  - [ ] Deserialization: No `eval()` in code ✓
  - [ ] XXS: React auto-escapes ✓
  - [ ] Dependency Vulnerabilities: `npm audit` ✓
  - [ ] Unvalidated Redirects: None in code ✓

---

## 🚨 Incident Response Plan

Document before launch:

1. **Secret exposed (e.g., API key)**
   - [ ] Rotate immediately in provider dashboard
   - [ ] Update env vars in Vercel/Railway
   - [ ] Re-deploy: `vercel --prod`
   - [ ] Monitor for unauthorized access (5 min after)
   - [ ] Check database audit logs for changes

2. **Database unavailable / corruption**
   - [ ] Restore from latest backup (Supabase: 1-click)
   - [ ] Check automation_logs for last successful run
   - [ ] Notify landlords of downtime (email + in-app banner)
   - [ ] Run `npm run verify-integrity` to check data

3. **App error rate > 5%**
   - [ ] Check Vercel build logs
   - [ ] Roll back previous version: `vercel rollback`
   - [ ] Check database connection
   - [ ] Check n8n API connectivity

4. **n8n workflows not executing**
   - [ ] Check n8n UI execution history
   - [ ] Verify n8n ↔ app callback connectivity
   - [ ] Verify N8N_CALLBACK_SECRET in both places
   - [ ] Restart n8n instance (if self-hosted)

5. **DDoS / Rate limit abuse**
   - [ ] Enable Cloudflare DDoS protection (optional)
   - [ ] Increase rate limits temporarily
   - [ ] Contact Vercel support for IP blocking

---

## ✅ Pre-Launch Sign-Off

| Item | Owner | Verified | Date |
| --- | --- | --- | --- |
| All secrets rotated & in vault | DevOps | ☐ | |
| Security headers pass | QA | ☐ | |
| Load test passes (50 concurrent) | DevOps | ☐ | |
| Backup tested & restorable | DevOps | ☐ | |
| Incident response plan reviewed | All | ☐ | |
| Privacy Policy live | Legal | ☐ | |
| GDPR compliance verified | Legal | ☐ | |
| Monitoring alerts set up | DevOps | ☐ | |
| Final security audit pass | Security | ☐ | |

**Launch approved by:** ________________________  **Date:** __________

---

## Post-Launch Monitoring (Next 7 Days)

- [ ] Monitor error rates hourly (target: < 1%)
- [ ] Monitor database performance (target: avg query < 100ms)
- [ ] Check automation_logs daily (target: all "success")
- [ ] Monitor app response times (target: p99 < 2s)
- [ ] Check Sentry for new errors
- [ ] Daily backup verification (can restore)
- [ ] Review user feedback for security concerns

---

**Questions? Contact security@yourcompany.com**

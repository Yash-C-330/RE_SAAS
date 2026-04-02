# Workflow: Lease Renewal Campaign

## Objective
Automatically reach out to tenants before lease expiry, offer renewal, generate a new DocuSign lease on confirmation, and trigger vacancy posting if tenant is not renewing.

## Trigger
Daily cron — checks all active leases each morning

## Steps

1. **Query DB** for active leases expiring in 90, 60, or 30 days
2. **90-day mark:**
   - OpenAI drafts personalized renewal offer letter (include market rent context)
   - Send email + SMS with PDF attachment
3. **60-day mark (no response):**
   - Follow-up: "Have you decided? We'd love to have you stay."
   - Optional renewal incentive (e.g., 1 month at current rate)
4. **30-day mark:**
   - Final notice: confirm renewal or provide vacate notice
5. **On tenant confirms renewal:**
   - Generate new lease via DocuSign template
   - Send for e-signature
   - Reminder if not signed within 48 hours
   - On signing: update DB, notify landlord, log to QuickBooks
6. **On tenant confirms vacate:**
   - Trigger move-out checklist email
   - Schedule move-out inspection
   - Auto-post vacancy to Zillow, Facebook Marketplace, Craigslist (Phase 2)

## Edge Cases & Notes
- Don't send if tenant already confirmed or vacate notice already sent (check DB flag)
- DocuSign template ID must be configured per landlord account
- Market rent context: pull from internal DB or use a static fallback value
- Log every communication attempt to `automation_logs`

## Tools Used
- `tools/draft_message.py` — OpenAI lease renewal letter
- `tools/send_email.py` — Resend email
- `tools/send_sms.py` — Twilio SMS
- `tools/docusign_send.py` — DocuSign envelope creation
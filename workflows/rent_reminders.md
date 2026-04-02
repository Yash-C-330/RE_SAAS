# Workflow: Rent Reminder Sequences

## Objective
Automatically remind tenants about upcoming and overdue rent payments via email and SMS. Escalate to landlord when overdue.

## Trigger
Daily cron at **8:00 AM** (n8n schedule node)

## Required Inputs
- Database connection (via `DATABASE_URL`)
- Twilio credentials for SMS
- Resend API key for email
- OpenAI API key for drafting overdue messages

## Steps

1. **Query DB** — Find all active leases where rent is due in 7, 3, or 1 days, or overdue by 1, 3, 7+ days
2. **For each lease:**
   - Due in 7 days → send friendly email + SMS
   - Due in 3 days → send reminder SMS ("3 days left to pay rent")
   - Due in 1 day → send urgent SMS ("Rent due tomorrow")
   - Overdue 1 day → use OpenAI to draft firm-but-professional reminder → send email + SMS
   - Overdue 3 days → notify landlord via email + log incident in DB
   - Overdue 7 days → OpenAI generates legal notice template → alert landlord + flag for action
3. **Log all events** to `automation_logs` table with outcome

## n8n Webhook Callback
On completion, POST to `/api/webhooks/n8n`:
```json
{
  "workflowName": "rent-reminders",
  "trigger": "cron",
  "outcome": "success | failed | skipped",
  "details": { "remindersSet": 5, "overdueAlerts": 1 },
  "landlordId": "uuid"
}
```

## Edge Cases & Notes
- Skip tenants whose `lease.status` is not `active`
- Don't double-send if workflow ran in the last 20 hours (use Redis dedup key)
- If Twilio SMS fails, fall back to email only
- Log each send attempt regardless of outcome
- Rate limit: Twilio free tier = 1 msg/sec — use n8n's Wait node between sends

## Expected Output
- SMS + emails sent to tenants
- `automation_logs` rows created
- Landlord notified if any tenant is 3+ days overdue

## Tools Used
- `tools/send_sms.py` — Twilio SMS sender
- `tools/send_email.py` — Resend email sender
- `tools/draft_message.py` — OpenAI message drafter
- `tools/query_overdue_leases.py` — DB query
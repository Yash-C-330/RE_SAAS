# n8n Setup Guide (RE_SAAS)

This guide gives exact steps to connect the app with n8n and launch workflows safely.

## 1) Prerequisites

- Next.js app running on http://localhost:3000
- Supabase database connected and schema pushed
- n8n instance running (local, cloud, or Railway)
- Accounts ready: OpenAI, Twilio, Resend

## 2) Environment Variables in App

Set these in app .env.local:

- N8N_WEBHOOK_URL
  - Example: https://your-n8n-domain
- N8N_API_KEY
  - Shared secret app sends to n8n webhook header X-N8N-API-KEY
- N8N_CALLBACK_SECRET
  - Shared secret n8n sends back to app callback header x-api-key

App endpoints already wired:

- Outbound trigger from app to n8n maintenance webhook:
  - POST /webhook/maintenance-request on n8n host
- Inbound callback from n8n to app:
  - POST /api/webhooks/n8n

## 3) Workflow 1: Maintenance Router (build this first)

Source spec:
- workflows/maintenance_routers.md

Prebuilt import files:
- workflows/n8n_maintenance_router.workflow.json (MVP rules, no Python scripts)
- workflows/n8n_maintenance_router_with_scripts.workflow.json (uses tools/*.py via Execute Command)

### Import steps (script-based workflow)

1. In n8n, go to Workflows -> Import from File.
2. Select workflows/n8n_maintenance_router_with_scripts.workflow.json.
3. Open workflow settings and verify node names loaded correctly.
4. Activate workflow only after env and Python runtime checks below pass.

### Runtime checks before activation

Run on the same machine/container where n8n runs:

- python --version
- pip install -r E:/Workflows/RE_SAAS/tools/requirement.txt

Confirm these env vars are available to n8n process:

- N8N_API_KEY
- OPENAI_API_KEY
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER
- RESEND_API_KEY
- EMAIL_FROM

### Node-by-node plan in n8n

1. Webhook Trigger
- Node type: Webhook
- Method: POST
- Path: maintenance-request
- Response mode: Respond immediately (or final node response if preferred)

Expected body from app:
- ticketId
- name
- email
- phone
- description
- callbackUrl
- callbackSecret

2. Validate API key from app
- Node type: IF
- Condition: header X-N8N-API-KEY equals your n8n secret value
- If false: return 401 via Respond to Webhook node

3. Classify issue with OpenAI
- Node type: OpenAI Chat
- Prompt:
  Classify this maintenance request and return strict JSON with keys:
  category (plumbing|electrical|hvac|appliance|cosmetic),
  urgency (emergency|high|normal|low),
  estimated_cost (integer),
  summary (one sentence).

  Request:
  {{$json.description}}

4. Parse AI JSON
- Node type: Code (or Set + JSON parse)
- Build normalized object:
  - ticketId
  - category
  - urgency
  - estimatedCost
  - summary
  - tenant contact fields
  - callbackUrl
  - callbackSecret

5. Branch by urgency
- Node type: Switch
- Cases: emergency, high, normal, low

6. Notifications
- emergency:
  - Twilio SMS to landlord now
  - optional Twilio call node
- high:
  - SMS/email landlord
- normal:
  - add to digest queue (or immediate email for MVP)
- low:
  - add to weekly queue (or tag only for MVP)

7. Callback to app (mandatory)
- Node type: HTTP Request
- Method: POST
- URL: {{$json.callbackUrl}}
- Headers:
  - x-api-key: {{$json.callbackSecret}}
  - content-type: application/json
- Body JSON:
  {
    "workflowName": "maintenance-router",
    "trigger": "webhook",
    "outcome": "success",
    "details": {
      "category": "{{$json.category}}",
      "urgency": "{{$json.urgency}}",
      "status": "assigned"
    },
    "ticketId": "{{$json.ticketId}}"
  }

This updates ticket status and logs automation run in app DB.

8. Error path callback
- Add Error Trigger or separate error branch
- Callback payload:
  {
    "workflowName": "maintenance-router",
    "trigger": "webhook",
    "outcome": "failed",
    "details": { "reason": "..." },
    "ticketId": "..."
  }

## 4) End-to-end test for Maintenance Router

1. Start app and n8n.
2. Submit tenant form:
- http://localhost:3000/maintenance/new
3. Confirm app inserts ticket:
- GET http://localhost:3000/api/maintenance
4. Confirm n8n webhook execution succeeded.
5. Confirm callback hit app endpoint:
- automation_logs has workflowName=maintenance-router
- maintenance_tickets status changed (for example assigned)

## 5) Build order for remaining workflows

After Maintenance works, proceed:

1. Rent reminders
- Source: workflows/rent_reminders.md
- Trigger: daily cron 8:00 AM
- Must callback with workflowName rent-reminders

2. Lease renewal
- Source: workflows/lease_renewal.md
- Start with 90/60/30 messaging only
- Add DocuSign branch after baseline success

3. Monthly reports
- Source: workflows/monthly_reports.md
- Start with DB-only metrics + email summary
- Add PDF and R2 upload second

## 6) Production hardening checklist

- Use dedicated secrets in n8n credentials store, not hardcoded values
- Keep callback secret different from webhook secret
- Add retries on outbound callback node
- Log every run with outcome success/failed/skipped
- Add timeout alerts for emergency branch

## 7) Troubleshooting

- 401 on app callback endpoint:
  - x-api-key does not match N8N_CALLBACK_SECRET in app env
- App creates ticket but n8n never runs:
  - N8N_WEBHOOK_URL wrong or webhook path mismatch
- n8n runs but ticket status not updated:
  - callback payload missing workflowName=maintenance-router or details.status
- SMS not sent:
  - Twilio credentials missing or sender number not enabled

## 8) Where to use the tools scripts

Your scripts in tools/ are execution helpers. Use them inside n8n in an "Execute Command" node.

Current scripts:
- tools/classify_maintenance.py
- tools/draft_message.py
- tools/send_email.py
- tools/send_sms.py

### A) How to run scripts from n8n

In each workflow branch where needed, add node type:
- Execute Command

Command pattern:
- python E:/Workflows/RE_SAAS/tools/<script>.py <args>

Important:
- n8n runtime must have Python + pip packages installed.
- Environment variables (OPENAI_API_KEY, TWILIO_*, RESEND_API_KEY, EMAIL_FROM) must be available to n8n process.

### B) Script placement by workflow

1. Maintenance Router workflow
- After webhook input, replace/augment classification step with:
  - classify_maintenance.py
- After route decision, use:
  - send_sms.py for tenant/landlord notifications
  - send_email.py for fallback or digest

Example classification command in Execute Command:
- python E:/Workflows/RE_SAAS/tools/classify_maintenance.py --description "{{$json.body.description || $json.description}}"

2. Rent Reminder workflow
- Before sending overdue messages, generate text with:
  - draft_message.py --type overdue_reminder
- Send via:
  - send_sms.py and/or send_email.py

3. Lease Renewal workflow
- Draft personalized renewal and notices with:
  - draft_message.py --type renewal_offer
  - draft_message.py --type legal_notice
- Send with send_email.py and send_sms.py

4. Monthly Reports workflow
- Use draft_message.py for short executive summary body text
- Use send_email.py to send summary + report link

### C) Recommended rollout

For speed, start with native n8n nodes first (OpenAI/Twilio/HTTP). Once stable, swap steps to script-based Execute Command nodes where you want reusable logic.

### D) Python dependency install (machine running n8n)

Install once:
- pip install -r E:/Workflows/RE_SAAS/tools/requirement.txt

If n8n runs in Docker/remote, install these inside that environment, not just your local shell.

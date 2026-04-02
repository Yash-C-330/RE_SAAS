# Workflow: Maintenance Request Router

## Objective
Receive a tenant maintenance request, classify its category and urgency using AI, create a ticket in the DB, notify the appropriate parties, and assign a vendor.

## Trigger
Webhook — tenant submits the form at `/maintenance/new` or texts the Twilio number

## Required Inputs
- Tenant name, email, phone
- Description of the issue
- `unitId` (if known)
- OpenAI API key
- Twilio credentials
- Database connection

## Steps

1. **Receive webhook payload** from Next.js `/api/maintenance` endpoint
2. **Create ticket** in `maintenance_tickets` table (status: `open`)
3. **AI classification** via OpenAI:
   ```
   Classify this maintenance request:
   - category: plumbing | electrical | hvac | appliance | cosmetic
   - urgency: emergency | high | normal | low
   - estimated_cost: integer (USD)
   - summary: one sentence
   ```
4. **Update ticket** with AI-classified fields
5. **Send confirmation SMS** to tenant: "We received your request (#TICKET_ID). We'll follow up shortly."
6. **Route by urgency:**
   - `emergency` → immediately call + SMS landlord, page on-call vendor
   - `high` → notify landlord within 1 hour, auto-assign preferred category vendor
   - `normal` → add to landlord's daily digest
   - `low` → queue for weekly review
7. **When job is resolved** (vendor webhook or manual update):
   - Send satisfaction survey SMS to tenant
   - Log cost to QuickBooks
   - Update `maintenance_tickets.status` = `resolved`

## n8n Webhook Callback
```json
{
  "workflowName": "maintenance-router",
  "trigger": "webhook",
  "outcome": "success",
  "details": { "category": "plumbing", "urgency": "high", "status": "assigned" },
  "ticketId": "uuid"
}
```

## Edge Cases & Notes
- If AI classification fails, default urgency to `normal` and notify landlord manually
- Emergency tickets must be acknowledged within 5 minutes — set a timeout node
- Vendor list stored in a Postgres `vendors` table (to be added in Phase 2)
- If no vendor is assigned, escalate to landlord with instructions

## Expected Output
- Ticket created in DB with AI-classified fields
- Tenant receives confirmation SMS
- Landlord notified per urgency level

## Tools Used  
- `tools/classify_maintenance.py` — OpenAI classification
- `tools/send_sms.py` — Twilio SMS sender
- `tools/send_email.py` — Resend email sender
- `tools/create_ticket.py` — DB ticket creation
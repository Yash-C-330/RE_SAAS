# Workflow: Monthly Owner Report Generator

## Objective
Generate a professional PDF owner report with cash flow, expenses, NOI, and occupancy data — automatically emailed to the landlord on the 1st of every month.

## Trigger
Monthly cron — **1st of every month at 6:00 AM**

## Steps

1. **Pull Stripe transactions** for previous month (rent received)
2. **Pull maintenance costs** from `maintenance_tickets` (resolved, previous month)
3. **Pull occupancy data** — vacant days, turnover rate from `units` table
4. **OpenAI generates:**
   - 2-3 sentence executive summary
   - Cash flow narrative
   - Action items for next month (e.g., "2 leases expire in 60 days")
5. **Generate PDF** containing:
   - Income statement (rent collected vs. expected)
   - Expense breakdown (maintenance, fees)
   - Net Operating Income (NOI)
   - Occupancy rate
   - Maintenance log summary (top 5 tickets)
6. **Upload PDF** to Cloudflare R2
7. **Email landlord** with AI-written summary + signed R2 download link
8. **Push KPIs** to `dashboard_snapshots` table for the dashboard UI
9. **Check anomalies:**
   - Rent revenue down >10% → alert: "Possible vacancy risk"
   - Maintenance costs up >20% → alert: "High maintenance — consider inspection"

## Edge Cases & Notes
- Use `date-fns` to reliably compute "previous month" date range
- If QuickBooks is not connected, use internal DB data only
- PDF generation: use a headless HTML → PDF tool (Puppeteer or `@sparticuz/chromium`)
- Store reports for 7 years (regulatory retention)
- If email fails, retry 3 times then notify via SMS

## Tools Used
- `tools/generate_report_pdf.py` — PDF generation
- `tools/send_email.py` — Resend email
- `tools/upload_to_r2.py` — Cloudflare R2 upload
- `tools/draft_message.py` — OpenAI narrative generation
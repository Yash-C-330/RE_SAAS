#!/usr/bin/env python3
"""
Tool: draft_message.py  
Uses OpenAI to draft professional property management messages.

Usage:
    python tools/draft_message.py \
        --type overdue_reminder \
        --tenant_name "Sarah" \
        --days_overdue 3 \
        --amount 1500 \
        --channel email

Message types:
  - overdue_reminder   : firm rent reminder
  - renewal_offer      : personalized lease renewal
  - legal_notice       : 7-day overdue formal notice
  - move_out_checklist : vacate instructions
  - satisfaction_survey: post-maintenance follow-up

Output: plain text message ready to send
"""

import os
import argparse
import sys
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

PROMPTS = {
    "overdue_reminder": """Draft a firm but professional rent reminder message.
Tenant name: {tenant_name}. Days overdue: {days_overdue}. Amount: ${amount}.
Channel: {channel}. Keep it under 100 words. Do not be threatening. 
End with a clear call to action (pay online or contact us).""",

    "renewal_offer": """Draft a warm lease renewal offer for a tenant.
Tenant name: {tenant_name}. Current monthly rent: ${amount}.
Lease expires in {days_until_expiry} days.
Keep it friendly and under 150 words. Highlight the convenience of staying.""",

    "legal_notice": """Draft a formal 7-day pay-or-quit notice.
Tenant name: {tenant_name}. Amount owed: ${amount}. Days overdue: {days_overdue}.
Use professional, legally neutral language. Keep under 100 words.""",

    "move_out_checklist": """Draft a friendly move-out instructions message for a tenant.
Tenant name: {tenant_name}. Move-out date: {move_out_date}.
Include: key return, cleaning expectations, forwarding address for deposit.""",

    "satisfaction_survey": """Draft a short post-maintenance satisfaction follow-up.
Tenant name: {tenant_name}. Issue resolved: {issue_summary}.
Ask if they're satisfied and invite feedback. Under 50 words.""",
}


def draft(message_type: str, channel: str, **kwargs) -> str:
    template = PROMPTS.get(message_type)
    if not template:
        raise ValueError(f"Unknown message type: {message_type}")

    prompt = template.format(channel=channel, **{k: v or "" for k, v in kwargs.items()})

    if channel == "sms":
        prompt += "\n\nIMPORTANT: This is an SMS. Keep under 160 characters."

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a professional property manager writing tenant communications."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=300,
    )
    return response.choices[0].message.content.strip()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Draft a property management message with AI")
    parser.add_argument("--type", required=True, choices=list(PROMPTS.keys()))
    parser.add_argument("--channel", default="email", choices=["email", "sms"])
    parser.add_argument("--tenant_name", default="Tenant")
    parser.add_argument("--days_overdue", type=int, default=0)
    parser.add_argument("--days_until_expiry", type=int, default=0)
    parser.add_argument("--amount", type=float, default=0)
    parser.add_argument("--move_out_date", default="")
    parser.add_argument("--issue_summary", default="")
    args = parser.parse_args()

    try:
        message = draft(
            args.type,
            args.channel,
            tenant_name=args.tenant_name,
            days_overdue=args.days_overdue,
            days_until_expiry=args.days_until_expiry,
            amount=args.amount,
            move_out_date=args.move_out_date,
            issue_summary=args.issue_summary,
        )
        print(message)
    except Exception as e:
        print(f"✗ Drafting failed: {e}", file=sys.stderr)
        sys.exit(1)
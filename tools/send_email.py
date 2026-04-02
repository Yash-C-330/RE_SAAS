#!/usr/bin/env python3
"""
Tool: send_email.py
Sends a transactional email via Resend.

Usage:
    python tools/send_email.py \
        --to "tenant@example.com" \
        --subject "Rent Due Tomorrow" \
        --html "<p>Your rent of $1,500 is due tomorrow.</p>"
"""

import os
import argparse
import sys
import json
import urllib.request

RESEND_API_URL = "https://api.resend.com/emails"


def send_email(to: str, subject: str, html: str, text: str = "") -> dict:
    api_key = os.environ["RESEND_API_KEY"]
    from_addr = os.environ.get("EMAIL_FROM", "noreply@example.com")

    payload = {
        "from": from_addr,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        RESEND_API_URL,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )

    with urllib.request.urlopen(req) as resp:
        body = json.loads(resp.read())
        return body


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Send an email via Resend")
    parser.add_argument("--to", required=True, help="Recipient email address")
    parser.add_argument("--subject", required=True, help="Email subject")
    parser.add_argument("--html", required=True, help="HTML email body")
    parser.add_argument("--text", default="", help="Plain text fallback")
    args = parser.parse_args()

    try:
        result = send_email(args.to, args.subject, args.html, args.text)
        print(f"✓ Email sent | ID: {result.get('id')}")
    except Exception as e:
        print(f"✗ Email failed: {e}", file=sys.stderr)
        sys.exit(1)
#!/usr/bin/env python3
"""
Tool: send_sms.py
Sends an SMS via Twilio.

Usage:
    python tools/send_sms.py --to "+15551234567" --body "Your rent is due tomorrow."
"""

import os
import argparse
import sys
from twilio.rest import Client

def send_sms(to: str, body: str) -> dict:
    account_sid = os.environ["TWILIO_ACCOUNT_SID"]
    auth_token = os.environ["TWILIO_AUTH_TOKEN"]
    from_number = os.environ["TWILIO_PHONE_NUMBER"]

    client = Client(account_sid, auth_token)

    message = client.messages.create(
        body=body,
        from_=from_number,
        to=to,
    )

    return {
        "sid": message.sid,
        "status": message.status,
        "to": to,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Send an SMS via Twilio")
    parser.add_argument("--to", required=True, help="Recipient phone number (E.164 format)")
    parser.add_argument("--body", required=True, help="Message body")
    args = parser.parse_args()

    try:
        result = send_sms(args.to, args.body)
        print(f"✓ SMS sent | SID: {result['sid']} | Status: {result['status']}")
    except Exception as e:
        print(f"✗ SMS failed: {e}", file=sys.stderr)
        sys.exit(1)
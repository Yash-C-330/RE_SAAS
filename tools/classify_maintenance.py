#!/usr/bin/env python3
"""
Tool: classify_maintenance.py
Uses OpenAI to classify a maintenance request into category, urgency,
estimated cost, and a one-sentence summary.

Usage:
    python tools/classify_maintenance.py --description "Water is leaking from the kitchen ceiling"

Output (JSON):
    {
      "category": "plumbing",
      "urgency": "high",
      "estimated_cost": 350,
      "summary": "Kitchen ceiling leak likely caused by burst pipe above."
    }
"""

import os
import argparse
import sys
import json
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

SYSTEM_PROMPT = """You are a property maintenance classifier. 
Given a tenant's description of an issue, return a JSON object with:
- category: one of [plumbing, electrical, hvac, appliance, cosmetic, structural, pest, other]
- urgency: one of [emergency, high, normal, low]
  * emergency = life/safety risk, major water damage, no heat in winter
  * high = significant damage risk if not addressed within 24h
  * normal = should be resolved within a week
  * low = cosmetic or minor, can be scheduled
- estimated_cost: integer USD (rough estimate for a typical repair)
- summary: one sentence describing the likely issue

Return ONLY valid JSON, no markdown."""


def classify(description: str) -> dict:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": description},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )
    return json.loads(response.choices[0].message.content)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Classify a maintenance request with AI")
    parser.add_argument("--description", required=True, help="Tenant's issue description")
    args = parser.parse_args()

    try:
        result = classify(args.description)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"✗ Classification failed: {e}", file=sys.stderr)
        sys.exit(1)
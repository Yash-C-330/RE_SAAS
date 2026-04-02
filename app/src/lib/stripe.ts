import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(apiKey, {
      apiVersion: "2025-02-24.acacia",
    });
  }

  return stripeClient;
}

export const PLANS = {
  starter: {
    name: "Starter",
    price: 49,
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    unitLimit: 5,
  },
  growth: {
    name: "Growth",
    price: 149,
    priceId: process.env.STRIPE_GROWTH_PRICE_ID!,
    unitLimit: 25,
  },
  pro: {
    name: "Pro",
    price: 349,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    unitLimit: 100,
  },
  enterprise: {
    name: "Enterprise",
    price: null,
    priceId: null,
    unitLimit: Infinity,
  },
} as const;


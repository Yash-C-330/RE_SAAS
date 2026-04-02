export const PRICING_MODEL = {
  name: "Simple portfolio pricing",
  baseFee: 19,
  includedUnits: 5,
  extraUnitFee: 3,
  currency: "USD",
  addOns: [
    "SMS bundles for tenants who prefer text updates",
    "AI usage credits for high-volume automation",
    "Priority onboarding for larger portfolios",
  ],
  includedFeatures: [
    "Rent reminders and payment tracking",
    "Maintenance intake and triage",
    "Landlord inbox and audit trail",
    "Monthly reporting and automation logs",
  ],
} as const;

export function getMonthlyPriceForUnits(unitCount: number) {
  const normalizedUnits = Math.max(0, Math.floor(unitCount));
  const extraUnits = Math.max(0, normalizedUnits - PRICING_MODEL.includedUnits);

  return PRICING_MODEL.baseFee + extraUnits * PRICING_MODEL.extraUnitFee;
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: PRICING_MODEL.currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const PRICING_EXAMPLES = [
  { units: 3, label: "Small landlord", note: "3 doors, everything included", price: getMonthlyPriceForUnits(3) },
  { units: 10, label: "Growing portfolio", note: "10 doors, predictable scaling", price: getMonthlyPriceForUnits(10) },
  { units: 25, label: "Active operator", note: "25 doors, still one simple formula", price: getMonthlyPriceForUnits(25) },
] as const;
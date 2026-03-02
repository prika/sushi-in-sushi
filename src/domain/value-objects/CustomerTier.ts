/**
 * Customer Tier Value Object
 * Defines progressive tiers based on profile completeness + behavioral engagement.
 *
 * Tier 1 – Novo:         No contact info (only statistical data)
 * Tier 2 – Identificado: Has email or phone
 * Tier 3 – Cliente:      Has email or phone AND at least 1 completed visit
 * Tier 4 – Regular:      Full profile (email+phone+birthDate) + 3+ visits
 * Tier 5 – VIP:          Full profile + 10+ visits + 500€+ total spent
 */

export type CustomerTier = 1 | 2 | 3 | 4 | 5;

export const CUSTOMER_TIER_LABELS: Record<CustomerTier, string> = {
  1: 'Novo',
  2: 'Identificado',
  3: 'Cliente',
  4: 'Regular',
  5: 'VIP',
};

export const CUSTOMER_TIER_COLORS: Record<CustomerTier, { bg: string; text: string }> = {
  1: { bg: 'bg-gray-100', text: 'text-gray-600' },
  2: { bg: 'bg-blue-100', text: 'text-blue-700' },
  3: { bg: 'bg-amber-100', text: 'text-amber-800' },
  4: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  5: { bg: 'bg-purple-100', text: 'text-purple-800' },
};

export interface CustomerTierInput {
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  visitCount?: number;
  totalSpent?: number;
  /** @deprecated Kept for backward compatibility with session customer use cases */
  displayName?: string;
  /** @deprecated Kept for backward compatibility with session customer use cases */
  fullName?: string | null;
}

/**
 * Computes the customer tier from profile fields and behavioral metrics.
 */
export function computeCustomerTier(fields: CustomerTierInput): CustomerTier {
  const hasEmail = !!fields.email?.trim();
  const hasPhone = !!fields.phone?.trim();
  const hasBirthDate = !!fields.birthDate?.trim();
  const visitCount = fields.visitCount ?? 0;
  const totalSpent = fields.totalSpent ?? 0;
  const fullProfile = hasEmail && hasPhone && hasBirthDate;

  // VIP: full profile + significant engagement
  if (fullProfile && visitCount >= 10 && totalSpent >= 500) return 5;

  // Regular: full profile + moderate engagement
  if (fullProfile && visitCount >= 3) return 4;

  // Cliente: has contact AND at least 1 completed visit
  if ((hasEmail || hasPhone) && visitCount >= 1) return 3;

  // Identificado: basic contact
  if (hasEmail || hasPhone) return 2;

  // Novo: minimal data
  return 1;
}

/**
 * Returns which profile fields are filled vs missing for a customer.
 */
export function getProfileCompleteness(fields: {
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  preferredLocation?: string | null;
  marketingConsent?: boolean;
}): { filled: string[]; missing: string[] } {
  const checks: [string, boolean][] = [
    ['email', !!fields.email?.trim()],
    ['phone', !!fields.phone?.trim()],
    ['birthDate', !!fields.birthDate?.trim()],
    ['preferredLocation', !!fields.preferredLocation?.trim()],
    ['marketingConsent', fields.marketingConsent === true],
  ];

  return {
    filled: checks.filter(([, ok]) => ok).map(([k]) => k),
    missing: checks.filter(([, ok]) => !ok).map(([k]) => k),
  };
}

/**
 * Customer Tier Value Object
 * Defines the progressive registration tiers and computation logic
 */

export type CustomerTier = 1 | 2 | 3 | 4;

export const CUSTOMER_TIER_LABELS: Record<CustomerTier, string> = {
  1: 'Session Only',
  2: 'Basic Contact',
  3: 'Full Contact',
  4: 'Delivery Profile',
};

/**
 * Computes the customer tier from filled profile fields.
 *
 * Tier 1: only display_name
 * Tier 2: display_name + (phone OR email)
 * Tier 3: display_name + email + phone + full_name + birth_date
 * Tier 4: (future) all above + delivery address
 */
export function computeCustomerTier(fields: {
  displayName: string;
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  birthDate?: string | null;
}): CustomerTier {
  const hasEmail = !!fields.email?.trim();
  const hasPhone = !!fields.phone?.trim();
  const hasFullName = !!fields.fullName?.trim();
  const hasBirthDate = !!fields.birthDate?.trim();

  if (hasEmail && hasPhone && hasFullName && hasBirthDate) {
    return 3;
  }
  if (hasEmail || hasPhone) {
    return 2;
  }
  return 1;
}

import { CustomerTier, computeCustomerTier } from '../value-objects/CustomerTier';

export class CustomerTierService {
  /**
   * Compute the tier for a session customer based on their filled fields.
   */
  static computeTier(fields: {
    displayName: string;
    email?: string | null;
    phone?: string | null;
    fullName?: string | null;
    birthDate?: string | null;
  }): CustomerTier {
    return computeCustomerTier(fields);
  }

  /**
   * Determine what fields are still needed to reach the next tier.
   * Returns an array of field identifiers.
   */
  static getMissingFieldsForNextTier(
    currentTier: CustomerTier,
    fields: {
      email?: string | null;
      phone?: string | null;
      fullName?: string | null;
      birthDate?: string | null;
    },
  ): string[] {
    if (currentTier >= 3) return [];

    const missing: string[] = [];

    if (currentTier === 1) {
      if (!fields.email?.trim() && !fields.phone?.trim()) {
        missing.push('email_or_phone');
      }
    }

    if (currentTier <= 2) {
      if (!fields.email?.trim()) missing.push('email');
      if (!fields.phone?.trim()) missing.push('phone');
      if (!fields.fullName?.trim()) missing.push('full_name');
      if (!fields.birthDate?.trim()) missing.push('birth_date');
    }

    return missing;
  }

  /**
   * Check if an upgrade prompt should be shown based on restaurant config and session state.
   */
  static shouldShowUpgradePrompt(params: {
    currentTier: CustomerTier;
    promptType: 'after_order' | 'at_bill';
    restaurantConfig: {
      showUpgradeAfterOrder: boolean;
      showUpgradeAtBill: boolean;
    };
    alreadyDismissedInSession: boolean;
  }): boolean {
    if (params.currentTier >= 3) return false;
    if (params.alreadyDismissedInSession) return false;

    if (params.promptType === 'after_order') {
      return params.restaurantConfig.showUpgradeAfterOrder;
    }
    if (params.promptType === 'at_bill') {
      return params.restaurantConfig.showUpgradeAtBill;
    }
    return false;
  }
}

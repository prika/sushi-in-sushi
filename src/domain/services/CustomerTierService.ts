import {
  CustomerTier,
  CustomerTierInput,
  computeCustomerTier,
  getProfileCompleteness,
} from '../value-objects/CustomerTier';

export interface BehavioralInsight {
  key: string;
  label: string;
  icon: string;
  severity: 'info' | 'positive' | 'warning' | 'negative';
}

export interface CustomerStats {
  reservationCount: number;
  completedReservations: number;
  cancelledReservations: number;
  noShowCount: number;
  avgPartySize: number;
  visitCount: number;
  totalSpent: number;
  totalFromOrders: number;
}

export class CustomerTierService {
  /**
   * Compute the tier for a customer based on profile + behavioral data.
   */
  static computeTier(fields: CustomerTierInput): CustomerTier {
    return computeCustomerTier(fields);
  }

  /**
   * Compute tier from a Customer entity (for list pages).
   */
  static computeTierFromCustomer(customer: {
    email?: string | null;
    phone?: string | null;
    birthDate?: string | null;
    visitCount: number;
    totalSpent: number;
  }): CustomerTier {
    return computeCustomerTier({
      email: customer.email,
      phone: customer.phone,
      birthDate: customer.birthDate,
      visitCount: customer.visitCount,
      totalSpent: customer.totalSpent,
    });
  }

  /**
   * Get profile completeness for a customer.
   */
  static getProfileCompleteness(fields: {
    email?: string | null;
    phone?: string | null;
    birthDate?: string | null;
    preferredLocation?: string | null;
    marketingConsent?: boolean;
  }) {
    return getProfileCompleteness(fields);
  }

  /**
   * Determine what is needed to reach the next tier.
   */
  static getMissingFieldsForNextTier(
    currentTier: CustomerTier,
    fields: {
      email?: string | null;
      phone?: string | null;
      birthDate?: string | null;
      visitCount?: number;
      totalSpent?: number;
    },
  ): string[] {
    if (currentTier >= 5) return [];

    const visitCount = fields.visitCount ?? 0;
    const totalSpent = fields.totalSpent ?? 0;
    const missing: string[] = [];

    if (currentTier === 1) {
      if (!fields.email?.trim() && !fields.phone?.trim()) {
        missing.push('email_or_phone');
      }
    }

    if (currentTier <= 2) {
      if (!fields.email?.trim()) missing.push('email');
      if (!fields.phone?.trim()) missing.push('phone');
    }

    if (currentTier <= 3) {
      if (!fields.birthDate?.trim()) missing.push('birth_date');
      if (visitCount < 3) missing.push('more_visits');
    }

    if (currentTier === 4) {
      if (visitCount < 10) missing.push('more_visits');
      if (totalSpent < 500) missing.push('more_spending');
    }

    return missing;
  }

  /**
   * Compute behavioral insights from full customer history stats.
   * Used on the detail page where we have reservation/visit/order data.
   */
  static computeInsights(stats: CustomerStats): BehavioralInsight[] {
    const insights: BehavioralInsight[] = [];

    // Reservation frequency
    if (stats.reservationCount >= 10) {
      insights.push({
        key: 'frequent_booker',
        label: 'Reserva frequente',
        icon: '📅',
        severity: 'positive',
      });
    } else if (stats.reservationCount >= 3) {
      insights.push({
        key: 'regular_booker',
        label: 'Reserva regular',
        icon: '📅',
        severity: 'info',
      });
    }

    // No-show risk
    if (stats.noShowCount > 0) {
      const noShowRate = stats.reservationCount > 0
        ? stats.noShowCount / stats.reservationCount
        : 0;
      if (noShowRate >= 0.3) {
        insights.push({
          key: 'high_no_show',
          label: `Não comparece (${Math.round(noShowRate * 100)}%)`,
          icon: '⚠️',
          severity: 'negative',
        });
      } else if (stats.noShowCount >= 1) {
        insights.push({
          key: 'some_no_show',
          label: `${stats.noShowCount} não-comparência${stats.noShowCount > 1 ? 's' : ''}`,
          icon: '⚠️',
          severity: 'warning',
        });
      }
    }

    // Cancellation pattern
    if (stats.cancelledReservations > 0) {
      const cancelRate = stats.reservationCount > 0
        ? stats.cancelledReservations / stats.reservationCount
        : 0;
      if (cancelRate >= 0.4) {
        insights.push({
          key: 'high_cancel',
          label: `Cancela frequente (${Math.round(cancelRate * 100)}%)`,
          icon: '❌',
          severity: 'negative',
        });
      } else {
        insights.push({
          key: 'some_cancel',
          label: `${stats.cancelledReservations} cancelamento${stats.cancelledReservations > 1 ? 's' : ''}`,
          icon: '❌',
          severity: 'info',
        });
      }
    }

    // Large groups
    if (stats.avgPartySize >= 6) {
      insights.push({
        key: 'large_groups',
        label: `Grupos grandes (média ${stats.avgPartySize.toFixed(0)} pax)`,
        icon: '👥',
        severity: 'info',
      });
    }

    // High spender
    if (stats.totalSpent >= 1000) {
      insights.push({
        key: 'high_spender',
        label: 'Alto valor',
        icon: '💰',
        severity: 'positive',
      });
    } else if (stats.totalSpent >= 300) {
      insights.push({
        key: 'moderate_spender',
        label: 'Valor moderado',
        icon: '💰',
        severity: 'info',
      });
    }

    // Frequent visitor
    if (stats.visitCount >= 10) {
      insights.push({
        key: 'frequent_visitor',
        label: 'Visitante frequente',
        icon: '🏠',
        severity: 'positive',
      });
    }

    // Reliable customer (reservations with good completion rate)
    if (stats.reservationCount >= 5 && stats.noShowCount === 0 && stats.cancelledReservations <= 1) {
      insights.push({
        key: 'reliable',
        label: 'Cliente fiável',
        icon: '✅',
        severity: 'positive',
      });
    }

    return insights;
  }

  /**
   * Check if an upgrade prompt should be shown.
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
    if (params.currentTier >= 5) return false;
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

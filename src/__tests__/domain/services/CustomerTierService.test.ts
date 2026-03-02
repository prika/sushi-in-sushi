import { describe, it, expect } from 'vitest';
import { CustomerTierService } from '@/domain/services/CustomerTierService';
import type { CustomerTier } from '@/domain/value-objects/CustomerTier';

describe('CustomerTierService', () => {
  describe('computeTier', () => {
    it('deve retornar tier 1 quando só displayName está preenchido', () => {
      const tier = CustomerTierService.computeTier({
        displayName: 'João',
      });
      expect(tier).toBe(1);
    });

    it('deve retornar tier 2 quando tem email', () => {
      const tier = CustomerTierService.computeTier({
        displayName: 'Maria',
        email: 'maria@example.com',
      });
      expect(tier).toBe(2);
    });

    it('deve retornar tier 2 quando tem phone', () => {
      const tier = CustomerTierService.computeTier({
        displayName: 'Pedro',
        phone: '+351 912 345 678',
      });
      expect(tier).toBe(2);
    });

    it('deve retornar tier 2 quando tem email e phone mas sem visitas', () => {
      const tier = CustomerTierService.computeTier({
        email: 'ana@example.com',
        phone: '+351 912 345 678',
      });
      expect(tier).toBe(2);
    });

    it('deve retornar tier 3 quando tem contacto e 1+ visita', () => {
      const tier = CustomerTierService.computeTier({
        email: 'x@y.com',
        visitCount: 1,
      });
      expect(tier).toBe(3);
    });

    it('deve retornar tier 3 quando tem email, phone e 1+ visita', () => {
      const tier = CustomerTierService.computeTier({
        email: 'ana@example.com',
        phone: '+351 912 345 678',
        visitCount: 1,
      });
      expect(tier).toBe(3);
    });

    it('deve retornar tier 4 quando tem perfil completo e 3+ visitas', () => {
      const tier = CustomerTierService.computeTier({
        email: 'ana@example.com',
        phone: '+351 912 345 678',
        birthDate: '1990-01-15',
        visitCount: 5,
        totalSpent: 100,
      });
      expect(tier).toBe(4);
    });

    it('deve retornar tier 5 quando tem perfil completo, 10+ visitas e 500€+ gasto', () => {
      const tier = CustomerTierService.computeTier({
        email: 'vip@example.com',
        phone: '+351 912 345 678',
        birthDate: '1985-06-20',
        visitCount: 15,
        totalSpent: 800,
      });
      expect(tier).toBe(5);
    });

    it('não deve ser VIP sem birthDate mesmo com muitas visitas', () => {
      const tier = CustomerTierService.computeTier({
        email: 'x@y.com',
        phone: '123',
        visitCount: 20,
        totalSpent: 1000,
      });
      // email + phone + visits → tier 3, but not full profile, so can't reach 4/5
      expect(tier).toBe(3);
    });

    it('deve retornar tier 1 sem contacto mesmo com visitas', () => {
      const tier = CustomerTierService.computeTier({
        displayName: 'Anon',
        visitCount: 5,
      });
      // sem email nem phone → não pode subir de tier 1
      expect(tier).toBe(1);
    });

    it('deve ignorar strings vazias ou só espaços', () => {
      expect(
        CustomerTierService.computeTier({
          displayName: 'X',
          email: '  ',
          phone: '',
        })
      ).toBe(1);
    });
  });

  describe('computeTierFromCustomer', () => {
    it('deve computar tier a partir de um Customer', () => {
      const tier = CustomerTierService.computeTierFromCustomer({
        email: 'test@email.com',
        phone: '912345678',
        birthDate: '1990-01-01',
        visitCount: 5,
        totalSpent: 200,
      });
      expect(tier).toBe(4);
    });
  });

  describe('getMissingFieldsForNextTier', () => {
    it('deve retornar array vazio quando tier é 5', () => {
      const missing = CustomerTierService.getMissingFieldsForNextTier(5 as CustomerTier, {
        email: 'a@b.com',
        phone: '123',
        birthDate: '1990-01-01',
        visitCount: 15,
        totalSpent: 800,
      });
      expect(missing).toEqual([]);
    });

    it('deve retornar email_or_phone quando tier 1 e sem email nem phone', () => {
      const missing = CustomerTierService.getMissingFieldsForNextTier(1 as CustomerTier, {
        visitCount: 0,
        totalSpent: 0,
      });
      expect(missing).toContain('email_or_phone');
    });

    it('não deve incluir email_or_phone quando tier 1 tem email', () => {
      const missing = CustomerTierService.getMissingFieldsForNextTier(1 as CustomerTier, {
        email: 'a@b.com',
        visitCount: 0,
        totalSpent: 0,
      });
      expect(missing).not.toContain('email_or_phone');
    });

    it('deve indicar more_visits quando tier 2 e sem visitas', () => {
      const missing = CustomerTierService.getMissingFieldsForNextTier(2 as CustomerTier, {
        email: 'a@b.com',
        visitCount: 0,
        totalSpent: 0,
      });
      expect(missing).toContain('more_visits');
    });

    it('deve indicar more_visits para tier 3', () => {
      const missing = CustomerTierService.getMissingFieldsForNextTier(3 as CustomerTier, {
        email: 'a@b.com',
        phone: '123',
        visitCount: 1,
        totalSpent: 0,
      });
      expect(missing).toContain('birth_date');
      expect(missing).toContain('more_visits');
    });

    it('deve indicar more_visits e more_spending para tier 4', () => {
      const missing = CustomerTierService.getMissingFieldsForNextTier(4 as CustomerTier, {
        email: 'a@b.com',
        phone: '123',
        birthDate: '1990-01-01',
        visitCount: 5,
        totalSpent: 200,
      });
      expect(missing).toContain('more_visits');
      expect(missing).toContain('more_spending');
    });
  });

  describe('computeInsights', () => {
    it('deve retornar insights de reserva frequente', () => {
      const insights = CustomerTierService.computeInsights({
        reservationCount: 12,
        completedReservations: 10,
        cancelledReservations: 1,
        noShowCount: 1,
        avgPartySize: 3,
        visitCount: 8,
        totalSpent: 400,
        totalFromOrders: 350,
      });
      expect(insights.find(i => i.key === 'frequent_booker')).toBeDefined();
    });

    it('deve retornar insight negativo para alta taxa de no-show', () => {
      const insights = CustomerTierService.computeInsights({
        reservationCount: 10,
        completedReservations: 5,
        cancelledReservations: 0,
        noShowCount: 4,
        avgPartySize: 2,
        visitCount: 5,
        totalSpent: 100,
        totalFromOrders: 80,
      });
      const noShowInsight = insights.find(i => i.key === 'high_no_show');
      expect(noShowInsight).toBeDefined();
      expect(noShowInsight?.severity).toBe('negative');
    });

    it('deve retornar insight de grupos grandes', () => {
      const insights = CustomerTierService.computeInsights({
        reservationCount: 5,
        completedReservations: 4,
        cancelledReservations: 0,
        noShowCount: 0,
        avgPartySize: 8,
        visitCount: 4,
        totalSpent: 500,
        totalFromOrders: 450,
      });
      expect(insights.find(i => i.key === 'large_groups')).toBeDefined();
    });

    it('deve retornar insight de alto valor', () => {
      const insights = CustomerTierService.computeInsights({
        reservationCount: 15,
        completedReservations: 14,
        cancelledReservations: 0,
        noShowCount: 0,
        avgPartySize: 2,
        visitCount: 14,
        totalSpent: 1200,
        totalFromOrders: 1100,
      });
      expect(insights.find(i => i.key === 'high_spender')).toBeDefined();
    });

    it('deve retornar insight de cliente fiável', () => {
      const insights = CustomerTierService.computeInsights({
        reservationCount: 8,
        completedReservations: 7,
        cancelledReservations: 1,
        noShowCount: 0,
        avgPartySize: 3,
        visitCount: 7,
        totalSpent: 300,
        totalFromOrders: 280,
      });
      expect(insights.find(i => i.key === 'reliable')).toBeDefined();
    });

    it('deve retornar array vazio sem dados suficientes', () => {
      const insights = CustomerTierService.computeInsights({
        reservationCount: 0,
        completedReservations: 0,
        cancelledReservations: 0,
        noShowCount: 0,
        avgPartySize: 0,
        visitCount: 0,
        totalSpent: 0,
        totalFromOrders: 0,
      });
      expect(insights).toEqual([]);
    });
  });

  describe('shouldShowUpgradePrompt', () => {
    const config = {
      showUpgradeAfterOrder: true,
      showUpgradeAtBill: true,
    };

    it('deve retornar false quando tier >= 5', () => {
      expect(
        CustomerTierService.shouldShowUpgradePrompt({
          currentTier: 5 as CustomerTier,
          promptType: 'after_order',
          restaurantConfig: config,
          alreadyDismissedInSession: false,
        })
      ).toBe(false);
    });

    it('deve retornar false quando alreadyDismissedInSession é true', () => {
      expect(
        CustomerTierService.shouldShowUpgradePrompt({
          currentTier: 1 as CustomerTier,
          promptType: 'after_order',
          restaurantConfig: config,
          alreadyDismissedInSession: true,
        })
      ).toBe(false);
    });

    it('deve retornar true para after_order quando showUpgradeAfterOrder é true', () => {
      expect(
        CustomerTierService.shouldShowUpgradePrompt({
          currentTier: 1 as CustomerTier,
          promptType: 'after_order',
          restaurantConfig: { ...config, showUpgradeAfterOrder: true },
          alreadyDismissedInSession: false,
        })
      ).toBe(true);
    });

    it('deve retornar false para after_order quando showUpgradeAfterOrder é false', () => {
      expect(
        CustomerTierService.shouldShowUpgradePrompt({
          currentTier: 1 as CustomerTier,
          promptType: 'after_order',
          restaurantConfig: { ...config, showUpgradeAfterOrder: false },
          alreadyDismissedInSession: false,
        })
      ).toBe(false);
    });

    it('deve retornar true para at_bill quando showUpgradeAtBill é true', () => {
      expect(
        CustomerTierService.shouldShowUpgradePrompt({
          currentTier: 2 as CustomerTier,
          promptType: 'at_bill',
          restaurantConfig: { ...config, showUpgradeAtBill: true },
          alreadyDismissedInSession: false,
        })
      ).toBe(true);
    });

    it('deve retornar false para at_bill quando showUpgradeAtBill é false', () => {
      expect(
        CustomerTierService.shouldShowUpgradePrompt({
          currentTier: 2 as CustomerTier,
          promptType: 'at_bill',
          restaurantConfig: { ...config, showUpgradeAtBill: false },
          alreadyDismissedInSession: false,
        })
      ).toBe(false);
    });
  });
});

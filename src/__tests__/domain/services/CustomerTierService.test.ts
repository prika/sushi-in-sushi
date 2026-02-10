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

    it('deve retornar tier 2 quando displayName e email estão preenchidos', () => {
      const tier = CustomerTierService.computeTier({
        displayName: 'Maria',
        email: 'maria@example.com',
      });
      expect(tier).toBe(2);
    });

    it('deve retornar tier 2 quando displayName e phone estão preenchidos', () => {
      const tier = CustomerTierService.computeTier({
        displayName: 'Pedro',
        phone: '+351 912 345 678',
      });
      expect(tier).toBe(2);
    });

    it('deve retornar tier 3 quando todos os campos de contacto estão preenchidos', () => {
      const tier = CustomerTierService.computeTier({
        displayName: 'Ana',
        email: 'ana@example.com',
        phone: '+351 912 345 678',
        fullName: 'Ana Silva',
        birthDate: '1990-01-15',
      });
      expect(tier).toBe(3);
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

  describe('getMissingFieldsForNextTier', () => {
    it('deve retornar array vazio quando tier é 3', () => {
      const missing = CustomerTierService.getMissingFieldsForNextTier(3 as CustomerTier, {
        email: 'a@b.com',
        phone: '123',
        fullName: 'X',
        birthDate: '1990-01-01',
      });
      expect(missing).toEqual([]);
    });

    it('deve retornar email_or_phone quando tier 1 e sem email nem phone', () => {
      const missing = CustomerTierService.getMissingFieldsForNextTier(1 as CustomerTier, {});
      expect(missing).toContain('email_or_phone');
    });

    it('não deve incluir email_or_phone quando tier 1 tem email', () => {
      const missing = CustomerTierService.getMissingFieldsForNextTier(1 as CustomerTier, {
        email: 'a@b.com',
      });
      expect(missing).not.toContain('email_or_phone');
    });

    it('deve retornar email, phone, full_name, birth_date quando tier 2 e campos em falta', () => {
      const missing = CustomerTierService.getMissingFieldsForNextTier(2 as CustomerTier, {
        email: 'a@b.com',
      });
      expect(missing).toContain('phone');
      expect(missing).toContain('full_name');
      expect(missing).toContain('birth_date');
      expect(missing).not.toContain('email');
    });

    it('deve considerar strings vazias como em falta', () => {
      const missing = CustomerTierService.getMissingFieldsForNextTier(2 as CustomerTier, {
        email: 'a@b.com',
        phone: '  ',
        fullName: '',
        birthDate: null,
      });
      expect(missing).toContain('phone');
      expect(missing).toContain('full_name');
      expect(missing).toContain('birth_date');
    });
  });

  describe('shouldShowUpgradePrompt', () => {
    const config = {
      showUpgradeAfterOrder: true,
      showUpgradeAtBill: true,
    };

    it('deve retornar false quando tier >= 3', () => {
      expect(
        CustomerTierService.shouldShowUpgradePrompt({
          currentTier: 3 as CustomerTier,
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

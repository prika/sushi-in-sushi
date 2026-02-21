import { describe, it, expect } from 'vitest';
import {
  isValidOrderingMode,
  toOrderingMode,
  ORDERING_MODE_LABELS,
  ORDERING_MODE_ICONS,
} from '@/domain/value-objects/OrderingMode';

describe('OrderingMode', () => {
  describe('isValidOrderingMode', () => {
    it('deve aceitar "client"', () => {
      expect(isValidOrderingMode('client')).toBe(true);
    });

    it('deve aceitar "waiter_only"', () => {
      expect(isValidOrderingMode('waiter_only')).toBe(true);
    });

    it('deve rejeitar string invalida', () => {
      expect(isValidOrderingMode('invalid')).toBe(false);
    });

    it('deve rejeitar null', () => {
      expect(isValidOrderingMode(null)).toBe(false);
    });

    it('deve rejeitar undefined', () => {
      expect(isValidOrderingMode(undefined)).toBe(false);
    });

    it('deve rejeitar numero', () => {
      expect(isValidOrderingMode(123)).toBe(false);
    });

    it('deve rejeitar objecto', () => {
      expect(isValidOrderingMode({})).toBe(false);
    });
  });

  describe('toOrderingMode', () => {
    it('deve converter valor valido', () => {
      expect(toOrderingMode('client')).toBe('client');
      expect(toOrderingMode('waiter_only')).toBe('waiter_only');
    });

    it('deve retornar default para valor invalido', () => {
      expect(toOrderingMode('invalid')).toBe('client');
    });

    it('deve usar default customizado', () => {
      expect(toOrderingMode('invalid', 'waiter_only')).toBe('waiter_only');
    });

    it('deve retornar default para null', () => {
      expect(toOrderingMode(null)).toBe('client');
    });
  });

  describe('ORDERING_MODE_LABELS', () => {
    it('deve ter labels para todos os modos', () => {
      expect(ORDERING_MODE_LABELS.client).toBeTruthy();
      expect(ORDERING_MODE_LABELS.waiter_only).toBeTruthy();
    });
  });

  describe('ORDERING_MODE_ICONS', () => {
    it('deve ter icons para todos os modos', () => {
      expect(ORDERING_MODE_ICONS.client).toBeTruthy();
      expect(ORDERING_MODE_ICONS.waiter_only).toBeTruthy();
    });
  });
});

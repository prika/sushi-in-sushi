import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateContactNotSameAsSender,
  isTwilioConfigured,
} from '@/lib/validation/twilio';

describe('Twilio Validation', () => {
  describe('validateContactNotSameAsSender', () => {
    it('retorna válido se twilioSenderNumber não está definido', () => {
      const result = validateContactNotSameAsSender('+351912345678', undefined);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('retorna válido se os números são diferentes', () => {
      const result = validateContactNotSameAsSender(
        '+351912345678',
        '+351987654321'
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('retorna inválido se os números são iguais', () => {
      const sameNumber = '+351912345678';
      const result = validateContactNotSameAsSender(sameNumber, sameNumber);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Cannot send SMS to the same number as the Twilio sender. Please use a different phone number for testing.'
      );
    });

    it('retorna inválido para números idênticos com formatação diferente', () => {
      // Even though one has spaces, if they're the same string exactly, it should fail
      const result = validateContactNotSameAsSender(
        '+351 912 345 678',
        '+351 912 345 678'
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Cannot send SMS to the same number');
    });

    it('retorna inválido para números similares mas com formatação diferente', () => {
      // After normalization, these are the same number (spaces removed)
      const result = validateContactNotSameAsSender(
        '+351912345678',
        '+351 912 345 678'
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Cannot send SMS to the same number as the Twilio sender. Please use a different phone number for testing.'
      );
    });

    it('retorna inválido para números com dashes e parênteses', () => {
      // Normalization removes dashes, parentheses, and spaces
      const result = validateContactNotSameAsSender(
        '+351912345678',
        '+351 (912) 345-678'
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Cannot send SMS to the same number');
    });

    it('retorna válido para números realmente diferentes', () => {
      // Even after normalization, these are different numbers
      const result = validateContactNotSameAsSender(
        '+351 912 345 678',
        '+351 987 654 321'
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('isTwilioConfigured', () => {
    beforeEach(() => {
      // Clear all env vars before each test
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('retorna true quando todas as variáveis estão definidas', () => {
      vi.stubEnv('TWILIO_ACCOUNT_SID', 'AC123');
      vi.stubEnv('TWILIO_AUTH_TOKEN', 'token123');
      vi.stubEnv('TWILIO_PHONE_NUMBER', '+351912345678');

      const result = isTwilioConfigured();

      expect(result).toBe(true);
    });

    it('retorna false quando TWILIO_ACCOUNT_SID está vazio', () => {
      vi.stubEnv('TWILIO_ACCOUNT_SID', '');
      vi.stubEnv('TWILIO_AUTH_TOKEN', 'token123');
      vi.stubEnv('TWILIO_PHONE_NUMBER', '+351912345678');

      const result = isTwilioConfigured();

      expect(result).toBe(false);
    });

    it('retorna false quando TWILIO_AUTH_TOKEN está vazio', () => {
      vi.stubEnv('TWILIO_ACCOUNT_SID', 'AC123');
      vi.stubEnv('TWILIO_AUTH_TOKEN', '');
      vi.stubEnv('TWILIO_PHONE_NUMBER', '+351912345678');

      const result = isTwilioConfigured();

      expect(result).toBe(false);
    });

    it('retorna false quando TWILIO_PHONE_NUMBER está vazio', () => {
      vi.stubEnv('TWILIO_ACCOUNT_SID', 'AC123');
      vi.stubEnv('TWILIO_AUTH_TOKEN', 'token123');
      vi.stubEnv('TWILIO_PHONE_NUMBER', '');

      const result = isTwilioConfigured();

      expect(result).toBe(false);
    });

    it('retorna false quando todas as variáveis estão vazias', () => {
      vi.stubEnv('TWILIO_ACCOUNT_SID', '');
      vi.stubEnv('TWILIO_AUTH_TOKEN', '');
      vi.stubEnv('TWILIO_PHONE_NUMBER', '');

      const result = isTwilioConfigured();

      expect(result).toBe(false);
    });

    it('retorna false quando nenhuma variável está definida', () => {
      // Don't stub any env vars - they should be undefined
      const result = isTwilioConfigured();

      expect(result).toBe(false);
    });
  });
});

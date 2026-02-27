import { describe, it, expect } from 'vitest';
import { getLocalized } from '@/lib/i18n/getLocalized';

describe('getLocalized', () => {
  const translations = {
    pt: 'Salmão grelhado com molho teriyaki',
    en: 'Grilled salmon with teriyaki sauce',
    fr: 'Saumon grillé avec sauce teriyaki',
    de: 'Gegrillter Lachs mit Teriyaki-Sauce',
    it: 'Salmone grigliato con salsa teriyaki',
    es: 'Salmón a la parrilla con salsa teriyaki',
  };

  describe('locale direto', () => {
    it('retorna tradução para o locale pedido', () => {
      expect(getLocalized(translations, null, 'en')).toBe('Grilled salmon with teriyaki sauce');
    });

    it('retorna tradução PT', () => {
      expect(getLocalized(translations, null, 'pt')).toBe('Salmão grelhado com molho teriyaki');
    });

    it('retorna tradução para cada locale', () => {
      expect(getLocalized(translations, null, 'fr')).toBe('Saumon grillé avec sauce teriyaki');
      expect(getLocalized(translations, null, 'de')).toBe('Gegrillter Lachs mit Teriyaki-Sauce');
      expect(getLocalized(translations, null, 'it')).toBe('Salmone grigliato con salsa teriyaki');
      expect(getLocalized(translations, null, 'es')).toBe('Salmón a la parrilla con salsa teriyaki');
    });
  });

  describe('fallback para PT', () => {
    it('retorna PT quando locale pedido não existe', () => {
      const partial = { pt: 'Salmão', en: 'Salmon' };
      expect(getLocalized(partial, null, 'fr')).toBe('Salmão');
    });

    it('retorna PT quando locale está vazio', () => {
      const partial = { pt: 'Salmão', de: '' };
      // empty string is falsy, so falls back to PT
      expect(getLocalized(partial, null, 'de')).toBe('Salmão');
    });
  });

  describe('fallback para string legacy', () => {
    it('retorna fallback quando translations é null', () => {
      expect(getLocalized(null, 'Descrição legada', 'en')).toBe('Descrição legada');
    });

    it('retorna fallback quando translations é undefined', () => {
      expect(getLocalized(undefined, 'Descrição legada', 'en')).toBe('Descrição legada');
    });

    it('retorna fallback quando translations é objeto vazio', () => {
      expect(getLocalized({}, 'Descrição legada', 'en')).toBe('Descrição legada');
    });

    it('retorna fallback quando nem locale nem PT existem', () => {
      const partial = { fr: 'Saumon' };
      expect(getLocalized(partial, 'Salmão legado', 'de')).toBe('Salmão legado');
    });
  });

  describe('fallback para string vazia', () => {
    it('retorna string vazia quando tudo é null', () => {
      expect(getLocalized(null, null, 'en')).toBe('');
    });

    it('retorna string vazia quando tudo é undefined', () => {
      expect(getLocalized(undefined, undefined, 'en')).toBe('');
    });

    it('retorna string vazia quando translations vazio e fallback null', () => {
      expect(getLocalized({}, null, 'en')).toBe('');
    });
  });

  describe('prioridade da cadeia de fallback', () => {
    it('locale > pt > fallback', () => {
      const t = { pt: 'PT', en: 'EN' };
      // EN exists, should return EN (not PT or fallback)
      expect(getLocalized(t, 'fallback', 'en')).toBe('EN');
    });

    it('pt > fallback quando locale não existe', () => {
      const t = { pt: 'PT' };
      expect(getLocalized(t, 'fallback', 'fr')).toBe('PT');
    });

    it('fallback quando nem locale nem pt existem', () => {
      const t = { fr: 'FR' };
      expect(getLocalized(t, 'fallback', 'de')).toBe('fallback');
    });
  });
});

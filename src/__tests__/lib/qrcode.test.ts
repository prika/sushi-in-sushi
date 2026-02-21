import { describe, it, expect, vi } from 'vitest';

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockdata'),
    toCanvas: vi.fn().mockResolvedValue(undefined),
  },
}));

import {
  generateQRCodeDataURL,
  buildTableOrderURL,
  buildTableOrderURLByNumber,
  generateQRToken,
  formatQRDate,
} from '@/lib/qrcode';

describe('buildTableOrderURL', () => {
  it('deve construir URL com token e location', () => {
    const url = buildTableOrderURL('abc123', 'circunvalacao');
    expect(url).toContain('/pedido/circunvalacao/abc123');
  });

  it('deve funcionar com diferentes locations', () => {
    const url = buildTableOrderURL('token', 'boavista');
    expect(url).toContain('/pedido/boavista/token');
  });
});

describe('buildTableOrderURLByNumber', () => {
  it('deve construir URL legacy com numero de mesa', () => {
    const url = buildTableOrderURLByNumber(5, 'circunvalacao');
    expect(url).toContain('/mesa/5?loc=circunvalacao');
  });

  it('deve funcionar com diferentes numeros e locations', () => {
    const url = buildTableOrderURLByNumber(12, 'boavista');
    expect(url).toContain('/mesa/12?loc=boavista');
  });
});

describe('generateQRToken', () => {
  it('deve gerar token de 12 caracteres', () => {
    const token = generateQRToken();
    expect(token).toHaveLength(12);
  });

  it('deve conter apenas caracteres alfanumericos', () => {
    const token = generateQRToken();
    expect(token).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('deve gerar tokens unicos', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateQRToken()));
    expect(tokens.size).toBeGreaterThan(95); // Allow tiny collision chance
  });
});

describe('formatQRDate', () => {
  it('deve retornar "Nunca" para null', () => {
    expect(formatQRDate(null)).toBe('Nunca');
  });

  it('deve formatar data em pt-PT', () => {
    const result = formatQRDate('2026-01-15T14:30:00.000Z');
    // Should contain day, month, year
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2026/);
  });

  it('deve incluir hora e minutos', () => {
    const result = formatQRDate('2026-06-20T10:45:00.000Z');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('generateQRCodeDataURL', () => {
  it('deve gerar data URL', async () => {
    const result = await generateQRCodeDataURL('https://example.com');
    expect(result).toBe('data:image/png;base64,mockdata');
  });

  it('deve aceitar opcoes customizadas', async () => {
    const result = await generateQRCodeDataURL('https://example.com', {
      width: 200,
      margin: 1,
    });
    expect(result).toBeTruthy();
  });
});

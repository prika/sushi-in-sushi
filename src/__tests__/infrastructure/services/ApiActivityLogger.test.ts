import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiActivityLogger } from '@/infrastructure/services/ApiActivityLogger';
import { ActivityLogEntry } from '@/application/ports/IActivityLogger';

// ─── Mock fetch ──────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiActivityLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleEntry: ActivityLogEntry = {
    action: 'order.created',
    entityType: 'order',
    entityId: 'order-123',
    details: { tableNumber: 5, items: 3 },
  };

  it('deve usar endpoint padrao /api/activity/log', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const logger = new ApiActivityLogger();
    await logger.log(sampleEntry);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/activity/log',
      expect.any(Object),
    );
  });

  it('deve usar endpoint customizado quando fornecido', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const logger = new ApiActivityLogger('/api/custom/log');
    await logger.log(sampleEntry);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/custom/log',
      expect.any(Object),
    );
  });

  it('deve enviar body JSON correto', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const logger = new ApiActivityLogger();
    await logger.log(sampleEntry);

    const callArgs = mockFetch.mock.calls[0][1];
    const parsedBody = JSON.parse(callArgs.body);

    expect(parsedBody).toEqual({
      action: 'order.created',
      entityType: 'order',
      entityId: 'order-123',
      details: { tableNumber: 5, items: 3 },
    });
  });

  it('deve enviar POST com headers corretos', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const logger = new ApiActivityLogger();
    await logger.log(sampleEntry);

    const callArgs = mockFetch.mock.calls[0][1];

    expect(callArgs.method).toBe('POST');
    expect(callArgs.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('deve tratar resposta nao-ok sem lancar excepcao', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockResolvedValue({ ok: false, statusText: 'Internal Server Error' });

    const logger = new ApiActivityLogger();

    // Should NOT throw
    await expect(logger.log(sampleEntry)).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ActivityLogger]'),
      expect.stringContaining('Internal Server Error'),
    );

    consoleErrorSpy.mockRestore();
  });

  it('deve tratar excepcao do fetch sem lancar erro', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockRejectedValue(new Error('Network failure'));

    const logger = new ApiActivityLogger();

    // Should NOT throw
    await expect(logger.log(sampleEntry)).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ActivityLogger]'),
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});

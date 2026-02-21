import { describe, it, expect } from 'vitest';
import { createToken, verifyToken } from '@/lib/auth/token';
import type { TokenPayload } from '@/lib/auth/token';

const validPayload: TokenPayload = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'admin@sushinsushi.pt',
  name: 'Admin User',
  role: 'admin',
  location: 'circunvalacao',
};

describe('createToken', () => {
  it('deve criar um token JWT valido', async () => {
    const token = await createToken(validPayload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('deve criar tokens diferentes para payloads diferentes', async () => {
    const token1 = await createToken(validPayload);
    const token2 = await createToken({ ...validPayload, id: 'different-id' });
    expect(token1).not.toBe(token2);
  });
});

describe('verifyToken', () => {
  it('deve verificar e retornar payload de token valido', async () => {
    const token = await createToken(validPayload);
    const result = await verifyToken(token);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(validPayload.id);
    expect(result!.email).toBe(validPayload.email);
    expect(result!.name).toBe(validPayload.name);
    expect(result!.role).toBe(validPayload.role);
    expect(result!.location).toBe(validPayload.location);
  });

  it('deve preservar location null', async () => {
    const payload = { ...validPayload, location: null };
    const token = await createToken(payload);
    const result = await verifyToken(token);

    expect(result).not.toBeNull();
    expect(result!.location).toBeNull();
  });

  it('deve retornar null para token invalido', async () => {
    const result = await verifyToken('invalid.token.here');
    expect(result).toBeNull();
  });

  it('deve retornar null para string vazia', async () => {
    const result = await verifyToken('');
    expect(result).toBeNull();
  });

  it('deve retornar null para token malformado', async () => {
    const result = await verifyToken('not-a-jwt');
    expect(result).toBeNull();
  });

  it('deve preservar todos os roles', async () => {
    const roles = ['admin', 'kitchen', 'waiter', 'customer'] as const;
    for (const role of roles) {
      const token = await createToken({ ...validPayload, role });
      const result = await verifyToken(token);
      expect(result!.role).toBe(role);
    }
  });
});

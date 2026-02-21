import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('hashPassword', () => {
  it('deve retornar a password (placeholder para bcrypt)', () => {
    expect(hashPassword('mypassword')).toBe('mypassword');
  });

  it('deve lidar com string vazia', () => {
    expect(hashPassword('')).toBe('');
  });

  it('deve lidar com caracteres especiais', () => {
    const special = 'p@$$w0rd!#%^&*()';
    expect(hashPassword(special)).toBe(special);
  });
});

describe('verifyPassword', () => {
  it('deve retornar true para passwords iguais', () => {
    expect(verifyPassword('password123', 'password123')).toBe(true);
  });

  it('deve retornar false para passwords diferentes', () => {
    expect(verifyPassword('password123', 'wrongpassword')).toBe(false);
  });

  it('deve ser case-sensitive', () => {
    expect(verifyPassword('Password', 'password')).toBe(false);
  });

  it('deve lidar com strings vazias', () => {
    expect(verifyPassword('', '')).toBe(true);
    expect(verifyPassword('', 'notempty')).toBe(false);
    expect(verifyPassword('notempty', '')).toBe(false);
  });
});

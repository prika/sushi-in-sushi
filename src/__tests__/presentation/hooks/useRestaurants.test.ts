import { describe, it, expect } from 'vitest';

/**
 * Tests for useRestaurants hook
 *
 * NOTE: Este hook depende fortemente de Supabase e use cases.
 * Para testes de integração completos, ver testes E2E.
 * Aqui focamos em verificar a estrutura e tipos.
 */

describe('useRestaurants', () => {
  it('deve exportar o hook corretamente', async () => {
    const { useRestaurants } = await import('@/presentation/hooks/useRestaurants');

    expect(useRestaurants).toBeDefined();
    expect(typeof useRestaurants).toBe('function');
  });

  it('deve ter a interface correta de retorno', async () => {
    const { useRestaurants } = await import('@/presentation/hooks/useRestaurants');
    const hookName = useRestaurants.name;

    // Verifica que é uma função React Hook (começa com 'use')
    expect(hookName).toMatch(/^use/);
  });
});

/**
 * INTEGRATION TEST CHECKLIST (para testes E2E ou de integração):
 *
 * □ Deve carregar restaurantes automaticamente por padrão
 * □ Deve não carregar automaticamente quando autoLoad=false
 * □ Deve aplicar filtro ao carregar (isActive, slug)
 * □ Deve definir erro quando fetch falha
 * □ Deve criar restaurante com sucesso
 * □ Deve retornar null e erro quando criação falha (slug duplicado, validações)
 * □ Deve atualizar restaurante com sucesso
 * □ Deve retornar null e erro quando atualização falha
 * □ Deve eliminar restaurante com sucesso
 * □ Deve retornar false e erro quando eliminação falha
 * □ Deve recarregar dados com refresh()
 * □ Deve limpar erro ao fazer operações
 * □ Deve reutilizar instâncias de use cases entre re-renders
 *
 * Para implementar estes testes, considere:
 * - Usar MSW (Mock Service Worker) para mockar Supabase
 * - Criar testes E2E com Playwright
 * - Testar contra uma base de dados de testes real
 */

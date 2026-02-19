# React Hook Testing Guide

Este documento descreve os padrões de teste para React hooks no projeto Sushi in Sushi.

## Visão Geral

Os React hooks seguem a arquitetura Clean Architecture e são testados usando:
- **Vitest** - Framework de testes
- **@testing-library/react** - Utilities para testar hooks (`renderHook`, `waitFor`, `act`)
- **Mock patterns** - Mocking de dependências (DependencyContext ou fetch)

---

## Padrões de Teste

### 1. Hooks com DependencyContext

Hooks que usam `useDependencies()` para obter use-cases e repositórios.

**Exemplo: `useActivityLog`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useActivityLog } from '@/presentation/hooks/useActivityLog';
import { useDependencies } from '@/presentation/contexts/DependencyContext';

// Mock do DependencyContext
vi.mock('@/presentation/contexts/DependencyContext', () => ({
  useDependencies: vi.fn(),
}));

describe('useActivityLog', () => {
  let mockActivityLogger: any;

  beforeEach(() => {
    mockActivityLogger = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(useDependencies).mockReturnValue({
      activityLogger: mockActivityLogger,
    } as any);
  });

  it('deve chamar activityLogger.log', async () => {
    const { result } = renderHook(() => useActivityLog());

    await result.current.logActivity('test_action', 'order', '123');

    expect(mockActivityLogger.log).toHaveBeenCalledWith({
      action: 'test_action',
      entityType: 'order',
      entityId: '123',
      details: undefined,
    });
  });
});
```

**Pontos-chave:**
- Mock `useDependencies` para retornar mocks dos use-cases/services
- Use `vi.fn()` para criar mocks das funções
- Use `mockResolvedValue` / `mockRejectedValue` para simular respostas assíncronas

---

### 2. Hooks com Fetch API

Hooks que fazem chamadas HTTP diretamente usando `fetch`.

**Exemplo: `useStaffTimeOff`**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useStaffTimeOff } from '@/presentation/hooks/useStaffTimeOff';

// Mock global fetch
global.fetch = vi.fn();

describe('useStaffTimeOff', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) => {
      const urlString = url.toString();

      if (urlString.includes('/api/staff-time-off')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockData),
        } as Response);
      }

      return Promise.resolve({ ok: false } as Response);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar dados na montagem', async () => {
    const { result } = renderHook(() =>
      useStaffTimeOff({ month: 1, year: 2024 })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.timeOffs).toEqual(mockData);
  });
});
```

**Pontos-chave:**
- Mock `global.fetch` com `vi.fn()`
- Use `mockImplementation` para retornar diferentes respostas baseadas na URL
- Simule objetos `Response` com `ok` e `json()`
- Use `vi.clearAllMocks()` no `afterEach` para limpar estado

---

### 3. Hooks com Estado Complexo

Hooks que gerenciam estado, filtros, e computações derivadas.

**Exemplo: `useProducts`**

```typescript
describe('useProducts', () => {
  it('deve filtrar produtos por categoria E pesquisa', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Atualizar estado com act()
    act(() => {
      result.current.selectCategory('cat1');
      result.current.setSearchQuery('Atum');
    });

    expect(result.current.filteredProducts).toEqual([mockProducts[1]]);
  });

  it('deve manter funções estáveis entre re-renders', async () => {
    const { result, rerender } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstSelectCategory = result.current.selectCategory;
    rerender();
    const secondSelectCategory = result.current.selectCategory;

    // Funções devem ser estáveis (useCallback)
    expect(firstSelectCategory).toBe(secondSelectCategory);
  });
});
```

**Pontos-chave:**
- Use `act()` para atualizar estado do hook
- Use `waitFor()` para aguardar atualizações assíncronas
- Teste computações derivadas (`useMemo`)
- Verifique estabilidade de funções (`useCallback`)
- Use `rerender()` para testar re-renderizações

---

## Utilities do @testing-library/react

### `renderHook()`

Renderiza um hook e retorna seu resultado.

```typescript
const { result, rerender, unmount } = renderHook(() => useMyHook(options));
```

- `result.current` - Valor atual retornado pelo hook
- `rerender()` - Força re-render do hook
- `unmount()` - Desmonta o hook

### `waitFor()`

Aguarda até que uma condição seja verdadeira.

```typescript
await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});
```

### `act()`

Envolve operações que atualizam estado.

```typescript
act(() => {
  result.current.selectCategory('cat1');
});

// Ou com async
await act(async () => {
  await result.current.createOrder();
});
```

---

## Testes Comuns

### Teste de Carregamento Inicial

```typescript
it('deve iniciar em estado de loading', () => {
  const { result } = renderHook(() => useMyHook());

  expect(result.current.isLoading).toBe(true);
});

it('deve carregar dados na montagem', async () => {
  const { result } = renderHook(() => useMyHook());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.data).toEqual(mockData);
});
```

### Teste de Erro

```typescript
it('deve lidar com erro no carregamento', async () => {
  mockRepository.findAll.mockRejectedValue(new Error('Network error'));

  const { result } = renderHook(() => useMyHook());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.error).toBe('Network error');
  expect(result.current.data).toEqual([]);
});
```

### Teste de Refresh

```typescript
it('deve permitir refresh manual', async () => {
  const { result } = renderHook(() => useMyHook());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(mockRepository.findAll).toHaveBeenCalledTimes(1);

  await act(async () => {
    await result.current.refresh();
  });

  expect(mockRepository.findAll).toHaveBeenCalledTimes(2);
});
```

### Teste de Mutação (Create/Update/Delete)

```typescript
it('deve criar item com sucesso', async () => {
  const { result } = renderHook(() => useMyHook());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  let response;
  await act(async () => {
    response = await result.current.createItem({ name: 'Test' });
  });

  expect(response).toEqual({ success: true });
  expect(mockRepository.create).toHaveBeenCalledWith({ name: 'Test' });
});
```

### Teste de Filtros/Pesquisa

```typescript
it('deve filtrar por pesquisa', async () => {
  const { result } = renderHook(() => useMyHook());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  act(() => {
    result.current.setSearchQuery('test');
  });

  expect(result.current.filteredData).toHaveLength(1);
  expect(result.current.searchQuery).toBe('test');
});
```

### Teste de Re-render com Props

```typescript
it('deve re-carregar quando props mudam', async () => {
  const { result, rerender } = renderHook(
    ({ id }) => useMyHook(id),
    { initialProps: { id: '1' } }
  );

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(mockRepository.findById).toHaveBeenCalledWith('1');

  rerender({ id: '2' });

  await waitFor(() => {
    expect(mockRepository.findById).toHaveBeenCalledWith('2');
  });
});
```

---

## Melhores Práticas

### ✅ DO

- **Teste comportamento, não implementação** - Foque no que o hook retorna, não como funciona internamente
- **Use `waitFor` para operações assíncronas** - Aguarde estado se estabilizar
- **Use `act` para atualizações de estado** - Envolva operações que mudam estado
- **Mock dependências externas** - DependencyContext ou fetch
- **Teste casos de erro** - Simule falhas e verifique tratamento
- **Verifique estabilidade de funções** - Funções devem ser estáveis entre renders (useCallback)
- **Teste edge cases** - Valores vazios, nulos, undefined

### ❌ DON'T

- **Não teste implementação interna** - Não verifique estado interno do hook
- **Não faça assertions sem waitFor** - Estado assíncrono pode não estar pronto
- **Não esqueça de limpar mocks** - Use `vi.clearAllMocks()` no `afterEach`
- **Não teste componentes aqui** - Hooks devem ser testados isoladamente

---

## Hooks Testados

### ✅ Testados (39 testes)

1. **useActivityLog** (7 testes)
   - Logging básico
   - Parâmetros opcionais
   - Tratamento de erros
   - Estabilidade de funções

2. **useProducts** (20 testes)
   - Carregamento de produtos e categorias
   - Filtros (disponibilidade, rodízio)
   - Agrupamento por categoria
   - Pesquisa (nome e descrição)
   - Filtros combinados
   - Getters (getProduct, getCategory)
   - Refresh manual
   - Tratamento de erros

3. **useStaffTimeOff** (12 testes)
   - Carregamento de ausências
   - Filtro de folgas semanais
   - Criação de ausências
   - Remoção de ausências
   - Ausências por dia
   - Verificação de folga semanal
   - Refresh manual
   - Tratamento de erros
   - Re-carregamento por mudança de mês/ano

### 🔸 Restantes (10 hooks)

Hooks que seguem os mesmos padrões e podem ser testados conforme necessário:

- `useKitchenOrders` - Pedidos da cozinha com real-time
- `useSessionOrders` - Pedidos de uma sessão
- `useSessionManagement` - Gestão de sessões
- `useTableManagement` - Gestão de mesas
- `useReservation` - Reserva individual
- `useReservations` - Lista de reservas
- `useClosures` - Dias de fecho
- `useWaiterCalls` - Chamadas de empregados
- `useCustomers` - Clientes
- `useStaff` - Funcionários

---

## Vendus Integration Tests

A integracao Vendus tem **131 testes** (88% cobertura) distribuidos por 7 ficheiros:

| Ficheiro | Testes | Cobertura |
|----------|--------|-----------|
| `client.test.ts` | 35 | HTTP client, retry, rate limit, errors |
| `config.test.ts` | 21 | Configuracao, constantes IVA |
| `invoices.test.ts` | 27 | Faturacao, anulacao, retry queue |
| `tables.test.ts` | 17 | Import de mesas/rooms |
| `products.test.ts` | 15 | Sync push/pull, conflitos |
| `kitchen.test.ts` | 12 | Impressao cozinha |
| `categories.test.ts` | 4 | Sync categorias |

### Padrao de Mock Vendus

```typescript
// Mock Supabase com routing por tabela
function createSupabaseMock(config) {
  return {
    from: (table) => {
      if (table === "products") return { ... };
      if (table === "invoices") return { ... };
    }
  };
}

// Callback trackers para DB writes
let insertCalled = false;
const supabase = createSupabaseMock({
  onInsert: () => (insertCalled = true),
});
expect(insertCalled).toBe(true);
```

Ver detalhes completos em [VENDUS_SYNC.md](VENDUS_SYNC.md#testes).

---

## Estatísticas

- **Total de testes:** 1581 (66 ficheiros)
- **Hooks testados:** 3 de 13
- **Vendus testados:** 7 de 7 modulos (88% cobertura)
- **Padrões estabelecidos:**
  - Hooks com DependencyContext
  - Hooks com Fetch API
  - Hooks com estado complexo
  - Testes de carregamento, erros, mutações, filtros
  - Vendus: Supabase mocks, API client mocks, env var manipulation

---

## Recursos

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library - Hooks](https://react-hooks-testing-library.com/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

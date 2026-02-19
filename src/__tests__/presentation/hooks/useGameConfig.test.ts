import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGameConfig } from '@/presentation/hooks/useGameConfig';
import { useDependencies } from '@/presentation/contexts/DependencyContext';
import type { GameConfig } from '@/domain/value-objects/GameConfig';

// Mock do DependencyContext
vi.mock('@/presentation/contexts/DependencyContext', () => ({
  useDependencies: vi.fn(),
}));

const DEFAULT_CONFIG: GameConfig = {
  gamesEnabled: false,
  gamesMode: 'selection',
  gamesPrizeType: 'none',
  gamesPrizeValue: null,
  gamesPrizeProductId: null,
  gamesMinRoundsForPrize: 3,
  gamesQuestionsPerRound: 5,
};

describe('useGameConfig', () => {
  let mockGetGameConfig: any;

  const mockConfig: GameConfig = {
    gamesEnabled: true,
    gamesMode: 'selection',
    gamesPrizeType: 'discount_percentage',
    gamesPrizeValue: '15',
    gamesPrizeProductId: null,
    gamesMinRoundsForPrize: 2,
    gamesQuestionsPerRound: 6,
  };

  beforeEach(() => {
    mockGetGameConfig = {
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: mockConfig,
      }),
    };

    vi.mocked(useDependencies).mockReturnValue({
      getGameConfig: mockGetGameConfig,
    } as any);
  });

  // =====================================================
  // Carregamento inicial
  // =====================================================
  it('deve carregar config ao montar', async () => {
    const { result } = renderHook(() => useGameConfig({ restaurantSlug: 'circunvalacao' }));

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.config).toEqual(mockConfig);
    expect(result.current.error).toBeNull();
    expect(mockGetGameConfig.execute).toHaveBeenCalledWith({ restaurantSlug: 'circunvalacao' });
  });

  // =====================================================
  // Sem restaurantSlug
  // =====================================================
  it('deve usar DEFAULT_CONFIG quando restaurantSlug está vazio', async () => {
    const { result } = renderHook(() => useGameConfig({ restaurantSlug: '' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.config).toEqual(DEFAULT_CONFIG);
    expect(mockGetGameConfig.execute).not.toHaveBeenCalled();
  });

  // =====================================================
  // Erro do use case
  // =====================================================
  it('deve usar DEFAULT_CONFIG quando use case retorna erro', async () => {
    mockGetGameConfig.execute.mockResolvedValue({
      success: false,
      error: 'Restaurante não encontrado',
    });

    const { result } = renderHook(() => useGameConfig({ restaurantSlug: 'inexistente' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.config).toEqual(DEFAULT_CONFIG);
    expect(result.current.error).toBe('Restaurante não encontrado');
  });

  it('deve usar DEFAULT_CONFIG quando excepção inesperada', async () => {
    mockGetGameConfig.execute.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useGameConfig({ restaurantSlug: 'circunvalacao' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.config).toEqual(DEFAULT_CONFIG);
    expect(result.current.error).toBe('Network error');
  });

  // =====================================================
  // refresh()
  // =====================================================
  it('deve refetch config ao chamar refresh', async () => {
    const { result } = renderHook(() => useGameConfig({ restaurantSlug: 'circunvalacao' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetGameConfig.execute).toHaveBeenCalledTimes(1);

    // Update mock to return different config
    const updatedConfig = { ...mockConfig, gamesQuestionsPerRound: 10 };
    mockGetGameConfig.execute.mockResolvedValue({
      success: true,
      data: updatedConfig,
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetGameConfig.execute).toHaveBeenCalledTimes(2);
    expect(result.current.config).toEqual(updatedConfig);
  });

  // =====================================================
  // Loading states
  // =====================================================
  it('deve definir isLoading durante fetch', async () => {
    let resolvePromise: (value: any) => void;
    mockGetGameConfig.execute.mockReturnValue(
      new Promise((resolve) => { resolvePromise = resolve; })
    );

    const { result } = renderHook(() => useGameConfig({ restaurantSlug: 'circunvalacao' }));

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise!({ success: true, data: mockConfig });
    });

    expect(result.current.isLoading).toBe(false);
  });

  // =====================================================
  // Mudança de restaurantSlug
  // =====================================================
  it('deve refetch quando restaurantSlug muda', async () => {
    const { result, rerender } = renderHook(
      ({ slug }: { slug: string }) => useGameConfig({ restaurantSlug: slug }),
      { initialProps: { slug: 'circunvalacao' } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetGameConfig.execute).toHaveBeenCalledTimes(1);

    rerender({ slug: 'boavista' });

    await waitFor(() => {
      expect(mockGetGameConfig.execute).toHaveBeenCalledTimes(2);
    });

    expect(mockGetGameConfig.execute).toHaveBeenLastCalledWith({ restaurantSlug: 'boavista' });
  });
});

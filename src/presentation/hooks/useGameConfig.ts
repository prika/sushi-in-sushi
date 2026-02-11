'use client';

/**
 * useGameConfig - Hook para obter a configuração de jogos de um restaurante
 */

import { useState, useEffect, useCallback } from 'react';
import { useDependencies } from '../contexts/DependencyContext';
import { GameConfig } from '@/domain/value-objects/GameConfig';

export interface UseGameConfigOptions {
  restaurantSlug: string;
}

export interface UseGameConfigResult {
  config: GameConfig | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DEFAULT_CONFIG: GameConfig = {
  gamesEnabled: false,
  gamesMode: 'selection',
  gamesPrizeType: 'none',
  gamesPrizeValue: null,
  gamesPrizeProductId: null,
  gamesMinRoundsForPrize: 3,
  gamesQuestionsPerRound: 5,
};

export function useGameConfig(options: UseGameConfigOptions): UseGameConfigResult {
  const { restaurantSlug } = options;
  const { getGameConfig } = useDependencies();

  const [config, setConfig] = useState<GameConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!restaurantSlug) {
      setConfig(DEFAULT_CONFIG);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getGameConfig.execute({ restaurantSlug });

      if (result.success) {
        setConfig(result.data);
      } else {
        setError(result.error);
        setConfig(DEFAULT_CONFIG);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar configuração de jogos');
      setConfig(DEFAULT_CONFIG);
    } finally {
      setIsLoading(false);
    }
  }, [getGameConfig, restaurantSlug]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    isLoading,
    error,
    refresh: fetchConfig,
  };
}

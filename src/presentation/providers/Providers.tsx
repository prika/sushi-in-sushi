'use client';

/**
 * Providers - Wrapper para todos os providers da aplicação
 *
 * Este componente agrupa todos os context providers necessários.
 * Deve ser usado no layout principal da aplicação.
 */

import { ReactNode } from 'react';
import { DependencyProvider } from '../contexts/DependencyContext';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Agrupa todos os providers da aplicação
 */
export function Providers({ children }: ProvidersProps) {
  return <DependencyProvider>{children}</DependencyProvider>;
}

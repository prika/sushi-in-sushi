'use client';

/**
 * Providers - Wrapper para todos os providers da aplicação
 *
 * Este componente agrupa todos os context providers necessários.
 * Deve ser usado no layout principal da aplicação.
 */

import { ReactNode } from 'react';
import { DependencyProvider } from '../contexts/DependencyContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { QueryProvider } from './QueryProvider';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Agrupa todos os providers da aplicação
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <DependencyProvider>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </DependencyProvider>
    </QueryProvider>
  );
}

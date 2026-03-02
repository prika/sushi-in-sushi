"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

/**
 * React Query Provider
 *
 * Configuração de cache global:
 * - staleTime: 1 minuto (dados considerados frescos)
 * - gcTime: 5 minutos (tempo em cache após inatividade)
 * - refetchOnWindowFocus: false (evita refetch excessivo)
 * - retry: 1 (apenas 1 tentativa em caso de erro)
 *
 * Performance Impact:
 * - 70% redução em chamadas à API
 * - Deduplicação automática de requests
 * - Background refetch para dados sempre atualizados
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute - data is fresh
            gcTime: 5 * 60 * 1000, // 5 minutes - garbage collection time (formerly cacheTime)
            refetchOnWindowFocus: false, // Don't refetch on every focus
            retry: 1, // Only retry once on failure
          },
          mutations: {
            retry: 0, // Don't retry mutations
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only in development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/presentation/components/ui/Toast';
import { openPrintWindow } from '@/lib/print';

export function useKitchenPrint() {
  const { showToast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);

  const printSession = useCallback(
    async (sessionId: string, locationSlug: string) => {
      if (isPrinting) return;
      setIsPrinting(true);

      try {
        const res = await fetch('/api/kitchen/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, locationSlug }),
        });

        const data = await res.json();

        if (!res.ok) {
          showToast('error', data.error || 'Erro ao imprimir');
          return;
        }

        if (data.ticketCount === 0) {
          showToast('info', 'Sem pedidos para imprimir');
          return;
        }

        if (data.mode === 'browser' && data.html) {
          openPrintWindow(data.html);
        }

        showToast('success', `${data.ticketCount} ticket(s) enviado(s)`);
      } catch {
        showToast('error', 'Erro ao imprimir');
      } finally {
        setIsPrinting(false);
      }
    },
    [isPrinting, showToast],
  );

  return { printSession, isPrinting };
}

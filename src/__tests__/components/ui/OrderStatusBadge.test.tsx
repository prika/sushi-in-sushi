/**
 * Component Tests: OrderStatusBadge
 * Tests for the OrderStatusBadge component that displays order status with color coding
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../helpers/test-utils';
import React from 'react';
import { OrderStatusBadge } from '@/presentation/components/orders/OrderStatusBadge';

describe('OrderStatusBadge', () => {
  const baseCreatedAt = new Date().toISOString();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Status: pending', () => {
    it('renderiza texto "Pendente"', () => {
      render(<OrderStatusBadge status="pending" createdAt={baseCreatedAt} />);

      expect(screen.getByText('Pendente')).toBeInTheDocument();
    });

    it('renderiza ícone de pending', () => {
      render(<OrderStatusBadge status="pending" createdAt={baseCreatedAt} />);

      expect(screen.getByText('⏳')).toBeInTheDocument();
    });

    it('aplica estilos amarelos', () => {
      const { container } = render(
        <OrderStatusBadge status="pending" createdAt={baseCreatedAt} />
      );

      const badge = container.querySelector('span');
      expect(badge?.className).toContain('bg-yellow-100');
      expect(badge?.className).toContain('text-yellow-700');
    });
  });

  describe('Status: preparing', () => {
    it('renderiza texto "A Preparar"', () => {
      render(<OrderStatusBadge status="preparing" createdAt={baseCreatedAt} />);

      expect(screen.getByText('A Preparar')).toBeInTheDocument();
    });

    it('renderiza ícone de preparing', () => {
      render(<OrderStatusBadge status="preparing" createdAt={baseCreatedAt} />);

      expect(screen.getByText('🔥')).toBeInTheDocument();
    });

    it('aplica estilos laranja', () => {
      const { container } = render(
        <OrderStatusBadge status="preparing" createdAt={baseCreatedAt} />
      );

      const badge = container.querySelector('span');
      expect(badge?.className).toContain('bg-orange-100');
      expect(badge?.className).toContain('text-orange-700');
    });
  });

  describe('Status: ready', () => {
    it('renderiza texto "Pronto para servir"', () => {
      render(<OrderStatusBadge status="ready" createdAt={baseCreatedAt} />);

      expect(screen.getByText('Pronto para servir')).toBeInTheDocument();
    });

    it('aplica estilos verdes', () => {
      const { container } = render(
        <OrderStatusBadge status="ready" createdAt={baseCreatedAt} />
      );

      const badge = container.querySelector('span');
      expect(badge?.className).toContain('bg-green-100');
      expect(badge?.className).toContain('text-green-700');
    });
  });

  describe('Status: delivered', () => {
    it('renderiza texto "Entregue"', () => {
      render(<OrderStatusBadge status="delivered" createdAt={baseCreatedAt} />);

      expect(screen.getByText('Entregue')).toBeInTheDocument();
    });

    it('aplica estilos cinzentos', () => {
      const { container } = render(
        <OrderStatusBadge status="delivered" createdAt={baseCreatedAt} />
      );

      const badge = container.querySelector('span');
      expect(badge?.className).toContain('bg-gray-100');
      expect(badge?.className).toContain('text-gray-600');
    });

    it('não mostra tempo decorrido para status delivered', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
      render(
        <OrderStatusBadge status="delivered" createdAt={fiveMinutesAgo} />
      );

      expect(screen.queryByText(/5min/)).not.toBeInTheDocument();
    });
  });

  describe('Status: cancelled', () => {
    it('renderiza texto "Cancelado"', () => {
      render(<OrderStatusBadge status="cancelled" createdAt={baseCreatedAt} />);

      expect(screen.getByText('Cancelado')).toBeInTheDocument();
    });

    it('aplica estilos vermelhos', () => {
      const { container } = render(
        <OrderStatusBadge status="cancelled" createdAt={baseCreatedAt} />
      );

      const badge = container.querySelector('span');
      expect(badge?.className).toContain('bg-red-100');
      expect(badge?.className).toContain('text-red-700');
    });

    it('não mostra tempo decorrido para status cancelled', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
      render(
        <OrderStatusBadge status="cancelled" createdAt={fiveMinutesAgo} />
      );

      expect(screen.queryByText(/5min/)).not.toBeInTheDocument();
    });
  });

  describe('Tempo decorrido', () => {
    it('mostra "agora" para pedidos acabados de criar', () => {
      render(<OrderStatusBadge status="pending" createdAt={baseCreatedAt} />);

      expect(screen.getByText(/agora/)).toBeInTheDocument();
    });

    it('mostra tempo em minutos para pedidos recentes', () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60000).toISOString();
      render(<OrderStatusBadge status="pending" createdAt={tenMinutesAgo} />);

      expect(screen.getByText(/10min/)).toBeInTheDocument();
    });

    it('mostra tempo em horas para pedidos antigos', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60000).toISOString();
      render(<OrderStatusBadge status="preparing" createdAt={twoHoursAgo} />);

      expect(screen.getByText(/2h/)).toBeInTheDocument();
    });

    it('não mostra tempo quando showTime é false', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
      render(
        <OrderStatusBadge
          status="pending"
          createdAt={fiveMinutesAgo}
          showTime={false}
        />
      );

      expect(screen.queryByText(/5min/)).not.toBeInTheDocument();
    });
  });

  describe('Tamanhos', () => {
    it('aplica tamanho md por defeito', () => {
      const { container } = render(
        <OrderStatusBadge status="pending" createdAt={baseCreatedAt} />
      );

      const badge = container.querySelector('span');
      expect(badge?.className).toContain('px-3');
      expect(badge?.className).toContain('py-1');
      expect(badge?.className).toContain('text-sm');
    });

    it('aplica tamanho sm quando especificado', () => {
      const { container } = render(
        <OrderStatusBadge status="pending" createdAt={baseCreatedAt} size="sm" />
      );

      const badge = container.querySelector('span');
      expect(badge?.className).toContain('px-2');
      expect(badge?.className).toContain('text-xs');
    });

    it('aplica tamanho lg quando especificado', () => {
      const { container } = render(
        <OrderStatusBadge status="pending" createdAt={baseCreatedAt} size="lg" />
      );

      const badge = container.querySelector('span');
      expect(badge?.className).toContain('px-4');
      expect(badge?.className).toContain('text-base');
    });
  });
});

/**
 * Component Tests: ConfirmDialog
 * Tests for the ConfirmDialog UI component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '../../helpers/test-utils';
import React from 'react';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Confirmar ação',
    message: 'Tem a certeza que deseja continuar?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Renderização', () => {
    it('não renderiza quando isOpen é false', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Confirmar ação')).not.toBeInTheDocument();
      expect(screen.queryByText('Tem a certeza que deseja continuar?')).not.toBeInTheDocument();
    });

    it('renderiza título e mensagem quando aberto', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByText('Confirmar ação')).toBeInTheDocument();
      expect(screen.getByText('Tem a certeza que deseja continuar?')).toBeInTheDocument();
    });

    it('renderiza textos padrão dos botões (Confirmar e Cancelar)', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    });

    it('renderiza textos personalizados dos botões', () => {
      render(
        <ConfirmDialog
          {...defaultProps}
          confirmText="Sim, apagar"
          cancelText="Não, voltar"
        />
      );

      expect(screen.getByRole('button', { name: 'Sim, apagar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Não, voltar' })).toBeInTheDocument();
    });

    it('renderiza com role alertdialog e atributos de acessibilidade', () => {
      render(<ConfirmDialog {...defaultProps} />);

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'dialog-description');
    });
  });

  describe('Variantes', () => {
    it('renderiza variante danger com estilos vermelhos no botão de confirmação', () => {
      render(<ConfirmDialog {...defaultProps} variant="danger" />);

      const confirmButton = screen.getByRole('button', { name: 'Confirmar' });
      expect(confirmButton.className).toContain('bg-red-600');
    });

    it('renderiza variante warning com estilos amarelos no botão de confirmação', () => {
      render(<ConfirmDialog {...defaultProps} variant="warning" />);

      const confirmButton = screen.getByRole('button', { name: 'Confirmar' });
      expect(confirmButton.className).toContain('bg-yellow-600');
    });

    it('renderiza variante info com estilos azuis no botão de confirmação', () => {
      render(<ConfirmDialog {...defaultProps} variant="info" />);

      const confirmButton = screen.getByRole('button', { name: 'Confirmar' });
      expect(confirmButton.className).toContain('bg-blue-600');
    });

    it('usa variante danger por defeito', () => {
      render(<ConfirmDialog {...defaultProps} />);

      const confirmButton = screen.getByRole('button', { name: 'Confirmar' });
      expect(confirmButton.className).toContain('bg-red-600');
    });
  });

  describe('Interações', () => {
    it('chama onConfirm ao clicar no botão de confirmação', () => {
      render(<ConfirmDialog {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('chama onCancel ao clicar no botão de cancelar', () => {
      render(<ConfirmDialog {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('chama onCancel ao clicar no backdrop', () => {
      render(<ConfirmDialog {...defaultProps} />);

      // The backdrop is the div with aria-hidden="true"
      const backdrop = document.querySelector('[aria-hidden="true"]');
      expect(backdrop).not.toBeNull();
      fireEvent.click(backdrop!);

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('chama onCancel ao pressionar Escape', () => {
      render(<ConfirmDialog {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Comportamento do body', () => {
    it('bloqueia scroll do body quando aberto', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restaura scroll do body quando fechado', () => {
      const { unmount } = render(<ConfirmDialog {...defaultProps} />);

      unmount();

      expect(document.body.style.overflow).toBe('');
    });
  });
});

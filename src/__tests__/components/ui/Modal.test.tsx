/**
 * Component Tests: Modal
 * Tests for the Modal UI component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '../../helpers/test-utils';
import React from 'react';
import { Modal } from '@/presentation/components/ui/Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Título do Modal',
    children: <p>Conteúdo do modal</p>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Renderização', () => {
    it('não renderiza quando isOpen é false', () => {
      render(
        <Modal {...defaultProps} isOpen={false}>
          <p>Conteúdo do modal</p>
        </Modal>
      );

      expect(screen.queryByText('Título do Modal')).not.toBeInTheDocument();
      expect(screen.queryByText('Conteúdo do modal')).not.toBeInTheDocument();
    });

    it('renderiza children quando aberto', () => {
      render(
        <Modal {...defaultProps}>
          <p>Conteúdo do modal</p>
        </Modal>
      );

      expect(screen.getByText('Conteúdo do modal')).toBeInTheDocument();
    });

    it('renderiza o título quando fornecido', () => {
      render(
        <Modal {...defaultProps}>
          <p>Conteúdo</p>
        </Modal>
      );

      expect(screen.getByText('Título do Modal')).toBeInTheDocument();
    });

    it('não renderiza header quando título não é fornecido', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Conteúdo sem título</p>
        </Modal>
      );

      expect(screen.getByText('Conteúdo sem título')).toBeInTheDocument();
      // No close button in header when no title
      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBe(0);
    });

    it('renderiza botão de fechar (X) quando título é fornecido', () => {
      render(
        <Modal {...defaultProps}>
          <p>Conteúdo</p>
        </Modal>
      );

      // The close button contains an SVG with an X path
      const closeButton = document.querySelector('button svg');
      expect(closeButton).not.toBeNull();
    });
  });

  describe('Tamanhos', () => {
    it('aplica tamanho md por defeito', () => {
      render(
        <Modal {...defaultProps}>
          <p>Conteúdo</p>
        </Modal>
      );

      const modalContent = document.querySelector('.max-w-md');
      expect(modalContent).not.toBeNull();
    });

    it('aplica tamanho sm quando especificado', () => {
      render(
        <Modal {...defaultProps} size="sm">
          <p>Conteúdo</p>
        </Modal>
      );

      const modalContent = document.querySelector('.max-w-sm');
      expect(modalContent).not.toBeNull();
    });

    it('aplica tamanho lg quando especificado', () => {
      render(
        <Modal {...defaultProps} size="lg">
          <p>Conteúdo</p>
        </Modal>
      );

      const modalContent = document.querySelector('.max-w-lg');
      expect(modalContent).not.toBeNull();
    });

    it('aplica tamanho xl quando especificado', () => {
      render(
        <Modal {...defaultProps} size="xl">
          <p>Conteúdo</p>
        </Modal>
      );

      const modalContent = document.querySelector('.max-w-xl');
      expect(modalContent).not.toBeNull();
    });
  });

  describe('Interações', () => {
    it('chama onClose ao clicar no backdrop', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} title="Test">
          <p>Conteúdo</p>
        </Modal>
      );

      // The backdrop is the div with bg-black/70 class
      const backdrop = document.querySelector('.bg-black\\/70');
      expect(backdrop).not.toBeNull();
      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('chama onClose ao clicar no botão X', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} title="Test">
          <p>Conteúdo</p>
        </Modal>
      );

      // Find the button that contains the SVG close icon
      const buttons = screen.getAllByRole('button');
      // The close button is the one in the header
      const closeButton = buttons[0];
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('chama onClose ao pressionar Escape', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} title="Test">
          <p>Conteúdo</p>
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Comportamento do body', () => {
    it('bloqueia scroll do body quando aberto', () => {
      render(
        <Modal {...defaultProps}>
          <p>Conteúdo</p>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restaura scroll do body quando fechado', () => {
      const { unmount } = render(
        <Modal {...defaultProps}>
          <p>Conteúdo</p>
        </Modal>
      );

      unmount();

      expect(document.body.style.overflow).toBe('unset');
    });
  });
});

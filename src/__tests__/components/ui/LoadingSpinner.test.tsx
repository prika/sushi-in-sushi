/**
 * Component Tests: LoadingSpinner
 * Tests for the LoadingSpinner UI component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../helpers/test-utils';
import React from 'react';
import { LoadingSpinner } from '@/presentation/components/ui/LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Renderização básica', () => {
    it('renderiza o spinner element', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).not.toBeNull();
    });

    it('renderiza com classes rounded-full e border-t-transparent', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner?.className).toContain('rounded-full');
      expect(spinner?.className).toContain('border-t-transparent');
    });
  });

  describe('Texto', () => {
    it('renderiza texto quando fornecido', () => {
      render(<LoadingSpinner text="A carregar..." />);

      expect(screen.getByText('A carregar...')).toBeInTheDocument();
    });

    it('não renderiza texto quando não fornecido', () => {
      const { container } = render(<LoadingSpinner />);

      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs.length).toBe(0);
    });
  });

  describe('Tamanhos', () => {
    it('aplica tamanho md por defeito', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner?.className).toContain('w-8');
      expect(spinner?.className).toContain('h-8');
    });

    it('aplica tamanho sm quando especificado', () => {
      const { container } = render(<LoadingSpinner size="sm" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner?.className).toContain('w-5');
      expect(spinner?.className).toContain('h-5');
    });

    it('aplica tamanho lg quando especificado', () => {
      const { container } = render(<LoadingSpinner size="lg" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner?.className).toContain('w-12');
      expect(spinner?.className).toContain('h-12');
    });
  });

  describe('Cores', () => {
    it('aplica cor primary por defeito', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner?.className).toContain('border-[#D4AF37]');
    });

    it('aplica cor white quando especificado', () => {
      const { container } = render(<LoadingSpinner color="white" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner?.className).toContain('border-white');
    });

    it('aplica cor gray quando especificado', () => {
      const { container } = render(<LoadingSpinner color="gray" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner?.className).toContain('border-gray-600');
    });

    it('aplica text-white no texto quando cor é white', () => {
      render(<LoadingSpinner color="white" text="Loading" />);

      const text = screen.getByText('Loading');
      expect(text.className).toContain('text-white');
    });

    it('aplica text-gray-600 no texto quando cor não é white', () => {
      render(<LoadingSpinner color="primary" text="Loading" />);

      const text = screen.getByText('Loading');
      expect(text.className).toContain('text-gray-600');
    });
  });

  describe('Fullscreen', () => {
    it('não é fullscreen por defeito', () => {
      const { container } = render(<LoadingSpinner />);

      const fullscreenOverlay = container.querySelector('.fixed.inset-0');
      expect(fullscreenOverlay).toBeNull();
    });

    it('renderiza overlay fullscreen quando fullscreen é true', () => {
      const { container } = render(<LoadingSpinner fullscreen={true} />);

      const fullscreenOverlay = container.querySelector('.fixed');
      expect(fullscreenOverlay).not.toBeNull();
      expect(fullscreenOverlay?.className).toContain('inset-0');
      expect(fullscreenOverlay?.className).toContain('z-50');
      expect(fullscreenOverlay?.className).toContain('bg-black/50');
    });

    it('renderiza spinner dentro do overlay fullscreen', () => {
      const { container } = render(<LoadingSpinner fullscreen={true} text="A carregar..." />);

      const overlay = container.querySelector('.fixed');
      expect(overlay).not.toBeNull();

      const spinner = overlay?.querySelector('.animate-spin');
      expect(spinner).not.toBeNull();
      expect(screen.getByText('A carregar...')).toBeInTheDocument();
    });
  });
});

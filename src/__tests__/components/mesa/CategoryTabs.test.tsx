/**
 * Component Tests: CategoryTabs
 * Tests for the CategoryTabs component used in mesa (table) ordering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../helpers/test-utils';
import React from 'react';
import { CategoryTabs } from '@/presentation/components/products/CategoryTabs';

const mockCategories = [
  { id: 'cat-1', name: 'Sushi', slug: 'sushi', icon: '🍣' },
  { id: 'cat-2', name: 'Sashimi', slug: 'sashimi', icon: '🐟' },
  { id: 'cat-3', name: 'Temaki', slug: 'temaki', icon: '🌯' },
  { id: 'cat-4', name: 'Bebidas', slug: 'bebidas', icon: '🍹' },
];

const categoriesWithoutIcons = [
  { id: 'cat-1', name: 'Sushi', slug: 'sushi' },
  { id: 'cat-2', name: 'Sashimi', slug: 'sashimi' },
];

describe('CategoryTabs', () => {
  const defaultProps = {
    categories: mockCategories,
    activeId: null as string | null,
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Renderização', () => {
    it('renderiza todos os nomes de categorias', () => {
      render(<CategoryTabs {...defaultProps} />);

      expect(screen.getByText('Sushi')).toBeInTheDocument();
      expect(screen.getByText('Sashimi')).toBeInTheDocument();
      expect(screen.getByText('Temaki')).toBeInTheDocument();
      expect(screen.getByText('Bebidas')).toBeInTheDocument();
    });

    it('renderiza ícones das categorias quando fornecidos', () => {
      render(<CategoryTabs {...defaultProps} />);

      expect(screen.getByText('🍣')).toBeInTheDocument();
      expect(screen.getByText('🐟')).toBeInTheDocument();
      expect(screen.getByText('🌯')).toBeInTheDocument();
      expect(screen.getByText('🍹')).toBeInTheDocument();
    });

    it('renderiza sem ícones quando categorias não têm ícone', () => {
      render(
        <CategoryTabs
          categories={categoriesWithoutIcons}
          activeId={null}
          onSelect={vi.fn()}
        />
      );

      expect(screen.getByText('Sushi')).toBeInTheDocument();
      expect(screen.getByText('Sashimi')).toBeInTheDocument();
    });

    it('renderiza botões para cada categoria', () => {
      render(<CategoryTabs {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(mockCategories.length);
    });

    it('lida com lista vazia de categorias', () => {
      render(
        <CategoryTabs categories={[]} activeId={null} onSelect={vi.fn()} />
      );

      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBe(0);
    });
  });

  describe('Estado ativo', () => {
    it('destaca a categoria selecionada com variante default', () => {
      render(<CategoryTabs {...defaultProps} activeId="cat-1" />);

      const buttons = screen.getAllByRole('button');
      const activeButton = buttons[0]; // Sushi
      const inactiveButton = buttons[1]; // Sashimi

      // Active tab in default variant has gold styles
      expect(activeButton.className).toContain('bg-[#D4AF37]/10');
      expect(activeButton.className).toContain('text-[#D4AF37]');
      expect(activeButton.className).toContain('border-[#D4AF37]');

      // Inactive tab has different styles
      expect(inactiveButton.className).toContain('bg-white');
      expect(inactiveButton.className).toContain('text-gray-700');
    });

    it('nenhuma tab destacada quando activeId é null', () => {
      render(<CategoryTabs {...defaultProps} activeId={null} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        // All should have inactive styles
        expect(button.className).toContain('bg-white');
        expect(button.className).toContain('text-gray-700');
      });
    });
  });

  describe('Variantes', () => {
    it('aplica estilos da variante pills', () => {
      render(
        <CategoryTabs {...defaultProps} activeId="cat-1" variant="pills" />
      );

      const buttons = screen.getAllByRole('button');
      const activeButton = buttons[0];
      const inactiveButton = buttons[1];

      expect(activeButton.className).toContain('bg-[#D4AF37]');
      expect(activeButton.className).toContain('text-black');
      expect(inactiveButton.className).toContain('bg-gray-100');
      expect(inactiveButton.className).toContain('text-gray-700');
    });

    it('aplica estilos da variante underline', () => {
      render(
        <CategoryTabs {...defaultProps} activeId="cat-1" variant="underline" />
      );

      const buttons = screen.getAllByRole('button');
      const activeButton = buttons[0];
      const inactiveButton = buttons[1];

      expect(activeButton.className).toContain('text-[#D4AF37]');
      expect(activeButton.className).toContain('border-[#D4AF37]');
      expect(inactiveButton.className).toContain('text-gray-600');
      expect(inactiveButton.className).toContain('border-transparent');
    });
  });

  describe('Interações', () => {
    it('chama onSelect com o ID da categoria ao clicar', () => {
      const onSelect = vi.fn();
      render(
        <CategoryTabs
          categories={mockCategories}
          activeId={null}
          onSelect={onSelect}
        />
      );

      fireEvent.click(screen.getByText('Sashimi'));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith('cat-2');
    });

    it('chama onSelect ao clicar na categoria já ativa', () => {
      const onSelect = vi.fn();
      render(
        <CategoryTabs
          categories={mockCategories}
          activeId="cat-1"
          onSelect={onSelect}
        />
      );

      fireEvent.click(screen.getByText('Sushi'));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith('cat-1');
    });

    it('chama onSelect com IDs diferentes ao clicar em tabs diferentes', () => {
      const onSelect = vi.fn();
      render(
        <CategoryTabs
          categories={mockCategories}
          activeId={null}
          onSelect={onSelect}
        />
      );

      fireEvent.click(screen.getByText('Sushi'));
      fireEvent.click(screen.getByText('Bebidas'));

      expect(onSelect).toHaveBeenCalledTimes(2);
      expect(onSelect).toHaveBeenNthCalledWith(1, 'cat-1');
      expect(onSelect).toHaveBeenNthCalledWith(2, 'cat-4');
    });
  });
});

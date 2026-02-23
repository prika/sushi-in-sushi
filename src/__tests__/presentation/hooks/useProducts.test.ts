import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useProducts } from '@/presentation/hooks/useProducts';
import { useDependencies } from '@/presentation/contexts/DependencyContext';
import { Product } from '@/domain/entities/Product';
import { CategoryWithCount } from '@/domain/entities/Category';

// Mock do DependencyContext
vi.mock('@/presentation/contexts/DependencyContext', () => ({
  useDependencies: vi.fn(),
}));

describe('useProducts', () => {
  let mockProductRepository: any;
  let mockCategoryRepository: any;
  let mockProducts: Product[];
  let mockCategories: CategoryWithCount[];

  beforeEach(() => {
    mockProducts = [
      {
        id: '1',
        name: 'Sushi Salmão',
        description: 'Sushi de salmão fresco',
        price: 5.5,
        categoryId: 'cat1',
        imageUrl: null,
        imageUrls: [],
        isAvailable: true,
        isRodizio: true,
        sortOrder: 1,
        serviceModes: [],
        servicePrices: {},
        ingredients: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Sushi Atum',
        description: 'Sushi de atum',
        price: 6.0,
        categoryId: 'cat1',
        imageUrl: null,
        imageUrls: [],
        isAvailable: true,
        isRodizio: true,
        sortOrder: 2,
        serviceModes: [],
        servicePrices: {},
        ingredients: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        name: 'Temaki Salmão',
        description: 'Temaki de salmão',
        price: 7.5,
        categoryId: 'cat2',
        imageUrl: null,
        imageUrls: [],
        isAvailable: false,
        isRodizio: false,
        sortOrder: 3,
        serviceModes: [],
        servicePrices: {},
        ingredients: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockCategories = [
      {
        id: 'cat1',
        name: 'Sushi',
        slug: 'sushi',
        icon: null,
        sortOrder: 1,
        zoneId: null,
        createdAt: new Date(),
        productCount: 2,
      },
      {
        id: 'cat2',
        name: 'Temaki',
        slug: 'temaki',
        icon: null,
        sortOrder: 2,
        zoneId: null,
        createdAt: new Date(),
        productCount: 1,
      },
    ];

    mockProductRepository = {
      findAll: vi.fn().mockResolvedValue(mockProducts),
    };

    mockCategoryRepository = {
      findAllWithCount: vi.fn().mockResolvedValue(mockCategories),
    };

    vi.mocked(useDependencies).mockReturnValue({
      productRepository: mockProductRepository,
      categoryRepository: mockCategoryRepository,
    } as any);
  });

  it('deve carregar produtos e categorias na montagem', async () => {
    const { result } = renderHook(() => useProducts());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.products).toEqual(mockProducts);
    expect(result.current.categories).toEqual(mockCategories);
  });

  it('deve filtrar apenas produtos disponíveis por padrão', async () => {
    const availableProducts = mockProducts.filter((p) => p.isAvailable);
    mockProductRepository.findAll.mockResolvedValue(availableProducts);

    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockProductRepository.findAll).toHaveBeenCalledWith({
      onlyAvailable: true,
      onlyRodizio: undefined,
    });
  });

  it('deve respeitar opção onlyAvailable: false', async () => {
    const { result } = renderHook(() => useProducts({ onlyAvailable: false }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockProductRepository.findAll).toHaveBeenCalledWith({
      onlyAvailable: false,
      onlyRodizio: undefined,
    });
  });

  it('deve filtrar produtos de rodízio quando especificado', async () => {
    const rodizioProducts = mockProducts.filter((p) => p.isRodizio);
    mockProductRepository.findAll.mockResolvedValue(rodizioProducts);

    const { result } = renderHook(() => useProducts({ onlyRodizio: true }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockProductRepository.findAll).toHaveBeenCalledWith({
      onlyAvailable: true,
      onlyRodizio: true,
    });
  });

  it('deve agrupar produtos por categoria', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.productsByCategory).toEqual({
      cat1: mockProducts.filter((p) => p.categoryId === 'cat1'),
      cat2: mockProducts.filter((p) => p.categoryId === 'cat2'),
    });
  });

  it('deve filtrar produtos por categoria selecionada', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.selectCategory('cat1');
    });

    expect(result.current.selectedCategoryId).toBe('cat1');
    expect(result.current.filteredProducts).toEqual(
      mockProducts.filter((p) => p.categoryId === 'cat1')
    );
  });

  it('deve filtrar produtos por pesquisa (nome)', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSearchQuery('Atum');
    });

    expect(result.current.searchQuery).toBe('Atum');
    expect(result.current.filteredProducts).toEqual([mockProducts[1]]);
  });

  it('deve filtrar produtos por pesquisa (descrição)', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSearchQuery('fresco');
    });

    expect(result.current.filteredProducts).toEqual([mockProducts[0]]);
  });

  it('deve filtrar produtos por categoria E pesquisa', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.selectCategory('cat1');
      result.current.setSearchQuery('Atum');
    });

    expect(result.current.filteredProducts).toEqual([mockProducts[1]]);
  });

  it('deve limpar filtro de categoria', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.selectCategory('cat1');
    });

    expect(result.current.filteredProducts).toHaveLength(2);

    act(() => {
      result.current.selectCategory(null);
    });

    expect(result.current.selectedCategoryId).toBeNull();
    expect(result.current.filteredProducts).toEqual(mockProducts);
  });

  it('deve retornar produto por ID', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const product = result.current.getProduct('2');
    expect(product).toEqual(mockProducts[1]);
  });

  it('deve retornar undefined para produto inexistente', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const product = result.current.getProduct('999');
    expect(product).toBeUndefined();
  });

  it('deve retornar categoria por ID', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const category = result.current.getCategory('cat1');
    expect(category).toEqual(mockCategories[0]);
  });

  it('deve retornar undefined para categoria inexistente', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const category = result.current.getCategory('cat999');
    expect(category).toBeUndefined();
  });

  it('deve permitir refresh manual dos dados', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockProductRepository.findAll).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockProductRepository.findAll).toHaveBeenCalledTimes(2);
  });

  it('deve lidar com erro no carregamento', async () => {
    mockProductRepository.findAll.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.products).toEqual([]);
  });

  it('deve usar categoria inicial se especificada', async () => {
    const { result } = renderHook(() =>
      useProducts({ initialCategoryId: 'cat2' })
    );

    expect(result.current.selectedCategoryId).toBe('cat2');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.filteredProducts).toEqual(
      mockProducts.filter((p) => p.categoryId === 'cat2')
    );
  });

  it('deve retornar categoriesWithCount', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.categoriesWithCount).toEqual(mockCategories);
  });

  it('deve pesquisa ser case-insensitive', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSearchQuery('SUSHI');
    });

    expect(result.current.filteredProducts).toHaveLength(2);
  });

  it('deve manter funções estáveis entre re-renders', async () => {
    const { result, rerender } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstSelectCategory = result.current.selectCategory;
    const firstSetSearchQuery = result.current.setSearchQuery;
    const firstGetProduct = result.current.getProduct;
    const firstGetCategory = result.current.getCategory;

    rerender();

    expect(result.current.selectCategory).toBe(firstSelectCategory);
    expect(result.current.setSearchQuery).toBe(firstSetSearchQuery);
    expect(result.current.getProduct).toBe(firstGetProduct);
    expect(result.current.getCategory).toBe(firstGetCategory);
  });
});

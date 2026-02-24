/**
 * Product Entity
 * Representa um produto/item do menu no domínio
 */
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  categoryId: string;
  /** Primary image (first of imageUrls or legacy single image) */
  imageUrl: string | null;
  /** All image URLs; first is primary */
  imageUrls: string[];
  isAvailable: boolean;
  isRodizio: boolean;
  sortOrder: number;
  /** Service modes: "delivery", "takeaway", "dine_in" */
  serviceModes: string[];
  /** Per-service-mode price overrides. Keys match serviceModes values. */
  servicePrices: Record<string, number>;
  /** Number of pieces in this product */
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dados para criar um novo produto
 */
export interface CreateProductData {
  name: string;
  description?: string | null;
  price: number;
  categoryId: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  isAvailable?: boolean;
  isRodizio?: boolean;
  sortOrder?: number;
  quantity?: number;
  serviceModes?: string[];
  servicePrices?: Record<string, number>;
}

/**
 * Dados para atualizar um produto
 */
export interface UpdateProductData {
  name?: string;
  description?: string | null;
  price?: number;
  categoryId?: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  isAvailable?: boolean;
  isRodizio?: boolean;
  sortOrder?: number;
  quantity?: number;
  serviceModes?: string[];
  servicePrices?: Record<string, number>;
}

/**
 * Product com informações da categoria
 */
export interface ProductWithCategory extends Product {
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
  };
}

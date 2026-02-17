/**
 * Product Entity
 * Representa um produto/item do menu no domínio
 */

/**
 * Entidade Product - Representa um item do menu
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
  /**
   * Integração com Vendus - identificador do produto no Vendus
   */
  vendusProductId: string | null;
  /**
   * Integração com Vendus - SKU/código do produto no Vendus
   */
  vendusSku: string | null;
  /**
   * Estado de sincronização com o Vendus
   */
  vendusSyncStatus: VendusSyncStatus;
  /**
   * Data/hora da última sincronização bem sucedida com o Vendus
   */
  vendusLastSyncedAt: Date | null;
  /**
   * Controla se o produto aparece no menu online (QR code)
   */
  isVisibleOnline: boolean;
  /**
   * Nome “bonito” para o canal online (pode diferir do nome fiscal)
   */
  onlineName: string | null;
  /**
   * Descrição específica para o canal online
   */
  onlineDescription: string | null;
  /**
   * Imagem específica para o canal online (pode diferir da imagem principal)
   */
  onlineImageUrl: string | null;
  /**
   * Ordem de apresentação no menu online
   */
  onlineSortOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export type VendusSyncStatus = 'never_synced' | 'in_sync' | 'out_of_sync' | 'sync_error';

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
  vendusProductId?: string | null;
  vendusSku?: string | null;
  vendusSyncStatus?: VendusSyncStatus;
  vendusLastSyncedAt?: Date | null;
  isVisibleOnline?: boolean;
  onlineName?: string | null;
  onlineDescription?: string | null;
  onlineImageUrl?: string | null;
  onlineSortOrder?: number | null;
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
  vendusProductId?: string | null;
  vendusSku?: string | null;
  vendusSyncStatus?: VendusSyncStatus;
  vendusLastSyncedAt?: Date | null;
  isVisibleOnline?: boolean;
  onlineName?: string | null;
  onlineDescription?: string | null;
  onlineImageUrl?: string | null;
  onlineSortOrder?: number | null;
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

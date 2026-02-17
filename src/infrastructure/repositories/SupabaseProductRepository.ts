/**
 * SupabaseProductRepository - Implementação Supabase do repositório de produtos
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  IProductRepository,
  ProductFilter,
} from '@/domain/repositories/IProductRepository';
import {
  Product,
  CreateProductData,
  UpdateProductData,
  ProductWithCategory,
  VendusSyncStatus,
} from '@/domain/entities/Product';

/**
 * Tipo do registo da base de dados
 */
interface DatabaseProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string;
  image_url: string | null;
  image_urls: string[] | null;
  is_available: boolean;
  is_rodizio: boolean;
  sort_order: number;
  vendus_product_id: string | null;
  vendus_sku: string | null;
  vendus_sync_status: VendusSyncStatus | null;
  vendus_last_synced_at: string | null;
  is_visible_online: boolean | null;
  online_name: string | null;
  online_description: string | null;
  online_image_url: string | null;
  online_sort_order: number | null;
  created_at: string;
  updated_at?: string; // optional: products table may not have this column
}

/**
 * Implementação Supabase do repositório de produtos
 */
export class SupabaseProductRepository implements IProductRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findById(id: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByIdWithCategory(id: string): Promise<ProductWithCategory | null> {
    const { data, error } = await this.supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, slug, icon)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomainWithCategory(data);
  }

  async findAll(filter?: ProductFilter): Promise<Product[]> {
    let query = this.supabase.from('products').select('*');

    if (filter?.categoryId) {
      query = query.eq('category_id', filter.categoryId);
    }

    if (filter?.onlyAvailable) {
      query = query.eq('is_available', true);
    }

    if (filter?.onlyRodizio !== undefined) {
      query = query.eq('is_rodizio', filter.onlyRodizio);
    }

    const { data, error } = await query.order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);

    let products = (data || []).map((d) => this.toDomain(d));

    // Filtrar por pesquisa se necessário
    if (filter?.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    return products;
  }

  async findAllWithCategory(filter?: ProductFilter): Promise<ProductWithCategory[]> {
    let query = this.supabase.from('products').select(`
      *,
      category:categories(id, name, slug, icon)
    `);

    if (filter?.categoryId) {
      query = query.eq('category_id', filter.categoryId);
    }

    if (filter?.onlyAvailable) {
      query = query.eq('is_available', true);
    }

    if (filter?.onlyRodizio !== undefined) {
      query = query.eq('is_rodizio', filter.onlyRodizio);
    }

    const { data, error } = await query.order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);

    let products = (data || []).map((d) => this.toDomainWithCategory(d));

    if (filter?.searchQuery) {
      const searchQuery = filter.searchQuery.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery) ||
          p.description?.toLowerCase().includes(searchQuery)
      );
    }

    return products;
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    return this.findAll({ categoryId });
  }

  async search(query: string): Promise<Product[]> {
    return this.findAll({ searchQuery: query, onlyAvailable: true });
  }

  async findByVendusProductId(vendusProductId: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('vendus_product_id', vendusProductId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return this.toDomain(data as DatabaseProduct);
  }

  async markProductsSynced(products: Product[], syncedAt: Date): Promise<void> {
    if (products.length === 0) {
      return;
    }

    const ids = products.map((p) => p.id);
    const { error } = await this.supabase
      .from('products')
      .update({
        vendus_sync_status: 'in_sync' as VendusSyncStatus,
        vendus_last_synced_at: syncedAt.toISOString(),
      })
      .in('id', ids);

    if (error) {
      throw new Error(error.message);
    }
  }

  async create(data: CreateProductData): Promise<Product> {
    const imageUrls = data.imageUrls ?? (data.imageUrl ? [data.imageUrl] : []);
    const firstImage = imageUrls[0] ?? data.imageUrl ?? null;
    const { data: product, error } = await this.supabase
      .from('products')
      .insert({
        name: data.name,
        description: data.description || null,
        price: data.price,
        category_id: data.categoryId,
        image_url: firstImage,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        is_available: data.isAvailable ?? true,
        is_rodizio: data.isRodizio ?? false,
        sort_order: data.sortOrder ?? 0,
        vendus_product_id: data.vendusProductId ?? null,
        vendus_sku: data.vendusSku ?? null,
        vendus_sync_status: data.vendusSyncStatus ?? 'never_synced',
        vendus_last_synced_at: data.vendusLastSyncedAt
          ? data.vendusLastSyncedAt.toISOString()
          : null,
        is_visible_online: data.isVisibleOnline ?? false,
        online_name: data.onlineName ?? null,
        online_description: data.onlineDescription ?? null,
        online_image_url: data.onlineImageUrl ?? null,
        online_sort_order: data.onlineSortOrder ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(product);
  }

  async update(id: string, data: UpdateProductData): Promise<Product> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
    if (data.imageUrls !== undefined) {
      updateData.image_urls = data.imageUrls.length > 0 ? data.imageUrls : null;
      updateData.image_url = data.imageUrls[0] ?? null;
    } else if (data.imageUrl !== undefined) {
      updateData.image_url = data.imageUrl;
    }
    if (data.isAvailable !== undefined) updateData.is_available = data.isAvailable;
    if (data.isRodizio !== undefined) updateData.is_rodizio = data.isRodizio;
    if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;
    if (data.vendusProductId !== undefined) {
      updateData.vendus_product_id = data.vendusProductId;
    }
    if (data.vendusSku !== undefined) {
      updateData.vendus_sku = data.vendusSku;
    }
    if (data.vendusSyncStatus !== undefined) {
      updateData.vendus_sync_status = data.vendusSyncStatus;
    }
    if (data.vendusLastSyncedAt !== undefined) {
      updateData.vendus_last_synced_at =
        data.vendusLastSyncedAt !== null ? data.vendusLastSyncedAt.toISOString() : null;
    }
    if (data.isVisibleOnline !== undefined) {
      updateData.is_visible_online = data.isVisibleOnline;
    }
    if (data.onlineName !== undefined) {
      updateData.online_name = data.onlineName;
    }
    if (data.onlineDescription !== undefined) {
      updateData.online_description = data.onlineDescription;
    }
    if (data.onlineImageUrl !== undefined) {
      updateData.online_image_url = data.onlineImageUrl;
    }
    if (data.onlineSortOrder !== undefined) {
      updateData.online_sort_order = data.onlineSortOrder;
    }

    const { data: product, error } = await this.supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!product) throw new Error('Produto não encontrado ou sem permissão para atualizar');
    return this.toDomain(product);
  }

  async updateAvailability(id: string, isAvailable: boolean): Promise<Product> {
    return this.update(id, { isAvailable });
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('products').delete().eq('id', id);

    if (error) throw new Error(error.message);
  }

  /**
   * Converte registo da BD para entidade de domínio
   */
  private toDomain(data: DatabaseProduct): Product {
    const imageUrls = data.image_urls?.length
      ? data.image_urls
      : data.image_url
        ? [data.image_url]
        : [];
    const imageUrl = imageUrls[0] ?? data.image_url ?? null;
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      categoryId: data.category_id,
      imageUrl,
      imageUrls,
      isAvailable: data.is_available,
      isRodizio: data.is_rodizio,
      sortOrder: data.sort_order,
      vendusProductId: data.vendus_product_id ?? null,
      vendusSku: data.vendus_sku ?? null,
      vendusSyncStatus: data.vendus_sync_status ?? 'never_synced',
      vendusLastSyncedAt: data.vendus_last_synced_at
        ? new Date(data.vendus_last_synced_at)
        : null,
      isVisibleOnline: data.is_visible_online ?? false,
      onlineName: data.online_name ?? null,
      onlineDescription: data.online_description ?? null,
      onlineImageUrl: data.online_image_url ?? null,
      onlineSortOrder: data.online_sort_order ?? null,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(data.created_at),
    };
  }

  /**
   * Converte registo com categoria para entidade de domínio
   */
  private toDomainWithCategory(
    data: DatabaseProduct & {
      category: { id: string; name: string; slug: string; icon: string | null } | null;
    }
  ): ProductWithCategory {
    return {
      ...this.toDomain(data),
      category: data.category
        ? {
            id: data.category.id,
            name: data.category.name,
            slug: data.category.slug,
            icon: data.category.icon,
          }
        : { id: '', name: 'Sem categoria', slug: '', icon: null },
    };
  }
}

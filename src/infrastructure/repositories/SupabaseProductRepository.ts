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
  service_modes: string[] | null;
  service_prices: Record<string, number> | null;
  quantity: number | null;
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
        quantity: data.quantity ?? 1,
        service_modes: data.serviceModes ?? [],
        service_prices: data.servicePrices ?? {},
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
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.serviceModes !== undefined) updateData.service_modes = data.serviceModes;
    if (data.servicePrices !== undefined) updateData.service_prices = data.servicePrices;

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
      quantity: data.quantity ?? 1,
      serviceModes: data.service_modes ?? [],
      servicePrices: data.service_prices ?? {},
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

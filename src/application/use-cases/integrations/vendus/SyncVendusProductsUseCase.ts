/**
 * SyncVendusProductsUseCase - Sincroniza produtos do Vendus para o domínio
 */

import { IProductRepository } from '@/domain/repositories/IProductRepository';
import { IVendusIntegrationService, VendusProductDTO } from '@/application/ports/IVendusIntegrationService';
import { Result, Results } from '@/application/use-cases/Result';
import { Product, VendusSyncStatus } from '@/domain/entities/Product';

export interface SyncVendusProductsInput {
  dryRun?: boolean;
}

export interface SyncVendusProductsSummary {
  created: number;
  updated: number;
  skipped: number;
}

export class SyncVendusProductsUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly vendusService: IVendusIntegrationService,
  ) {}

  async execute(input: SyncVendusProductsInput = {}): Promise<Result<SyncVendusProductsSummary>> {
    const vendusProductsResult = await this.vendusService.listProducts();

    if (!vendusProductsResult.success) {
      return Results.error<SyncVendusProductsSummary>(
        'Erro ao obter produtos do Vendus',
        'VENDUS_PRODUCTS_ERROR',
      );
    }

    const vendusProducts = vendusProductsResult.data;

    let created = 0;
    let updated = 0;
    let skipped = 0;

    const syncedProducts: Product[] = [];
    const now = new Date();

    for (const vp of vendusProducts) {
      const existing = await this.productRepository.findByVendusProductId(vp.id);

      if (!existing) {
        if (!input.dryRun) {
          const productToCreate: Product = {
            id: '',
            name: vp.name,
            description: null,
            price: vp.unitPrice,
            categoryId: '',
            imageUrl: null,
            imageUrls: [],
            isAvailable: vp.isActive,
            isRodizio: false,
            sortOrder: 0,
            vendusProductId: vp.id,
            vendusSku: vp.sku,
            vendusSyncStatus: this.getSyncStatusFromVendus(vp),
            vendusLastSyncedAt: now,
            isVisibleOnline: false,
            onlineName: null,
            onlineDescription: null,
            onlineImageUrl: null,
            onlineSortOrder: null,
            createdAt: now,
            updatedAt: now,
          };

          const createdProduct = await this.productRepository.create({
            name: productToCreate.name,
            description: productToCreate.description,
            price: productToCreate.price,
            categoryId: productToCreate.categoryId,
            imageUrl: productToCreate.imageUrl,
            imageUrls: productToCreate.imageUrls,
            isAvailable: productToCreate.isAvailable,
            isRodizio: productToCreate.isRodizio,
            sortOrder: productToCreate.sortOrder,
            vendusProductId: productToCreate.vendusProductId,
            vendusSku: productToCreate.vendusSku,
            vendusSyncStatus: productToCreate.vendusSyncStatus,
            vendusLastSyncedAt: productToCreate.vendusLastSyncedAt,
            isVisibleOnline: productToCreate.isVisibleOnline,
            onlineName: productToCreate.onlineName,
            onlineDescription: productToCreate.onlineDescription,
            onlineImageUrl: productToCreate.onlineImageUrl,
            onlineSortOrder: productToCreate.onlineSortOrder,
          });

          syncedProducts.push(createdProduct);
        }
        created += 1;
      } else {
        if (!input.dryRun) {
          const syncStatus = this.getSyncStatusFromVendus(vp);
          const updatedProduct = await this.productRepository.update(existing.id, {
            price: vp.unitPrice,
            isAvailable: vp.isActive,
            vendusProductId: vp.id,
            vendusSku: vp.sku,
            vendusSyncStatus: syncStatus,
            vendusLastSyncedAt: now,
          });
          syncedProducts.push(updatedProduct);
        }
        updated += 1;
      }
    }

    if (!input.dryRun && syncedProducts.length > 0) {
      await this.productRepository.markProductsSynced(syncedProducts, now);
    } else if (vendusProducts.length === 0) {
      skipped = 0;
    }

    return Results.success<SyncVendusProductsSummary>({
      created,
      updated,
      skipped,
    });
  }

  private getSyncStatusFromVendus(vp: VendusProductDTO): VendusSyncStatus {
    return vp.isActive ? 'in_sync' : 'out_of_sync';
  }
}


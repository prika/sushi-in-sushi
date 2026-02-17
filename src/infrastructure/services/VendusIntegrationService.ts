/**
 * VendusIntegrationService - Implementação HTTP da integração com Vendus
 */

import {
  IVendusIntegrationService,
  VendusProductDTO,
  VendusOrderLineDTO,
  VendusOrderPushResult,
} from '@/application/ports/IVendusIntegrationService';
import { Result, Results } from '@/application/use-cases/Result';

interface VendusConfig {
  apiKey: string;
  baseUrl: string;
}

interface VendusRawProduct {
  id: string;
  sku: string;
  name: string;
  price: number;
  tax: number;
  active: boolean;
}

interface VendusRawOrderResponse {
  id: string;
  number: string;
}

export class VendusIntegrationService implements IVendusIntegrationService {
  constructor(private readonly config: VendusConfig) {}

  async listProducts(): Promise<Result<VendusProductDTO[]>> {
    try {
      const response = await fetch(`${this.config.baseUrl}/products`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        return Results.error<VendusProductDTO[]>(
          `Erro HTTP ao obter produtos Vendus: ${response.status}`,
          'HTTP_ERROR',
        );
      }

      const data = (await response.json()) as { items: VendusRawProduct[] };

      const products: VendusProductDTO[] = data.items.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        unitPrice: item.price,
        taxRate: item.tax,
        isActive: item.active,
      }));

      return Results.success(products);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao comunicar com Vendus';
      return Results.error<VendusProductDTO[]>(message, 'EXCEPTION');
    }
  }

  async pushOrder(
    tableLabel: string,
    lines: VendusOrderLineDTO[],
  ): Promise<Result<VendusOrderPushResult>> {
    try {
      const response = await fetch(`${this.config.baseUrl}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          customer_name: tableLabel,
          lines: lines.map((line) => ({
            product_id: line.vendusProductId,
            quantity: line.quantity,
            unit_price: line.unitPrice,
          })),
        }),
      });

      if (!response.ok) {
        return Results.error<VendusOrderPushResult>(
          `Erro HTTP ao enviar documento Vendus: ${response.status}`,
          'HTTP_ERROR',
        );
      }

      const data = (await response.json()) as VendusRawOrderResponse;

      return Results.success<VendusOrderPushResult>({
        documentId: data.id,
        documentNumber: data.number,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao enviar documento Vendus';
      return Results.error<VendusOrderPushResult>(message, 'EXCEPTION');
    }
  }
}


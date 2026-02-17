/**
 * IVendusIntegrationService - Porta de integração com Vendus
 */

import { Result } from '@/application/use-cases/Result';

export interface VendusProductDTO {
  id: string;
  sku: string;
  name: string;
  unitPrice: number;
  taxRate: number;
  isActive: boolean;
}

export interface VendusOrderLineDTO {
  vendusProductId: string;
  quantity: number;
  unitPrice: number;
}

export interface VendusOrderPushResult {
  documentId: string;
  documentNumber: string;
}

export interface IVendusIntegrationService {
  /**
   * Lista produtos disponíveis no Vendus
   */
  listProducts(): Promise<Result<VendusProductDTO[]>>;

  /**
   * Envia uma venda/conta para o Vendus
   */
  pushOrder(
    tableLabel: string,
    lines: VendusOrderLineDTO[],
  ): Promise<Result<VendusOrderPushResult>>;
}


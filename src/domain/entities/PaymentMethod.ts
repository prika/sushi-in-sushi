/**
 * PaymentMethod Entity - Representa metodos de pagamento do restaurante
 */

export interface PaymentMethod {
  id: number;
  name: string;
  slug: string;
  vendusId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface CreatePaymentMethodData {
  name: string;
  slug: string;
  vendusId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdatePaymentMethodData {
  name?: string;
  slug?: string;
  vendusId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

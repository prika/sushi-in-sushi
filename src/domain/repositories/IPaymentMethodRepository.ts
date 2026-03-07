/**
 * IPaymentMethodRepository - Interface para repositorio de metodos de pagamento
 */

import {
  PaymentMethod,
  CreatePaymentMethodData,
  UpdatePaymentMethodData,
} from '../entities/PaymentMethod';

export interface IPaymentMethodRepository {
  findAll(): Promise<PaymentMethod[]>;
  findById(id: number): Promise<PaymentMethod | null>;
  findBySlug(slug: string): Promise<PaymentMethod | null>;
  create(data: CreatePaymentMethodData): Promise<PaymentMethod>;
  update(id: number, data: UpdatePaymentMethodData): Promise<PaymentMethod>;
  delete(id: number): Promise<void>;
}

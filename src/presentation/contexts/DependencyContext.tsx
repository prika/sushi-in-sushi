'use client';

/**
 * DependencyContext - Contexto para injeção de dependências
 *
 * Este contexto fornece todas as dependências (repositórios, use cases)
 * para a camada de apresentação, permitindo que os componentes UI
 * não dependam diretamente da infraestrutura.
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';

// Repositórios (Interfaces)
import { IOrderRepository } from '@/domain/repositories/IOrderRepository';
import { IProductRepository } from '@/domain/repositories/IProductRepository';
import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import { ISessionRepository } from '@/domain/repositories/ISessionRepository';
import { ITableRepository } from '@/domain/repositories/ITableRepository';

// Implementações Supabase
import { SupabaseOrderRepository } from '@/infrastructure/repositories/SupabaseOrderRepository';
import { SupabaseProductRepository } from '@/infrastructure/repositories/SupabaseProductRepository';
import { SupabaseCategoryRepository } from '@/infrastructure/repositories/SupabaseCategoryRepository';
import { SupabaseSessionRepository } from '@/infrastructure/repositories/SupabaseSessionRepository';
import { SupabaseTableRepository } from '@/infrastructure/repositories/SupabaseTableRepository';

// Use Cases - Orders
import { GetKitchenOrdersUseCase } from '@/application/use-cases/orders/GetKitchenOrdersUseCase';
import { UpdateOrderStatusUseCase } from '@/application/use-cases/orders/UpdateOrderStatusUseCase';
import { CreateOrderUseCase } from '@/application/use-cases/orders/CreateOrderUseCase';

// Use Cases - Sessions
import { StartSessionUseCase } from '@/application/use-cases/sessions/StartSessionUseCase';
import { CloseSessionUseCase } from '@/application/use-cases/sessions/CloseSessionUseCase';
import { RequestBillUseCase } from '@/application/use-cases/sessions/RequestBillUseCase';
import { GetActiveSessionsUseCase } from '@/application/use-cases/sessions/GetActiveSessionsUseCase';

/**
 * Interface das dependências disponíveis
 */
export interface Dependencies {
  // Repositórios
  orderRepository: IOrderRepository;
  productRepository: IProductRepository;
  categoryRepository: ICategoryRepository;
  sessionRepository: ISessionRepository;
  tableRepository: ITableRepository;

  // Use Cases - Orders
  getKitchenOrders: GetKitchenOrdersUseCase;
  updateOrderStatus: UpdateOrderStatusUseCase;
  createOrder: CreateOrderUseCase;

  // Use Cases - Sessions
  startSession: StartSessionUseCase;
  closeSession: CloseSessionUseCase;
  requestBill: RequestBillUseCase;
  getActiveSessions: GetActiveSessionsUseCase;
}

/**
 * Contexto de dependências
 */
const DependencyContext = createContext<Dependencies | null>(null);

/**
 * Props do provider
 */
interface DependencyProviderProps {
  children: ReactNode;
  /**
   * Permite injetar dependências customizadas (útil para testes)
   */
  customDependencies?: Partial<Dependencies>;
}

/**
 * Provider de dependências
 *
 * Cria e fornece todas as instâncias de repositórios e use cases.
 * Deve envolver a aplicação no layout principal.
 */
export function DependencyProvider({
  children,
  customDependencies,
}: DependencyProviderProps) {
  const dependencies = useMemo<Dependencies>(() => {
    // Criar repositórios (ou usar customizados)
    const orderRepository =
      customDependencies?.orderRepository || new SupabaseOrderRepository();

    const productRepository =
      customDependencies?.productRepository || new SupabaseProductRepository();

    const categoryRepository =
      customDependencies?.categoryRepository || new SupabaseCategoryRepository();

    const sessionRepository =
      customDependencies?.sessionRepository || new SupabaseSessionRepository();

    const tableRepository =
      customDependencies?.tableRepository || new SupabaseTableRepository();

    // Criar use cases - Orders
    const getKitchenOrders =
      customDependencies?.getKitchenOrders ||
      new GetKitchenOrdersUseCase(orderRepository);

    const updateOrderStatus =
      customDependencies?.updateOrderStatus ||
      new UpdateOrderStatusUseCase(orderRepository);

    const createOrder =
      customDependencies?.createOrder ||
      new CreateOrderUseCase(orderRepository, productRepository);

    // Criar use cases - Sessions
    const startSession =
      customDependencies?.startSession ||
      new StartSessionUseCase(sessionRepository, tableRepository);

    const closeSession =
      customDependencies?.closeSession ||
      new CloseSessionUseCase(sessionRepository, orderRepository, tableRepository);

    const requestBill =
      customDependencies?.requestBill ||
      new RequestBillUseCase(sessionRepository);

    const getActiveSessions =
      customDependencies?.getActiveSessions ||
      new GetActiveSessionsUseCase(sessionRepository);

    return {
      // Repositórios
      orderRepository,
      productRepository,
      categoryRepository,
      sessionRepository,
      tableRepository,

      // Use Cases - Orders
      getKitchenOrders,
      updateOrderStatus,
      createOrder,

      // Use Cases - Sessions
      startSession,
      closeSession,
      requestBill,
      getActiveSessions,
    };
  }, [customDependencies]);

  return (
    <DependencyContext.Provider value={dependencies}>
      {children}
    </DependencyContext.Provider>
  );
}

/**
 * Hook para aceder às dependências
 *
 * @throws Error se usado fora do DependencyProvider
 */
export function useDependencies(): Dependencies {
  const context = useContext(DependencyContext);

  if (!context) {
    throw new Error(
      'useDependencies deve ser usado dentro de um DependencyProvider'
    );
  }

  return context;
}

/**
 * Hooks de conveniência para aceder a dependências específicas
 */

export function useOrderRepository(): IOrderRepository {
  return useDependencies().orderRepository;
}

export function useProductRepository(): IProductRepository {
  return useDependencies().productRepository;
}

export function useCategoryRepository(): ICategoryRepository {
  return useDependencies().categoryRepository;
}

export function useGetKitchenOrdersUseCase(): GetKitchenOrdersUseCase {
  return useDependencies().getKitchenOrders;
}

export function useUpdateOrderStatusUseCase(): UpdateOrderStatusUseCase {
  return useDependencies().updateOrderStatus;
}

export function useCreateOrderUseCase(): CreateOrderUseCase {
  return useDependencies().createOrder;
}

// Session hooks
export function useSessionRepository(): ISessionRepository {
  return useDependencies().sessionRepository;
}

export function useTableRepository(): ITableRepository {
  return useDependencies().tableRepository;
}

export function useStartSessionUseCase(): StartSessionUseCase {
  return useDependencies().startSession;
}

export function useCloseSessionUseCase(): CloseSessionUseCase {
  return useDependencies().closeSession;
}

export function useRequestBillUseCase(): RequestBillUseCase {
  return useDependencies().requestBill;
}

export function useGetActiveSessionsUseCase(): GetActiveSessionsUseCase {
  return useDependencies().getActiveSessions;
}

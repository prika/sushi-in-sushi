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
import { IStaffRepository } from '@/domain/repositories/IStaffRepository';
import { IReservationRepository } from '@/domain/repositories/IReservationRepository';
import { IRestaurantClosureRepository } from '@/domain/repositories/IRestaurantClosureRepository';
import { IWaiterCallRepository } from '@/domain/repositories/IWaiterCallRepository';
import { ICustomerRepository } from '@/domain/repositories/ICustomerRepository';
import { IRestaurantRepository } from '@/domain/repositories/IRestaurantRepository';

// Ports (Interfaces de serviços)
import { IActivityLogger } from '@/application/ports/IActivityLogger';

// Implementações Supabase
import { SupabaseOrderRepository } from '@/infrastructure/repositories/SupabaseOrderRepository';
import { SupabaseProductRepository } from '@/infrastructure/repositories/SupabaseProductRepository';
import { SupabaseCategoryRepository } from '@/infrastructure/repositories/SupabaseCategoryRepository';
import { SupabaseSessionRepository } from '@/infrastructure/repositories/SupabaseSessionRepository';
import { SupabaseTableRepository } from '@/infrastructure/repositories/SupabaseTableRepository';
import { SupabaseStaffRepository } from '@/infrastructure/repositories/SupabaseStaffRepository';
import { SupabaseReservationRepository } from '@/infrastructure/repositories/SupabaseReservationRepository';
import { SupabaseRestaurantClosureRepository } from '@/infrastructure/repositories/SupabaseRestaurantClosureRepository';
import { SupabaseWaiterCallRepository } from '@/infrastructure/repositories/SupabaseWaiterCallRepository';
import { SupabaseCustomerRepository } from '@/infrastructure/repositories/SupabaseCustomerRepository';
import { SupabaseRestaurantRepository } from '@/infrastructure/repositories/SupabaseRestaurantRepository';

// Implementações de serviços
import { ApiActivityLogger } from '@/infrastructure/services/ApiActivityLogger';

// Use Cases - Orders
import { GetKitchenOrdersUseCase } from '@/application/use-cases/orders/GetKitchenOrdersUseCase';
import { GetSessionOrdersUseCase } from '@/application/use-cases/orders/GetSessionOrdersUseCase';
import { UpdateOrderStatusUseCase } from '@/application/use-cases/orders/UpdateOrderStatusUseCase';
import { CreateOrderUseCase } from '@/application/use-cases/orders/CreateOrderUseCase';

// Use Cases - Sessions
import { StartSessionUseCase } from '@/application/use-cases/sessions/StartSessionUseCase';
import { AutoAssignWaiterUseCase } from '@/application/use-cases/sessions/AutoAssignWaiterUseCase';
import { CloseSessionUseCase } from '@/application/use-cases/sessions/CloseSessionUseCase';
import { RequestBillUseCase } from '@/application/use-cases/sessions/RequestBillUseCase';
import { GetActiveSessionsUseCase } from '@/application/use-cases/sessions/GetActiveSessionsUseCase';

// Use Cases - Staff
import {
  GetAllStaffUseCase,
  CreateStaffUseCase,
  UpdateStaffUseCase,
  DeleteStaffUseCase,
  GetAllRolesUseCase,
} from '@/application/use-cases/staff';

// Use Cases - Reservations
import {
  GetAllReservationsUseCase,
  CreateReservationUseCase,
  ConfirmReservationUseCase,
  CancelReservationUseCase,
} from '@/application/use-cases/reservations';

// Use Cases - Closures
import {
  GetAllClosuresUseCase,
  CreateClosureUseCase,
  DeleteClosureUseCase,
  CheckClosureUseCase,
} from '@/application/use-cases/closures';

// Use Cases - WaiterCalls
import {
  GetAllWaiterCallsUseCase,
  GetPendingWaiterCallsUseCase,
  AcknowledgeWaiterCallUseCase,
  CompleteWaiterCallUseCase,
} from '@/application/use-cases/waiter-calls';

// Use Cases - Customers
import {
  GetAllCustomersUseCase,
  CreateCustomerUseCase,
  UpdateCustomerUseCase,
  AddCustomerPointsUseCase,
} from '@/application/use-cases/customers';

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
  staffRepository: IStaffRepository;
  reservationRepository: IReservationRepository;
  closureRepository: IRestaurantClosureRepository;
  waiterCallRepository: IWaiterCallRepository;
  customerRepository: ICustomerRepository;
  restaurantRepository: IRestaurantRepository;

  // Use Cases - Orders
  getKitchenOrders: GetKitchenOrdersUseCase;
  getSessionOrders: GetSessionOrdersUseCase;
  updateOrderStatus: UpdateOrderStatusUseCase;
  createOrder: CreateOrderUseCase;

  // Use Cases - Sessions
  startSession: StartSessionUseCase;
  closeSession: CloseSessionUseCase;
  requestBill: RequestBillUseCase;
  getActiveSessions: GetActiveSessionsUseCase;

  // Use Cases - Staff
  getAllStaff: GetAllStaffUseCase;
  createStaff: CreateStaffUseCase;
  updateStaff: UpdateStaffUseCase;
  deleteStaff: DeleteStaffUseCase;
  getAllRoles: GetAllRolesUseCase;

  // Use Cases - Reservations
  getAllReservations: GetAllReservationsUseCase;
  createReservation: CreateReservationUseCase;
  confirmReservation: ConfirmReservationUseCase;
  cancelReservation: CancelReservationUseCase;

  // Use Cases - Closures
  getAllClosures: GetAllClosuresUseCase;
  createClosure: CreateClosureUseCase;
  deleteClosure: DeleteClosureUseCase;
  checkClosure: CheckClosureUseCase;

  // Use Cases - WaiterCalls
  getAllWaiterCalls: GetAllWaiterCallsUseCase;
  getPendingWaiterCalls: GetPendingWaiterCallsUseCase;
  acknowledgeWaiterCall: AcknowledgeWaiterCallUseCase;
  completeWaiterCall: CompleteWaiterCallUseCase;

  // Use Cases - Customers
  getAllCustomers: GetAllCustomersUseCase;
  createCustomer: CreateCustomerUseCase;
  updateCustomer: UpdateCustomerUseCase;
  addCustomerPoints: AddCustomerPointsUseCase;

  // Services
  activityLogger: IActivityLogger;
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

    const staffRepository =
      customDependencies?.staffRepository || new SupabaseStaffRepository();

    const reservationRepository =
      customDependencies?.reservationRepository || new SupabaseReservationRepository();

    const closureRepository =
      customDependencies?.closureRepository || new SupabaseRestaurantClosureRepository();

    const waiterCallRepository =
      customDependencies?.waiterCallRepository || new SupabaseWaiterCallRepository();

    const customerRepository =
      customDependencies?.customerRepository || new SupabaseCustomerRepository();

    const restaurantRepository =
      customDependencies?.restaurantRepository || new SupabaseRestaurantRepository();

    // Criar use cases - Orders
    const getKitchenOrders =
      customDependencies?.getKitchenOrders ||
      new GetKitchenOrdersUseCase(orderRepository);

    const getSessionOrders =
      customDependencies?.getSessionOrders ||
      new GetSessionOrdersUseCase(orderRepository);

    const updateOrderStatus =
      customDependencies?.updateOrderStatus ||
      new UpdateOrderStatusUseCase(orderRepository);

    const createOrder =
      customDependencies?.createOrder ||
      new CreateOrderUseCase(orderRepository, productRepository);

    // Criar use cases - Sessions
    const autoAssignWaiter = new AutoAssignWaiterUseCase(
      staffRepository,
      tableRepository,
      restaurantRepository,
    );

    const startSession =
      customDependencies?.startSession ||
      new StartSessionUseCase(sessionRepository, tableRepository, autoAssignWaiter);

    const closeSession =
      customDependencies?.closeSession ||
      new CloseSessionUseCase(sessionRepository, orderRepository, tableRepository);

    const requestBill =
      customDependencies?.requestBill ||
      new RequestBillUseCase(sessionRepository);

    const getActiveSessions =
      customDependencies?.getActiveSessions ||
      new GetActiveSessionsUseCase(sessionRepository);

    // Criar use cases - Staff
    const getAllStaff =
      customDependencies?.getAllStaff ||
      new GetAllStaffUseCase(staffRepository);

    const createStaff =
      customDependencies?.createStaff ||
      new CreateStaffUseCase(staffRepository);

    const updateStaff =
      customDependencies?.updateStaff ||
      new UpdateStaffUseCase(staffRepository);

    const deleteStaff =
      customDependencies?.deleteStaff ||
      new DeleteStaffUseCase(staffRepository);

    const getAllRoles =
      customDependencies?.getAllRoles ||
      new GetAllRolesUseCase(staffRepository);

    // Criar use cases - Reservations
    const getAllReservations =
      customDependencies?.getAllReservations ||
      new GetAllReservationsUseCase(reservationRepository);

    const createReservation =
      customDependencies?.createReservation ||
      new CreateReservationUseCase(reservationRepository, closureRepository);

    const confirmReservation =
      customDependencies?.confirmReservation ||
      new ConfirmReservationUseCase(reservationRepository);

    const cancelReservation =
      customDependencies?.cancelReservation ||
      new CancelReservationUseCase(reservationRepository);

    // Criar use cases - Closures
    const getAllClosures =
      customDependencies?.getAllClosures ||
      new GetAllClosuresUseCase(closureRepository);

    const createClosure =
      customDependencies?.createClosure ||
      new CreateClosureUseCase(closureRepository);

    const deleteClosure =
      customDependencies?.deleteClosure ||
      new DeleteClosureUseCase(closureRepository);

    const checkClosure =
      customDependencies?.checkClosure ||
      new CheckClosureUseCase(closureRepository);

    // Criar use cases - WaiterCalls
    const getAllWaiterCalls =
      customDependencies?.getAllWaiterCalls ||
      new GetAllWaiterCallsUseCase(waiterCallRepository);

    const getPendingWaiterCalls =
      customDependencies?.getPendingWaiterCalls ||
      new GetPendingWaiterCallsUseCase(waiterCallRepository);

    const acknowledgeWaiterCall =
      customDependencies?.acknowledgeWaiterCall ||
      new AcknowledgeWaiterCallUseCase(waiterCallRepository);

    const completeWaiterCall =
      customDependencies?.completeWaiterCall ||
      new CompleteWaiterCallUseCase(waiterCallRepository);

    // Criar use cases - Customers
    const getAllCustomers =
      customDependencies?.getAllCustomers ||
      new GetAllCustomersUseCase(customerRepository);

    const createCustomer =
      customDependencies?.createCustomer ||
      new CreateCustomerUseCase(customerRepository);

    const updateCustomer =
      customDependencies?.updateCustomer ||
      new UpdateCustomerUseCase(customerRepository);

    const addCustomerPoints =
      customDependencies?.addCustomerPoints ||
      new AddCustomerPointsUseCase(customerRepository);

    // Criar services
    const activityLogger =
      customDependencies?.activityLogger ||
      new ApiActivityLogger();

    return {
      // Repositórios
      orderRepository,
      productRepository,
      categoryRepository,
      sessionRepository,
      tableRepository,
      staffRepository,
      reservationRepository,
      closureRepository,
      waiterCallRepository,
      customerRepository,
      restaurantRepository,

      // Use Cases - Orders
      getKitchenOrders,
      getSessionOrders,
      updateOrderStatus,
      createOrder,

      // Use Cases - Sessions
      startSession,
      closeSession,
      requestBill,
      getActiveSessions,

      // Use Cases - Staff
      getAllStaff,
      createStaff,
      updateStaff,
      deleteStaff,
      getAllRoles,

      // Use Cases - Reservations
      getAllReservations,
      createReservation,
      confirmReservation,
      cancelReservation,

      // Use Cases - Closures
      getAllClosures,
      createClosure,
      deleteClosure,
      checkClosure,

      // Use Cases - WaiterCalls
      getAllWaiterCalls,
      getPendingWaiterCalls,
      acknowledgeWaiterCall,
      completeWaiterCall,

      // Use Cases - Customers
      getAllCustomers,
      createCustomer,
      updateCustomer,
      addCustomerPoints,

      // Services
      activityLogger,
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

export function useGetSessionOrdersUseCase(): GetSessionOrdersUseCase {
  return useDependencies().getSessionOrders;
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

// Staff hooks
export function useStaffRepository(): IStaffRepository {
  return useDependencies().staffRepository;
}

export function useGetAllStaffUseCase(): GetAllStaffUseCase {
  return useDependencies().getAllStaff;
}

export function useCreateStaffUseCase(): CreateStaffUseCase {
  return useDependencies().createStaff;
}

export function useUpdateStaffUseCase(): UpdateStaffUseCase {
  return useDependencies().updateStaff;
}

export function useDeleteStaffUseCase(): DeleteStaffUseCase {
  return useDependencies().deleteStaff;
}

export function useGetAllRolesUseCase(): GetAllRolesUseCase {
  return useDependencies().getAllRoles;
}

// Reservation hooks
export function useReservationRepository(): IReservationRepository {
  return useDependencies().reservationRepository;
}

export function useGetAllReservationsUseCase(): GetAllReservationsUseCase {
  return useDependencies().getAllReservations;
}

export function useCreateReservationUseCase(): CreateReservationUseCase {
  return useDependencies().createReservation;
}

export function useConfirmReservationUseCase(): ConfirmReservationUseCase {
  return useDependencies().confirmReservation;
}

export function useCancelReservationUseCase(): CancelReservationUseCase {
  return useDependencies().cancelReservation;
}

// Closure hooks
export function useClosureRepository(): IRestaurantClosureRepository {
  return useDependencies().closureRepository;
}

export function useGetAllClosuresUseCase(): GetAllClosuresUseCase {
  return useDependencies().getAllClosures;
}

export function useCreateClosureUseCase(): CreateClosureUseCase {
  return useDependencies().createClosure;
}

export function useDeleteClosureUseCase(): DeleteClosureUseCase {
  return useDependencies().deleteClosure;
}

export function useCheckClosureUseCase(): CheckClosureUseCase {
  return useDependencies().checkClosure;
}

// WaiterCall hooks
export function useWaiterCallRepository(): IWaiterCallRepository {
  return useDependencies().waiterCallRepository;
}

export function useGetAllWaiterCallsUseCase(): GetAllWaiterCallsUseCase {
  return useDependencies().getAllWaiterCalls;
}

export function useGetPendingWaiterCallsUseCase(): GetPendingWaiterCallsUseCase {
  return useDependencies().getPendingWaiterCalls;
}

export function useAcknowledgeWaiterCallUseCase(): AcknowledgeWaiterCallUseCase {
  return useDependencies().acknowledgeWaiterCall;
}

export function useCompleteWaiterCallUseCase(): CompleteWaiterCallUseCase {
  return useDependencies().completeWaiterCall;
}

// Customer hooks
export function useCustomerRepository(): ICustomerRepository {
  return useDependencies().customerRepository;
}

export function useGetAllCustomersUseCase(): GetAllCustomersUseCase {
  return useDependencies().getAllCustomers;
}

export function useCreateCustomerUseCase(): CreateCustomerUseCase {
  return useDependencies().createCustomer;
}

export function useUpdateCustomerUseCase(): UpdateCustomerUseCase {
  return useDependencies().updateCustomer;
}

export function useAddCustomerPointsUseCase(): AddCustomerPointsUseCase {
  return useDependencies().addCustomerPoints;
}

// Service hooks
export function useActivityLogger(): IActivityLogger {
  return useDependencies().activityLogger;
}

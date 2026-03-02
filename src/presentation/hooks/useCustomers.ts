"use client";

/**
 * useCustomers - Hook para gestão de clientes (programa de fidelização)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { SupabaseCustomerRepository } from "@/infrastructure/repositories/SupabaseCustomerRepository";
import {
  Customer,
  CustomerWithHistory,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerFilter,
} from "@/domain/entities/Customer";
import {
  GetAllCustomersUseCase,
  GetCustomerByIdUseCase,
  CreateCustomerUseCase,
  UpdateCustomerUseCase,
  DeleteCustomerUseCase,
  AddCustomerPointsUseCase,
  RecordCustomerVisitUseCase,
} from "@/application/use-cases/customers";

export interface UseCustomersOptions {
  filter?: CustomerFilter;
  autoLoad?: boolean;
}

export interface UseCustomersResult {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  getById: (_id: string) => Promise<CustomerWithHistory | null>;
  create: (_data: CreateCustomerData) => Promise<Customer | null>;
  update: (_id: string, _data: UpdateCustomerData) => Promise<Customer | null>;
  remove: (_id: string) => Promise<boolean>;
  addPoints: (_id: string, _points: number) => Promise<Customer | null>;
  recordVisit: (_id: string, _spent: number) => Promise<Customer | null>;
  refresh: () => Promise<void>;
}

export function useCustomers(
  options: UseCustomersOptions = {},
): UseCustomersResult {
  const { filter, autoLoad = true } = options;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  // Create repository and use-cases (stable instances via useRef - zero re-renders)
  const useCasesRef = useRef<{
    getAllCustomers: GetAllCustomersUseCase;
    getCustomerById: GetCustomerByIdUseCase;
    createCustomer: CreateCustomerUseCase;
    updateCustomer: UpdateCustomerUseCase;
    deleteCustomer: DeleteCustomerUseCase;
    addPointsUseCase: AddCustomerPointsUseCase;
    recordVisitUseCase: RecordCustomerVisitUseCase;
  }>();

  if (!useCasesRef.current) {
    const repo = new SupabaseCustomerRepository();
    useCasesRef.current = {
      getAllCustomers: new GetAllCustomersUseCase(repo),
      getCustomerById: new GetCustomerByIdUseCase(repo),
      createCustomer: new CreateCustomerUseCase(repo),
      updateCustomer: new UpdateCustomerUseCase(repo),
      deleteCustomer: new DeleteCustomerUseCase(repo),
      addPointsUseCase: new AddCustomerPointsUseCase(repo),
      recordVisitUseCase: new RecordCustomerVisitUseCase(repo),
    };
  }

  const {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    addPointsUseCase,
    recordVisitUseCase,
  } = useCasesRef.current;

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAllCustomers.execute(filter);
      if (result.success) {
        setCustomers(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar clientes",
      );
    } finally {
      setIsLoading(false);
    }
  }, [filter, getAllCustomers]);

  const getById = useCallback(
    async (id: string): Promise<CustomerWithHistory | null> => {
      const result = await getCustomerById.execute(id);
      if (result.success) {
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [getCustomerById],
  );

  const create = useCallback(
    async (data: CreateCustomerData): Promise<Customer | null> => {
      setError(null);
      const result = await createCustomer.execute(data);
      if (result.success) {
        await fetchCustomers();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [createCustomer, fetchCustomers],
  );

  const update = useCallback(
    async (id: string, data: UpdateCustomerData): Promise<Customer | null> => {
      setError(null);
      const result = await updateCustomer.execute(id, data);
      if (result.success) {
        await fetchCustomers();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [updateCustomer, fetchCustomers],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      const result = await deleteCustomer.execute(id);
      if (result.success) {
        await fetchCustomers();
        return true;
      }
      setError(result.error);
      return false;
    },
    [deleteCustomer, fetchCustomers],
  );

  const addPoints = useCallback(
    async (id: string, points: number): Promise<Customer | null> => {
      setError(null);
      const result = await addPointsUseCase.execute(id, points);
      if (result.success) {
        await fetchCustomers();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [addPointsUseCase, fetchCustomers],
  );

  const recordVisit = useCallback(
    async (id: string, spent: number): Promise<Customer | null> => {
      setError(null);
      const result = await recordVisitUseCase.execute(id, spent);
      if (result.success) {
        await fetchCustomers();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [recordVisitUseCase, fetchCustomers],
  );

  useEffect(() => {
    if (autoLoad) {
      fetchCustomers();
    }
  }, [autoLoad, fetchCustomers]);

  return {
    customers,
    isLoading,
    error,
    getById,
    create,
    update,
    remove,
    addPoints,
    recordVisit,
    refresh: fetchCustomers,
  };
}

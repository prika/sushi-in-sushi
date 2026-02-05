'use client';

/**
 * useCustomers - Hook para gestão de clientes (programa de fidelização)
 */

import { useState, useEffect, useCallback } from 'react';
import { SupabaseCustomerRepository } from '@/infrastructure/repositories/SupabaseCustomerRepository';
import {
  Customer,
  CustomerWithHistory,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerFilter,
} from '@/domain/entities/Customer';
import {
  GetAllCustomersUseCase,
  GetCustomerByIdUseCase,
  CreateCustomerUseCase,
  UpdateCustomerUseCase,
  DeleteCustomerUseCase,
  AddCustomerPointsUseCase,
  RecordCustomerVisitUseCase,
} from '@/application/use-cases/customers';

export interface UseCustomersOptions {
  filter?: CustomerFilter;
  autoLoad?: boolean;
}

export interface UseCustomersResult {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  getById: (id: string) => Promise<CustomerWithHistory | null>;
  create: (data: CreateCustomerData) => Promise<Customer | null>;
  update: (id: string, data: UpdateCustomerData) => Promise<Customer | null>;
  remove: (id: string) => Promise<boolean>;
  addPoints: (id: string, points: number) => Promise<Customer | null>;
  recordVisit: (id: string, spent: number) => Promise<Customer | null>;
  refresh: () => Promise<void>;
}

export function useCustomers(options: UseCustomersOptions = {}): UseCustomersResult {
  const { filter, autoLoad = true } = options;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  // Create repository and use-cases
  const repository = new SupabaseCustomerRepository();
  const getAllCustomers = new GetAllCustomersUseCase(repository);
  const getCustomerById = new GetCustomerByIdUseCase(repository);
  const createCustomer = new CreateCustomerUseCase(repository);
  const updateCustomer = new UpdateCustomerUseCase(repository);
  const deleteCustomer = new DeleteCustomerUseCase(repository);
  const addPointsUseCase = new AddCustomerPointsUseCase(repository);
  const recordVisitUseCase = new RecordCustomerVisitUseCase(repository);

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
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  const getById = useCallback(async (id: string): Promise<CustomerWithHistory | null> => {
    const result = await getCustomerById.execute(id);
    if (result.success) {
      return result.data;
    }
    setError(result.error);
    return null;
  }, []);

  const create = useCallback(async (data: CreateCustomerData): Promise<Customer | null> => {
    setError(null);
    const result = await createCustomer.execute(data);
    if (result.success) {
      await fetchCustomers();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchCustomers]);

  const update = useCallback(async (id: string, data: UpdateCustomerData): Promise<Customer | null> => {
    setError(null);
    const result = await updateCustomer.execute(id, data);
    if (result.success) {
      await fetchCustomers();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchCustomers]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    const result = await deleteCustomer.execute(id);
    if (result.success) {
      await fetchCustomers();
      return true;
    }
    setError(result.error);
    return false;
  }, [fetchCustomers]);

  const addPoints = useCallback(async (id: string, points: number): Promise<Customer | null> => {
    setError(null);
    const result = await addPointsUseCase.execute(id, points);
    if (result.success) {
      await fetchCustomers();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchCustomers]);

  const recordVisit = useCallback(async (id: string, spent: number): Promise<Customer | null> => {
    setError(null);
    const result = await recordVisitUseCase.execute(id, spent);
    if (result.success) {
      await fetchCustomers();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchCustomers]);

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

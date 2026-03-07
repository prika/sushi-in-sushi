"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SupabasePaymentMethodRepository } from "@/infrastructure/repositories/SupabasePaymentMethodRepository";
import {
  PaymentMethod,
  CreatePaymentMethodData,
  UpdatePaymentMethodData,
} from "@/domain/entities/PaymentMethod";
import {
  GetAllPaymentMethodsUseCase,
  CreatePaymentMethodUseCase,
  UpdatePaymentMethodUseCase,
  DeletePaymentMethodUseCase,
} from "@/application/use-cases/payment-methods";

export interface UsePaymentMethodsResult {
  methods: PaymentMethod[];
  isLoading: boolean;
  error: string | null;
  create: (_data: CreatePaymentMethodData) => Promise<PaymentMethod | null>;
  update: (
    _id: number,
    _data: UpdatePaymentMethodData
  ) => Promise<PaymentMethod | null>;
  remove: (_id: number) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function usePaymentMethods(): UsePaymentMethodsResult {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const useCasesRef = useRef<{
    getAll: GetAllPaymentMethodsUseCase;
    createMethod: CreatePaymentMethodUseCase;
    updateMethod: UpdatePaymentMethodUseCase;
    deleteMethod: DeletePaymentMethodUseCase;
  }>();

  if (!useCasesRef.current) {
    const repo = new SupabasePaymentMethodRepository();
    useCasesRef.current = {
      getAll: new GetAllPaymentMethodsUseCase(repo),
      createMethod: new CreatePaymentMethodUseCase(repo),
      updateMethod: new UpdatePaymentMethodUseCase(repo),
      deleteMethod: new DeletePaymentMethodUseCase(repo),
    };
  }

  const { getAll, createMethod, updateMethod, deleteMethod } =
    useCasesRef.current;

  const fetchMethods = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAll.execute();
      if (result.success) {
        setMethods(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar metodos"
      );
    } finally {
      setIsLoading(false);
    }
  }, [getAll]);

  const create = useCallback(
    async (data: CreatePaymentMethodData): Promise<PaymentMethod | null> => {
      setError(null);
      const result = await createMethod.execute(data);
      if (result.success) {
        await fetchMethods();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [createMethod, fetchMethods]
  );

  const update = useCallback(
    async (
      id: number,
      data: UpdatePaymentMethodData
    ): Promise<PaymentMethod | null> => {
      setError(null);
      const result = await updateMethod.execute({ id, data });
      if (result.success) {
        await fetchMethods();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [updateMethod, fetchMethods]
  );

  const remove = useCallback(
    async (id: number): Promise<boolean> => {
      setError(null);
      const result = await deleteMethod.execute(id);
      if (result.success) {
        await fetchMethods();
        return true;
      }
      setError(result.error);
      return false;
    },
    [deleteMethod, fetchMethods]
  );

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  return {
    methods,
    isLoading,
    error,
    create,
    update,
    remove,
    refresh: fetchMethods,
  };
}

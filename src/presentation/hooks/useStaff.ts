'use client';

/**
 * useStaff - Hook para gestão de funcionários
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SupabaseStaffRepository } from '@/infrastructure/repositories/SupabaseStaffRepository';
import {
  StaffWithRole,
  Staff,
  CreateStaffData,
  UpdateStaffData,
  StaffFilter,
  Role,
} from '@/domain/entities/Staff';
import {
  GetAllStaffUseCase,
  GetStaffByIdUseCase,
  CreateStaffUseCase,
  UpdateStaffUseCase,
  DeleteStaffUseCase,
  GetAllRolesUseCase,
} from '@/application/use-cases/staff';

export interface UseStaffOptions {
  filter?: StaffFilter;
  autoLoad?: boolean;
  loadTableAssignments?: boolean;
}

export interface UseStaffResult {
  staff: StaffWithRole[];
  roles: Role[];
  tableAssignments: Record<string, string[]>;
  isLoading: boolean;
  error: string | null;
  getById: (id: string) => Promise<StaffWithRole | null>;
  create: (data: CreateStaffData) => Promise<Staff | null>;
  update: (id: string, data: UpdateStaffData) => Promise<Staff | null>;
  remove: (id: string) => Promise<boolean>;
  assignTables: (staffId: string, tableIds: string[]) => Promise<boolean>;
  getAssignedTables: (staffId: string) => Promise<string[]>;
  refresh: () => Promise<void>;
}

export function useStaff(options: UseStaffOptions = {}): UseStaffResult {
  const { filter, autoLoad = true, loadTableAssignments = false } = options;

  const [staff, setStaff] = useState<StaffWithRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tableAssignments, setTableAssignments] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  // Memoize repository and use-cases to avoid recreating on every render
  const repository = useMemo(() => new SupabaseStaffRepository(), []);
  const getAllStaff = useMemo(() => new GetAllStaffUseCase(repository), [repository]);
  const getStaffById = useMemo(() => new GetStaffByIdUseCase(repository), [repository]);
  const createStaff = useMemo(() => new CreateStaffUseCase(repository), [repository]);
  const updateStaff = useMemo(() => new UpdateStaffUseCase(repository), [repository]);
  const deleteStaff = useMemo(() => new DeleteStaffUseCase(repository), [repository]);
  const getAllRoles = useMemo(() => new GetAllRolesUseCase(repository), [repository]);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [staffResult, rolesResult] = await Promise.all([
        getAllStaff.execute(filter),
        getAllRoles.execute(),
      ]);

      if (staffResult.success) {
        setStaff(staffResult.data);

        // Load table assignments for waiters if requested
        if (loadTableAssignments) {
          const assignments: Record<string, string[]> = {};
          const waiters = staffResult.data.filter(s => s.role?.name === 'waiter');

          await Promise.all(
            waiters.map(async (waiter) => {
              const tables = await repository.getAssignedTables(waiter.id);
              assignments[waiter.id] = tables;
            })
          );
          setTableAssignments(assignments);
        }
      } else {
        setError(staffResult.error);
      }

      if (rolesResult.success) {
        setRoles(rolesResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar funcionários');
    } finally {
      setIsLoading(false);
    }
  }, [filter, loadTableAssignments, getAllStaff, getAllRoles, repository]);

  const getById = useCallback(async (id: string): Promise<StaffWithRole | null> => {
    const result = await getStaffById.execute(id);
    if (result.success) {
      return result.data;
    }
    setError(result.error);
    return null;
  }, [getStaffById]);

  const create = useCallback(async (data: CreateStaffData): Promise<Staff | null> => {
    setError(null);
    const result = await createStaff.execute(data);
    if (result.success) {
      await fetchStaff();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchStaff, createStaff]);

  const update = useCallback(async (id: string, data: UpdateStaffData): Promise<Staff | null> => {
    setError(null);
    const result = await updateStaff.execute(id, data);
    if (result.success) {
      await fetchStaff();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchStaff, updateStaff]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    const result = await deleteStaff.execute(id);
    if (result.success) {
      await fetchStaff();
      return true;
    }
    setError(result.error);
    return false;
  }, [fetchStaff, deleteStaff]);

  const assignTables = useCallback(async (staffId: string, tableIds: string[]): Promise<boolean> => {
    setError(null);
    try {
      await repository.assignTables(staffId, tableIds);
      // Update local state
      setTableAssignments(prev => ({
        ...prev,
        [staffId]: tableIds,
      }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atribuir mesas');
      return false;
    }
  }, [repository]);

  const getAssignedTables = useCallback(async (staffId: string): Promise<string[]> => {
    try {
      return await repository.getAssignedTables(staffId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar mesas atribuídas');
      return [];
    }
  }, [repository]);

  useEffect(() => {
    if (autoLoad) {
      fetchStaff();
    }
  }, [autoLoad, fetchStaff]);

  return {
    staff,
    roles,
    tableAssignments,
    isLoading,
    error,
    getById,
    create,
    update,
    remove,
    assignTables,
    getAssignedTables,
    refresh: fetchStaff,
  };
}

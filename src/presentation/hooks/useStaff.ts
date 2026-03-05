"use client";

/**
 * useStaff - Hook para gestão de funcionários
 * Uses API routes (/api/staff) that handle Supabase Auth user management.
 */

import { useState, useEffect, useCallback } from "react";
import type {
  StaffWithRole,
  Staff,
  CreateStaffData,
  UpdateStaffData,
  Role,
} from "@/domain/entities/Staff";

export interface UseStaffOptions {
  autoLoad?: boolean;
  loadTableAssignments?: boolean;
  loadKitchenZoneAssignments?: boolean;
}

export interface UseStaffResult {
  staff: StaffWithRole[];
  roles: Role[];
  tableAssignments: Record<string, string[]>;
  kitchenZoneAssignments: Record<string, string[]>;
  isLoading: boolean;
  error: string | null;
  getById: (_id: string) => Promise<StaffWithRole | null>;
  create: (_data: CreateStaffData) => Promise<Staff | null>;
  update: (_id: string, _data: UpdateStaffData) => Promise<Staff | null>;
  remove: (_id: string) => Promise<boolean>;
  assignTables: (_staffId: string, _tableIds: string[]) => Promise<boolean>;
  getAssignedTables: (_staffId: string) => Promise<string[]>;
  assignKitchenZones: (_staffId: string, _zoneIds: string[]) => Promise<boolean>;
  getAssignedKitchenZones: (_staffId: string) => Promise<string[]>;
  refresh: () => Promise<void>;
}

function mapDates(s: Record<string, unknown>): StaffWithRole {
  return {
    ...s,
    lastLogin: s.lastLogin ? new Date(s.lastLogin as string) : null,
    createdAt: new Date(s.createdAt as string),
  } as StaffWithRole;
}

function mapStaffDates(s: Record<string, unknown>): Staff {
  return {
    ...s,
    lastLogin: s.lastLogin ? new Date(s.lastLogin as string) : null,
    createdAt: new Date(s.createdAt as string),
  } as Staff;
}

export function useStaff(options: UseStaffOptions = {}): UseStaffResult {
  const { autoLoad = true, loadTableAssignments = false, loadKitchenZoneAssignments = false } = options;

  const [staff, setStaff] = useState<StaffWithRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tableAssignments, setTableAssignments] = useState<
    Record<string, string[]>
  >({});
  const [kitchenZoneAssignments, setKitchenZoneAssignments] = useState<
    Record<string, string[]>
  >({});
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/staff?includeRoles=true");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erro ao carregar funcionários");
      }

      const data = await res.json();
      const staffList: StaffWithRole[] = (data.staff || []).map(mapDates);
      setStaff(staffList);

      if (data.roles) {
        setRoles(data.roles);
      }

      // Load table assignments for waiters if requested
      if (loadTableAssignments) {
        const assignments: Record<string, string[]> = {};
        const waiters = staffList.filter(
          (s) => s.role?.name === "waiter",
        );

        await Promise.all(
          waiters.map(async (waiter) => {
            try {
              const tablesRes = await fetch(
                `/api/staff/${waiter.id}?includeTables=true`,
              );
              if (tablesRes.ok) {
                const tablesData = await tablesRes.json();
                assignments[waiter.id] = tablesData.assignedTables || [];
              }
            } catch {
              // Ignore individual table assignment fetch failures
            }
          }),
        );
        setTableAssignments(assignments);
      }

      // Load kitchen zone assignments for kitchen staff if requested
      if (loadKitchenZoneAssignments) {
        const zoneAssignments: Record<string, string[]> = {};
        const kitchenStaff = staffList.filter(
          (s) => s.role?.name === "kitchen",
        );

        await Promise.all(
          kitchenStaff.map(async (member) => {
            try {
              const zonesRes = await fetch(
                `/api/staff/${member.id}?includeKitchenZones=true`,
              );
              if (zonesRes.ok) {
                const zonesData = await zonesRes.json();
                zoneAssignments[member.id] = zonesData.assignedKitchenZones || [];
              }
            } catch {
              // Ignore individual zone assignment fetch failures
            }
          }),
        );
        setKitchenZoneAssignments(zoneAssignments);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar funcionários",
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadTableAssignments, loadKitchenZoneAssignments]);

  const getById = useCallback(
    async (id: string): Promise<StaffWithRole | null> => {
      try {
        const res = await fetch(`/api/staff/${id}`);
        if (!res.ok) return null;
        const data = await res.json();
        return mapDates(data);
      } catch {
        return null;
      }
    },
    [],
  );

  const create = useCallback(
    async (data: CreateStaffData): Promise<Staff | null> => {
      setError(null);
      try {
        const res = await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Erro ao criar funcionário");
        }

        const created = await res.json();
        await fetchStaff();
        return mapStaffDates(created);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao criar funcionário",
        );
        return null;
      }
    },
    [fetchStaff],
  );

  const update = useCallback(
    async (id: string, data: UpdateStaffData): Promise<Staff | null> => {
      setError(null);
      try {
        const res = await fetch(`/api/staff/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Erro ao atualizar funcionário");
        }

        const updated = await res.json();
        await fetchStaff();
        return mapStaffDates(updated);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao atualizar funcionário",
        );
        return null;
      }
    },
    [fetchStaff],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      try {
        const res = await fetch(`/api/staff/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Erro ao apagar funcionário");
        }

        await fetchStaff();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao apagar funcionário",
        );
        return false;
      }
    },
    [fetchStaff],
  );

  const assignTables = useCallback(
    async (staffId: string, tableIds: string[]): Promise<boolean> => {
      setError(null);
      try {
        const res = await fetch(`/api/staff/${staffId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableIds }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Erro ao atribuir mesas");
        }

        setTableAssignments((prev) => ({
          ...prev,
          [staffId]: tableIds,
        }));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao atribuir mesas");
        return false;
      }
    },
    [],
  );

  const getAssignedTables = useCallback(
    async (staffId: string): Promise<string[]> => {
      try {
        const res = await fetch(`/api/staff/${staffId}?includeTables=true`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.assignedTables || [];
      } catch {
        return [];
      }
    },
    [],
  );

  const assignKitchenZones = useCallback(
    async (staffId: string, zoneIds: string[]): Promise<boolean> => {
      setError(null);
      try {
        const res = await fetch(`/api/staff/${staffId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kitchenZoneIds: zoneIds }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Erro ao atribuir zonas");
        }

        setKitchenZoneAssignments((prev) => ({
          ...prev,
          [staffId]: zoneIds,
        }));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao atribuir zonas");
        return false;
      }
    },
    [],
  );

  const getAssignedKitchenZones = useCallback(
    async (staffId: string): Promise<string[]> => {
      try {
        const res = await fetch(`/api/staff/${staffId}?includeKitchenZones=true`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.assignedKitchenZones || [];
      } catch {
        return [];
      }
    },
    [],
  );

  useEffect(() => {
    if (autoLoad) {
      fetchStaff();
    }
  }, [autoLoad, fetchStaff]);

  return {
    staff,
    roles,
    tableAssignments,
    kitchenZoneAssignments,
    isLoading,
    error,
    getById,
    create,
    update,
    remove,
    assignTables,
    getAssignedTables,
    assignKitchenZones,
    getAssignedKitchenZones,
    refresh: fetchStaff,
  };
}

/**
 * SupabaseTableRepository - Implementação Supabase do repositório de mesas
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ITableRepository,
  TableFilter,
} from '@/domain/repositories/ITableRepository';
import {
  Table,
  CreateTableData,
  UpdateTableData,
  TableWithWaiter,
  TableWithSession,
  TableFullStatus,
} from '@/domain/entities/Table';
import { TableStatus } from '@/domain/value-objects/TableStatus';
import { Location } from '@/types/database';

/**
 * Helper para acesso a views não tipadas
 */
function getExtendedClient(client: SupabaseClient) {
  return client as unknown as {
    from: (table: string) => ReturnType<typeof client.from>;
  };
}

/**
 * Tipo do registo da base de dados
 */
interface DatabaseTable {
  id: string;
  number: number;
  name: string;
  location: string;
  status: string;
  is_active: boolean;
  current_session_id: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * Implementação Supabase do repositório de mesas
 */
export class SupabaseTableRepository implements ITableRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findById(id: string): Promise<Table | null> {
    const { data, error } = await this.supabase
      .from('tables')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByNumber(number: number, location: Location): Promise<Table | null> {
    const { data, error } = await this.supabase
      .from('tables')
      .select('*')
      .eq('number', number)
      .eq('location', location)
      .single();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByIdWithWaiter(id: string): Promise<TableWithWaiter | null> {
    const extendedClient = getExtendedClient(this.supabase);

    // Buscar mesa
    const { data: table, error } = await this.supabase
      .from('tables')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !table) return null;

    // Buscar empregado atribuído
    const { data: assignment } = await extendedClient
      .from('waiter_tables')
      .select('staff:staff(id, name)')
      .eq('table_id', id)
      .single();

    const staff = assignment?.staff;
    const waiter = Array.isArray(staff) ? staff[0] : staff;

    return {
      ...this.toDomain(table),
      waiter: waiter ? { id: waiter.id, name: waiter.name } : null,
    };
  }

  async findByIdWithSession(id: string): Promise<TableWithSession | null> {
    const { data: table, error } = await this.supabase
      .from('tables')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !table) return null;

    let activeSession = null;
    if (table.current_session_id) {
      const { data: session } = await this.supabase
        .from('sessions')
        .select('id, is_rodizio, num_people, started_at, total_amount')
        .eq('id', table.current_session_id)
        .single();

      if (session) {
        activeSession = {
          id: session.id,
          isRodizio: session.is_rodizio,
          numPeople: session.num_people,
          startedAt: new Date(session.started_at),
          totalAmount: session.total_amount,
        };
      }
    }

    return {
      ...this.toDomain(table),
      activeSession,
    };
  }

  async findByIdFullStatus(id: string): Promise<TableFullStatus | null> {
    const extendedClient = getExtendedClient(this.supabase);

    // Tentar usar view
    const { data: viewData, error: viewError } = await extendedClient
      .from('tables_full_status')
      .select('*')
      .eq('id', id)
      .single();

    if (!viewError && viewData) {
      return this.viewToDomain(viewData);
    }

    // Fallback: buscar dados manualmente
    const tableWithSession = await this.findByIdWithSession(id);
    if (!tableWithSession) return null;

    const tableWithWaiter = await this.findByIdWithWaiter(id);

    let pendingOrdersCount = 0;
    if (tableWithSession.activeSession) {
      const { count } = await this.supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', tableWithSession.activeSession.id)
        .in('status', ['pending', 'preparing']);

      pendingOrdersCount = count || 0;
    }

    return {
      ...tableWithSession,
      waiter: tableWithWaiter?.waiter || null,
      activeSession: tableWithSession.activeSession
        ? {
            ...tableWithSession.activeSession,
            pendingOrdersCount,
          }
        : null,
    };
  }

  async findAll(filter?: TableFilter): Promise<Table[]> {
    let query = this.supabase.from('tables').select('*');

    if (filter?.location) {
      query = query.eq('location', filter.location);
    }

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    if (filter?.isActive !== undefined) {
      query = query.eq('is_active', filter.isActive);
    }

    if (filter?.hasActiveSession === true) {
      query = query.not('current_session_id', 'is', null);
    } else if (filter?.hasActiveSession === false) {
      query = query.is('current_session_id', null);
    }

    const { data, error } = await query.order('number');

    if (error) throw new Error(error.message);
    return (data || []).map((d) => this.toDomain(d));
  }

  async findAllFullStatus(filter?: TableFilter): Promise<TableFullStatus[]> {
    const extendedClient = getExtendedClient(this.supabase);

    // Tentar usar view
    let viewQuery = extendedClient.from('tables_full_status').select('*');

    if (filter?.location) {
      viewQuery = viewQuery.eq('location', filter.location);
    }

    if (filter?.isActive !== undefined) {
      viewQuery = viewQuery.eq('is_active', filter.isActive);
    }

    const { data: viewData, error: viewError } = await viewQuery.order('number');

    if (!viewError && viewData) {
      // Buscar empregados atribuídos
      const { data: assignments } = await extendedClient
        .from('waiter_tables')
        .select('table_id, staff_id, staff:staff_id(name)');

      const waiterMap = new Map(
        (assignments || []).map((a: any) => [
          a.table_id,
          { id: a.staff_id, name: a.staff?.name || null },
        ])
      );

      return (viewData as Record<string, unknown>[]).map((d) => ({
        ...this.viewToDomain(d),
        waiter: waiterMap.get(d.id as string) || null,
      }));
    }

    // Fallback: usar findAll básico
    const tables = await this.findAll(filter);
    return tables.map((t) => ({
      ...t,
      waiter: null,
      activeSession: null,
    }));
  }

  async findByWaiter(waiterId: string): Promise<TableWithSession[]> {
    const extendedClient = getExtendedClient(this.supabase);

    const { data: assignments, error: assignError } = await extendedClient
      .from('waiter_tables')
      .select('table_id')
      .eq('staff_id', waiterId);

    if (assignError) throw new Error(assignError.message);

    const tableIds = (assignments || []).map((a: { table_id: string }) => a.table_id);
    if (tableIds.length === 0) return [];

    const tables = await Promise.all(
      tableIds.map((id) => this.findByIdWithSession(id))
    );

    return tables.filter((t): t is TableWithSession => t !== null);
  }

  async create(data: CreateTableData): Promise<Table> {
    const { data: table, error } = await this.supabase
      .from('tables')
      .insert({
        number: data.number,
        name: data.name,
        location: data.location,
        is_active: data.isActive ?? true,
        status: 'available',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(table);
  }

  async update(id: string, data: UpdateTableData): Promise<Table> {
    const updateData: Record<string, unknown> = {};

    if (data.number !== undefined) updateData.number = data.number;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.currentSessionId !== undefined)
      updateData.current_session_id = data.currentSessionId;

    const { data: table, error } = await this.supabase
      .from('tables')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(table);
  }

  async updateStatus(id: string, status: TableStatus): Promise<Table> {
    const { data: table, error } = await this.supabase
      .from('tables')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(table);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('tables').delete().eq('id', id);

    if (error) throw new Error(error.message);
  }

  async countByStatus(location?: Location): Promise<Record<TableStatus, number>> {
    let query = this.supabase.from('tables').select('status');

    if (location) {
      query = query.eq('location', location);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    const counts: Record<TableStatus, number> = {
      available: 0,
      reserved: 0,
      occupied: 0,
      inactive: 0,
    };

    (data || []).forEach((row: { status: string }) => {
      const status = row.status as TableStatus;
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });

    return counts;
  }

  /**
   * Converte registo da BD para entidade de domínio
   */
  private toDomain(data: DatabaseTable): Table {
    return {
      id: data.id,
      number: data.number,
      name: data.name,
      location: data.location as Location,
      status: data.status as TableStatus,
      isActive: data.is_active,
      currentSessionId: data.current_session_id,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(data.created_at),
    };
  }

  /**
   * Converte registo da view para entidade de domínio
   */
  private viewToDomain(data: Record<string, unknown>): TableFullStatus {
    const createdAt = new Date(data.created_at as string);
    return {
      id: data.id as string,
      number: data.number as number,
      name: data.name as string,
      location: data.location as Location,
      status: data.status as TableStatus,
      isActive: data.is_active as boolean,
      currentSessionId: data.session_id as string | null,
      createdAt,
      updatedAt: data.updated_at ? new Date(data.updated_at as string) : createdAt,
      waiter: null,
      activeSession: data.session_id
        ? {
            id: data.session_id as string,
            isRodizio: data.is_rodizio as boolean,
            numPeople: data.session_people as number,
            startedAt: new Date(data.session_started as string),
            totalAmount: data.session_total as number,
            pendingOrdersCount: 0,
          }
        : null,
    };
  }
}

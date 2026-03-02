/**
 * SupabaseSessionRepository - Implementação Supabase do repositório de sessões
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ISessionRepository,
  SessionFilter,
} from '@/domain/repositories/ISessionRepository';
import {
  Session,
  CreateSessionData,
  UpdateSessionData,
  SessionWithTable,
  SessionWithOrders,
} from '@/domain/entities/Session';
import { SessionStatus } from '@/domain/value-objects/SessionStatus';
import { toOrderingMode } from '@/domain/value-objects/OrderingMode';
import { Location } from '@/types/database';

/**
 * Tipo do registo da base de dados
 */
interface DatabaseSession {
  id: string;
  table_id: string;
  status: string;
  is_rodizio: boolean;
  num_people: number;
  total_amount: number;
  ordering_mode?: string;
  started_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Implementação Supabase do repositório de sessões
 */
export class SupabaseSessionRepository implements ISessionRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findById(id: string): Promise<Session | null> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByIdWithTable(id: string): Promise<SessionWithTable | null> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select(`
        *,
        table:tables(id, number, name, location)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomainWithTable(data);
  }

  async findByIdWithOrders(id: string): Promise<SessionWithOrders | null> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select(`
        *,
        table:tables(id, number, name, location),
        orders(
          id,
          product_id,
          quantity,
          unit_price,
          status,
          product:products(name)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomainWithOrders(data);
  }

  async findActiveByTable(tableId: string): Promise<Session | null> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('table_id', tableId)
      .in('status', ['active', 'pending_payment'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findAll(filter?: SessionFilter): Promise<Session[]> {
    let query = this.supabase.from('sessions').select('*');

    if (filter?.tableId) {
      query = query.eq('table_id', filter.tableId);
    }

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    if (filter?.statuses && filter.statuses.length > 0) {
      query = query.in('status', filter.statuses);
    }

    if (filter?.fromDate) {
      query = query.gte('created_at', filter.fromDate.toISOString());
    }

    if (filter?.toDate) {
      query = query.lte('created_at', filter.toDate.toISOString());
    }

    if (filter?.isRodizio !== undefined) {
      query = query.eq('is_rodizio', filter.isRodizio);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((d) => this.toDomain(d));
  }

  async findActive(location?: Location): Promise<SessionWithTable[]> {
    const query = this.supabase
      .from('sessions')
      .select(`
        *,
        table:tables(id, number, name, location)
      `)
      .in('status', ['active', 'pending_payment']);

    const { data, error } = await query.order('started_at', { ascending: true });

    if (error) throw new Error(error.message);

    let sessions = (data || []).map((d) => this.toDomainWithTable(d));

    // Filtrar por localização se necessário
    if (location) {
      sessions = sessions.filter((s) => s.table.location === location);
    }

    return sessions;
  }

  async create(data: CreateSessionData): Promise<Session> {
    const { data: session, error } = await this.supabase
      .from('sessions')
      .insert({
        table_id: data.tableId,
        is_rodizio: data.isRodizio,
        num_people: data.numPeople,
        ordering_mode: data.orderingMode || 'client',
        status: 'active',
        total_amount: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(session);
  }

  async update(id: string, data: UpdateSessionData): Promise<Session> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.status !== undefined) updateData.status = data.status;
    if (data.numPeople !== undefined) updateData.num_people = data.numPeople;
    if (data.totalAmount !== undefined) updateData.total_amount = data.totalAmount;
    if (data.closedAt !== undefined) updateData.closed_at = data.closedAt?.toISOString() || null;
    if (data.orderingMode !== undefined) updateData.ordering_mode = data.orderingMode;

    const { data: session, error } = await this.supabase
      .from('sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(session);
  }

  async updateStatus(id: string, status: SessionStatus): Promise<Session> {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Se fechar a sessão, adicionar closed_at
    if (status === 'closed') {
      updateData.closed_at = new Date().toISOString();
    }

    const { data: session, error } = await this.supabase
      .from('sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(session);
  }

  async close(id: string): Promise<Session> {
    return this.updateStatus(id, 'closed');
  }

  async countByStatus(location?: Location): Promise<Record<SessionStatus, number>> {
    const query = this.supabase.from('sessions').select(`
      status,
      table:tables(location)
    `);

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    const counts: Record<SessionStatus, number> = {
      active: 0,
      pending_payment: 0,
      paid: 0,
      closed: 0,
    };

    interface SessionRow {
      status: string;
      table: { location: string } | { location: string }[] | null;
    }

    (data as SessionRow[] || []).forEach((row) => {
      // Filtrar por localização se necessário
      const tableData = Array.isArray(row.table) ? row.table[0] : row.table;
      if (location && tableData?.location !== location) return;

      const status = row.status as SessionStatus;
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });

    return counts;
  }

  async calculateTotal(id: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('quantity, unit_price, status')
      .eq('session_id', id)
      .neq('status', 'cancelled');

    if (error) throw new Error(error.message);

    return (data || []).reduce(
      (sum, order) => sum + order.quantity * order.unit_price,
      0
    );
  }

  /**
   * Converte registo da BD para entidade de domínio
   */
  private toDomain(data: DatabaseSession): Session {
    return {
      id: data.id,
      tableId: data.table_id,
      status: data.status as SessionStatus,
      isRodizio: data.is_rodizio,
      numPeople: data.num_people,
      totalAmount: data.total_amount,
      orderingMode: toOrderingMode(data.ordering_mode, 'client'),
      startedAt: new Date(data.started_at),
      closedAt: data.closed_at ? new Date(data.closed_at) : null,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Converte registo com mesa para entidade de domínio
   */
  private toDomainWithTable(
    data: DatabaseSession & {
      table: { id: string; number: number; name: string; location: string } | null;
    }
  ): SessionWithTable {
    return {
      ...this.toDomain(data),
      table: data.table
        ? {
            id: data.table.id,
            number: data.table.number,
            name: data.table.name,
            location: data.table.location,
          }
        : { id: '', number: 0, name: 'Mesa desconhecida', location: '' },
    };
  }

  /**
   * Converte registo com pedidos para entidade de domínio
   */
  private toDomainWithOrders(
    data: DatabaseSession & {
      table: { id: string; number: number; name: string; location: string } | null;
      orders: Array<{
        id: string;
        product_id: string;
        quantity: number;
        unit_price: number;
        status: string;
        product: { name: string } | null;
      }>;
    }
  ): SessionWithOrders {
    return {
      ...this.toDomainWithTable(data),
      orders: (data.orders || []).map((o) => ({
        id: o.id,
        productId: o.product_id,
        productName: o.product?.name || 'Produto desconhecido',
        quantity: o.quantity,
        unitPrice: o.unit_price,
        status: o.status,
      })),
    };
  }
}

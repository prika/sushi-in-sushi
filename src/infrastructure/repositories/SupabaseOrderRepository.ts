/**
 * SupabaseOrderRepository - Implementação Supabase do repositório de pedidos
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  IOrderRepository,
  OrderFilter,
} from '@/domain/repositories/IOrderRepository';
import {
  Order,
  CreateOrderData,
  UpdateOrderData,
  OrderWithProduct,
  KitchenOrder,
} from '@/domain/entities/Order';
import { OrderStatus } from '@/domain/value-objects/OrderStatus';

/**
 * Helper para acesso a tabelas não tipadas (como session_customers)
 */
function getExtendedClient(client: SupabaseClient) {
  return client as unknown as {
    from: (table: string) => ReturnType<typeof client.from>;
  };
}

/**
 * Tipo do registo da base de dados
 */
interface DatabaseOrder {
  id: string;
  session_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  status: string;
  session_customer_id: string | null;
  prepared_by: string | null;
  preparing_started_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Implementação Supabase do repositório de pedidos
 */
export class SupabaseOrderRepository implements IOrderRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findById(id: string): Promise<Order | null> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByIdWithProduct(id: string): Promise<OrderWithProduct | null> {
    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        product:products(id, name, image_url)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomainWithProduct(data);
  }

  async findAll(filter?: OrderFilter): Promise<Order[]> {
    let query = this.supabase.from('orders').select('*');

    if (filter?.sessionId) {
      query = query.eq('session_id', filter.sessionId);
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

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map((d) => this.toDomain(d));
  }

  async findBySession(sessionId: string): Promise<OrderWithProduct[]> {
    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        product:products(id, name, image_url)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map((d) => this.toDomainWithProduct(d));
  }

  async findForKitchen(filter?: OrderFilter): Promise<KitchenOrder[]> {
    const statuses = filter?.statuses || ['pending', 'preparing', 'ready'];

    let query = this.supabase
      .from('orders')
      .select(`
        *,
        product:products(id, name, image_url),
        session:sessions(
          id,
          table:tables(id, number, location)
        )
      `)
      .in('status', statuses)
      .order('created_at', { ascending: true });

    if (filter?.location) {
      // Filtrar por localização requer join com sessions/tables
      // Será filtrado após o fetch
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    // Buscar nomes dos clientes e empregados
    const orders = data || [];
    const enrichedOrders = await this.enrichKitchenOrders(orders, filter?.location);

    return enrichedOrders;
  }

  private async enrichKitchenOrders(
    orders: Array<{
      id: string;
      session_id: string;
      product_id: string;
      quantity: number;
      unit_price: number;
      notes: string | null;
      status: string;
      session_customer_id: string | null;
      prepared_by: string | null;
      preparing_started_at: string | null;
      ready_at: string | null;
      delivered_at: string | null;
      created_at: string;
      updated_at: string;
      product: { id: string; name: string; image_url: string | null } | null;
      session: {
        id: string;
        table: { id: string; number: number; location: string } | null;
      } | null;
    }>,
    locationFilter?: string
  ): Promise<KitchenOrder[]> {
    // Filtrar por localização se necessário
    let filteredOrders = orders;
    if (locationFilter) {
      filteredOrders = orders.filter(
        (o) => o.session?.table?.location === locationFilter
      );
    }

    // Buscar nomes dos clientes
    const customerIds = Array.from(
      new Set(
        filteredOrders
          .map((o) => o.session_customer_id)
          .filter((id): id is string => id !== null)
      )
    );

    const customerMap = new Map<string, string>();
    if (customerIds.length > 0) {
      const extendedClient = getExtendedClient(this.supabase);
      const { data: customers } = await extendedClient
        .from('session_customers')
        .select('id, display_name')
        .in('id', customerIds);

      (customers as { id: string; display_name: string }[] || []).forEach((c) => {
        customerMap.set(c.id, c.display_name);
      });
    }

    // Buscar empregados atribuídos às mesas
    const tableIds = Array.from(
      new Set(
        filteredOrders
          .map((o) => o.session?.table?.id)
          .filter((id): id is string => id !== null)
      )
    );

    const waiterMap = new Map<string, string>();
    if (tableIds.length > 0) {
      const { data: assignments } = await this.supabase
        .from('waiter_tables')
        .select('table_id, staff:staff(id, name)')
        .in('table_id', tableIds);

      interface WaiterAssignment {
        table_id: string;
        staff: { id: string; name: string } | { id: string; name: string }[] | null;
      }

      (assignments as WaiterAssignment[] || []).forEach((a) => {
        const staff = Array.isArray(a.staff) ? a.staff[0] : a.staff;
        if (staff) {
          waiterMap.set(a.table_id, staff.name);
        }
      });
    }

    // Buscar nomes dos preparadores (kitchen staff)
    const preparerIds = Array.from(
      new Set(
        filteredOrders
          .map((o) => o.prepared_by)
          .filter((id): id is string => id !== null)
      )
    );

    const preparerMap = new Map<string, string>();
    if (preparerIds.length > 0) {
      const { data: preparers } = await this.supabase
        .from('staff')
        .select('id, name')
        .in('id', preparerIds);

      (preparers as { id: string; name: string }[] || []).forEach((p) => {
        preparerMap.set(p.id, p.name);
      });
    }

    return filteredOrders.map((order) => ({
      id: order.id,
      sessionId: order.session_id,
      productId: order.product_id,
      quantity: order.quantity,
      unitPrice: order.unit_price,
      notes: order.notes,
      status: order.status as OrderStatus,
      sessionCustomerId: order.session_customer_id,
      preparedBy: order.prepared_by ?? null,
      preparingStartedAt: order.preparing_started_at ? new Date(order.preparing_started_at) : null,
      readyAt: order.ready_at ? new Date(order.ready_at) : null,
      deliveredAt: order.delivered_at ? new Date(order.delivered_at) : null,
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at),
      product: order.product
        ? {
            id: order.product.id,
            name: order.product.name,
            imageUrl: order.product.image_url,
          }
        : { id: '', name: 'Produto desconhecido', imageUrl: null },
      table: order.session?.table
        ? {
            id: order.session.table.id,
            number: order.session.table.number,
            location: order.session.table.location,
          }
        : null,
      customerName: order.session_customer_id
        ? customerMap.get(order.session_customer_id) || null
        : null,
      waiterName: order.session?.table?.id
        ? waiterMap.get(order.session.table.id) || null
        : null,
      preparerName: order.prepared_by
        ? preparerMap.get(order.prepared_by) || null
        : null,
    }));
  }

  async create(data: CreateOrderData): Promise<Order> {
    const { data: order, error } = await this.supabase
      .from('orders')
      .insert({
        session_id: data.sessionId,
        product_id: data.productId,
        quantity: data.quantity,
        unit_price: data.unitPrice,
        notes: data.notes || null,
        session_customer_id: data.sessionCustomerId || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(order);
  }

  async update(id: string, data: UpdateOrderData): Promise<Order> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: order, error } = await this.supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(order);
  }

  async updateStatus(id: string, status: OrderStatus, preparedBy?: string | null): Promise<Order> {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'preparing') {
      updateData.preparing_started_at = new Date().toISOString();
      if (preparedBy) {
        updateData.prepared_by = preparedBy;
      }
    }

    if (status === 'ready') {
      updateData.ready_at = new Date().toISOString();
    }

    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    const { data: order, error } = await this.supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(order);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('orders').delete().eq('id', id);

    if (error) throw new Error(error.message);
  }

  async countByStatus(sessionId?: string): Promise<Record<OrderStatus, number>> {
    let query = this.supabase.from('orders').select('status');

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    const counts: Record<OrderStatus, number> = {
      pending: 0,
      preparing: 0,
      ready: 0,
      delivered: 0,
      cancelled: 0,
    };

    (data || []).forEach((row: { status: string }) => {
      const status = row.status as OrderStatus;
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });

    return counts;
  }

  /**
   * Converte registo da BD para entidade de domínio
   */
  private toDomain(data: DatabaseOrder): Order {
    return {
      id: data.id,
      sessionId: data.session_id,
      productId: data.product_id,
      quantity: data.quantity,
      unitPrice: data.unit_price,
      notes: data.notes,
      status: data.status as OrderStatus,
      sessionCustomerId: data.session_customer_id,
      preparedBy: data.prepared_by ?? null,
      preparingStartedAt: data.preparing_started_at ? new Date(data.preparing_started_at) : null,
      readyAt: data.ready_at ? new Date(data.ready_at) : null,
      deliveredAt: data.delivered_at ? new Date(data.delivered_at) : null,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Converte registo com produto para entidade de domínio
   */
  private toDomainWithProduct(
    data: DatabaseOrder & {
      product: { id: string; name: string; image_url: string | null } | null;
    }
  ): OrderWithProduct {
    return {
      ...this.toDomain(data),
      product: data.product
        ? {
            id: data.product.id,
            name: data.product.name,
            imageUrl: data.product.image_url,
          }
        : { id: '', name: 'Produto desconhecido', imageUrl: null },
    };
  }

  async getAveragePreparationTime(productId: string): Promise<number | null> {
    // Get completed orders (ready or delivered) with preparation timestamps
    const { data, error } = await this.supabase
      .from('orders')
      .select('preparing_started_at, ready_at')
      .eq('product_id', productId)
      .in('status', ['ready', 'delivered'])
      .not('preparing_started_at', 'is', null)
      .not('ready_at', 'is', null)
      .limit(50); // Last 50 orders for more accurate recent average

    if (error || !data || data.length === 0) {
      return null;
    }

    // Calculate average preparation time in minutes
    const times = data
      .map((order: any) => {
        const start = new Date(order.preparing_started_at).getTime();
        const ready = new Date(order.ready_at).getTime();
        return Math.round((ready - start) / 60000); // Convert to minutes
      })
      .filter((time: number) => time > 0 && time < 180); // Filter out anomalies (0 min or > 3 hours)

    if (times.length === 0) {
      return null;
    }

    const average = times.reduce((sum: number, time: number) => sum + time, 0) / times.length;
    return Math.round(average);
  }
}

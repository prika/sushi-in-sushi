/**
 * TableService - Serviço de domínio para mesas
 * Contém a lógica de negócio pura relacionada a mesas
 */

import { Table, _TableWithSession, TableFullStatus } from '../entities/Table';
import { TableStatus, canAcceptCustomers, isTableActive } from '../value-objects/TableStatus';
import { Location } from '../value-objects/Location';
import { ValidationResult } from './types';

/**
 * Serviço de domínio para mesas
 * Contém apenas lógica de negócio pura, sem dependências de infraestrutura
 */
export class TableService {
  /**
   * Verifica se a mesa pode aceitar clientes (iniciar sessão)
   */
  static canStartSession(table: Table): ValidationResult {
    if (!table.isActive) {
      return { isValid: false, error: 'Mesa está inativa' };
    }

    if (table.status === 'occupied') {
      return { isValid: false, error: 'Mesa já está ocupada' };
    }

    if (table.currentSessionId) {
      return { isValid: false, error: 'Mesa já tem uma sessão ativa' };
    }

    return { isValid: true };
  }

  /**
   * Verifica se a mesa pode ser fechada (encerrar sessão)
   */
  static canCloseSession(table: Table): ValidationResult {
    if (table.status !== 'occupied') {
      return { isValid: false, error: 'Mesa não está ocupada' };
    }

    if (!table.currentSessionId) {
      return { isValid: false, error: 'Mesa não tem sessão ativa' };
    }

    return { isValid: true };
  }

  /**
   * Verifica se a mesa pode mudar de status
   */
  static canChangeStatus(table: Table, newStatus: TableStatus): ValidationResult {
    if (table.status === newStatus) {
      return { isValid: false, error: 'Mesa já está neste estado' };
    }

    // Se tem sessão ativa, não pode mudar para disponível ou reservada
    if (table.currentSessionId && (newStatus === 'available' || newStatus === 'reserved')) {
      return { isValid: false, error: 'Mesa tem uma sessão ativa' };
    }

    // Se está inativa, só pode voltar a disponível
    if (table.status === 'inactive' && newStatus !== 'available') {
      return { isValid: false, error: 'Mesa inativa só pode ser reativada para disponível' };
    }

    return { isValid: true };
  }

  /**
   * Verifica se a mesa pode ser reservada
   */
  static canReserve(table: Table): ValidationResult {
    if (!table.isActive) {
      return { isValid: false, error: 'Mesa está inativa' };
    }

    if (table.status !== 'available') {
      return { isValid: false, error: 'Mesa não está disponível para reserva' };
    }

    return { isValid: true };
  }

  /**
   * Verifica se a mesa pode aceitar clientes
   */
  static canAcceptCustomers(table: Table): boolean {
    return table.isActive && canAcceptCustomers(table.status);
  }

  /**
   * Verifica se a mesa está ativa
   */
  static isActive(table: Table): boolean {
    return table.isActive && isTableActive(table.status);
  }

  /**
   * Verifica se a mesa está ocupada
   */
  static isOccupied(table: Table): boolean {
    return table.status === 'occupied' && !!table.currentSessionId;
  }

  /**
   * Verifica se a mesa está disponível
   */
  static isAvailable(table: Table): boolean {
    return table.isActive && table.status === 'available' && !table.currentSessionId;
  }

  /**
   * Agrupa mesas por status
   */
  static groupByStatus(tables: Table[]): Record<TableStatus, Table[]> {
    const groups: Record<TableStatus, Table[]> = {
      available: [],
      reserved: [],
      occupied: [],
      inactive: [],
    };

    tables.forEach((table) => {
      groups[table.status].push(table);
    });

    return groups;
  }

  /**
   * Agrupa mesas por localização
   */
  static groupByLocation(tables: Table[]): Record<Location, Table[]> {
    const groups: Record<Location, Table[]> = {
      circunvalacao: [],
      boavista: [],
    };

    tables.forEach((table) => {
      groups[table.location].push(table);
    });

    return groups;
  }

  /**
   * Conta mesas por status
   */
  static countByStatus(tables: Table[]): Record<TableStatus, number> {
    const counts: Record<TableStatus, number> = {
      available: 0,
      reserved: 0,
      occupied: 0,
      inactive: 0,
    };

    tables.forEach((table) => {
      counts[table.status]++;
    });

    return counts;
  }

  /**
   * Conta mesas por localização
   */
  static countByLocation(tables: Table[]): Record<Location, number> {
    const counts: Record<Location, number> = {
      circunvalacao: 0,
      boavista: 0,
    };

    tables.forEach((table) => {
      counts[table.location]++;
    });

    return counts;
  }

  /**
   * Ordena mesas por número
   */
  static sortByNumber(tables: Table[]): Table[] {
    return [...tables].sort((a, b) => a.number - b.number);
  }

  /**
   * Filtra mesas disponíveis
   */
  static filterAvailable(tables: Table[]): Table[] {
    return tables.filter((t) => this.isAvailable(t));
  }

  /**
   * Filtra mesas ocupadas
   */
  static filterOccupied(tables: Table[]): Table[] {
    return tables.filter((t) => this.isOccupied(t));
  }

  /**
   * Filtra mesas ativas
   */
  static filterActive(tables: Table[]): Table[] {
    return tables.filter((t) => this.isActive(t));
  }

  /**
   * Filtra mesas por localização
   */
  static filterByLocation(tables: Table[], location: Location): Table[] {
    return tables.filter((t) => t.location === location);
  }

  /**
   * Calcula o total de faturação das mesas ocupadas
   */
  static calculateOccupiedTotal(tables: TableFullStatus[]): number {
    return tables
      .filter((t) => t.activeSession)
      .reduce((sum, t) => sum + (t.activeSession?.totalAmount || 0), 0);
  }

  /**
   * Obtém estatísticas das mesas
   */
  static getStatistics(tables: TableFullStatus[]): {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
    inactive: number;
    occupancyRate: number;
    totalRevenue: number;
    averageRevenuePerTable: number;
  } {
    const counts = this.countByStatus(tables);
    const activeTables = counts.available + counts.occupied + counts.reserved;
    const occupancyRate = activeTables > 0 ? (counts.occupied / activeTables) * 100 : 0;
    const totalRevenue = this.calculateOccupiedTotal(tables);
    const averageRevenuePerTable = counts.occupied > 0 ? totalRevenue / counts.occupied : 0;

    return {
      total: tables.length,
      ...counts,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      totalRevenue,
      averageRevenuePerTable: Math.round(averageRevenuePerTable * 100) / 100,
    };
  }

  /**
   * Valida dados para criar uma mesa
   */
  static validateCreateData(data: {
    number?: number;
    name?: string;
    location?: Location;
  }): ValidationResult {
    if (!data.number || data.number < 1) {
      return { isValid: false, error: 'Número da mesa deve ser pelo menos 1' };
    }

    if (data.number > 999) {
      return { isValid: false, error: 'Número da mesa não pode exceder 999' };
    }

    if (!data.name || data.name.trim().length === 0) {
      return { isValid: false, error: 'Nome da mesa é obrigatório' };
    }

    if (!data.location) {
      return { isValid: false, error: 'Localização é obrigatória' };
    }

    return { isValid: true };
  }

  /**
   * Gera um nome para a mesa baseado no número
   */
  static generateTableName(number: number): string {
    return `Mesa ${number}`;
  }

  /**
   * Obtém a cor do status para UI
   */
  static getStatusColor(status: TableStatus): string {
    const colors: Record<TableStatus, string> = {
      available: 'green',
      reserved: 'yellow',
      occupied: 'red',
      inactive: 'gray',
    };
    return colors[status];
  }

  /**
   * Obtém o label do status
   */
  static getStatusLabel(status: TableStatus): string {
    const labels: Record<TableStatus, string> = {
      available: 'Disponível',
      reserved: 'Reservada',
      occupied: 'Ocupada',
      inactive: 'Inativa',
    };
    return labels[status];
  }
}

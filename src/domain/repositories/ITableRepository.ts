/**
 * ITableRepository - Interface do repositório de mesas
 * Define o contrato para acesso a dados de mesas
 */

import { Table, CreateTableData, UpdateTableData, TableWithWaiter, TableWithSession, TableFullStatus } from '../entities/Table';
import { TableStatus } from '../value-objects/TableStatus';
import { Location } from '../value-objects/Location';

/**
 * Filtros para busca de mesas
 */
export interface TableFilter {
  location?: Location;
  status?: TableStatus;
  isActive?: boolean;
  hasActiveSession?: boolean;
}

/**
 * Interface do repositório de mesas
 */
export interface ITableRepository {
  /**
   * Busca uma mesa por ID
   */
  findById(id: string): Promise<Table | null>;

  /**
   * Busca uma mesa por número e localização
   */
  findByNumber(number: number, location: Location): Promise<Table | null>;

  /**
   * Busca uma mesa por ID com empregado atribuído
   */
  findByIdWithWaiter(id: string): Promise<TableWithWaiter | null>;

  /**
   * Busca uma mesa por ID com sessão ativa
   */
  findByIdWithSession(id: string): Promise<TableWithSession | null>;

  /**
   * Busca uma mesa por ID com status completo
   */
  findByIdFullStatus(id: string): Promise<TableFullStatus | null>;

  /**
   * Busca todas as mesas com filtros opcionais
   */
  findAll(filter?: TableFilter): Promise<Table[]>;

  /**
   * Busca todas as mesas com status completo
   */
  findAllFullStatus(filter?: TableFilter): Promise<TableFullStatus[]>;

  /**
   * Busca mesas atribuídas a um empregado
   */
  findByWaiter(waiterId: string): Promise<TableWithSession[]>;

  /**
   * Cria uma nova mesa
   */
  create(data: CreateTableData): Promise<Table>;

  /**
   * Atualiza uma mesa
   */
  update(id: string, data: UpdateTableData): Promise<Table>;

  /**
   * Atualiza o status de uma mesa
   */
  updateStatus(id: string, status: TableStatus): Promise<Table>;

  /**
   * Remove uma mesa
   */
  delete(id: string): Promise<void>;

  /**
   * Conta mesas por status
   */
  countByStatus(location?: Location): Promise<Record<TableStatus, number>>;
}

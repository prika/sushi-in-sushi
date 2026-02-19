/**
 * ISessionRepository - Interface do repositório de sessões
 * Define o contrato para acesso a dados de sessões
 */

import { Session, CreateSessionData, UpdateSessionData, SessionWithTable, SessionWithOrders } from '../entities/Session';
import { SessionStatus } from '../value-objects/SessionStatus';
import { Location } from '../value-objects/Location';

/**
 * Filtros para busca de sessões
 */
export interface SessionFilter {
  tableId?: string;
  status?: SessionStatus;
  statuses?: SessionStatus[];
  location?: Location;
  fromDate?: Date;
  toDate?: Date;
  isRodizio?: boolean;
}

/**
 * Interface do repositório de sessões
 */
export interface ISessionRepository {
  /**
   * Busca uma sessão por ID
   */
  findById(id: string): Promise<Session | null>;

  /**
   * Busca uma sessão por ID com informações da mesa
   */
  findByIdWithTable(id: string): Promise<SessionWithTable | null>;

  /**
   * Busca uma sessão por ID com pedidos
   */
  findByIdWithOrders(id: string): Promise<SessionWithOrders | null>;

  /**
   * Busca a sessão ativa de uma mesa
   */
  findActiveByTable(tableId: string): Promise<Session | null>;

  /**
   * Busca todas as sessões com filtros opcionais
   */
  findAll(filter?: SessionFilter): Promise<Session[]>;

  /**
   * Busca sessões ativas
   */
  findActive(location?: Location): Promise<SessionWithTable[]>;

  /**
   * Cria uma nova sessão
   */
  create(data: CreateSessionData): Promise<Session>;

  /**
   * Atualiza uma sessão
   */
  update(id: string, data: UpdateSessionData): Promise<Session>;

  /**
   * Atualiza o status de uma sessão
   */
  updateStatus(id: string, status: SessionStatus): Promise<Session>;

  /**
   * Fecha uma sessão
   */
  close(id: string): Promise<Session>;

  /**
   * Conta sessões por status
   */
  countByStatus(location?: Location): Promise<Record<SessionStatus, number>>;

  /**
   * Calcula o total de uma sessão
   */
  calculateTotal(id: string): Promise<number>;
}

/**
 * Table Entity
 * Representa uma mesa do restaurante no domínio
 */

import { Location } from '../value-objects/Location';
import { TableStatus } from '../value-objects/TableStatus';

/**
 * Entidade Table - Representa uma mesa
 */
export interface Table {
  id: string;
  number: number;
  name: string;
  location: Location;
  status: TableStatus;
  isActive: boolean;
  currentSessionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dados para criar uma nova mesa
 */
export interface CreateTableData {
  number: number;
  name: string;
  location: Location;
  isActive?: boolean;
}

/**
 * Dados para atualizar uma mesa
 */
export interface UpdateTableData {
  number?: number;
  name?: string;
  location?: Location;
  status?: TableStatus;
  isActive?: boolean;
  currentSessionId?: string | null;
}

/**
 * Table com informações do empregado atribuído
 */
export interface TableWithWaiter extends Table {
  waiter: {
    id: string;
    name: string;
  } | null;
}

/**
 * Table com sessão ativa
 */
export interface TableWithSession extends Table {
  activeSession: {
    id: string;
    isRodizio: boolean;
    numPeople: number;
    startedAt: Date;
    totalAmount: number;
  } | null;
}

/**
 * Table completa com todas as informações
 */
export interface TableFullStatus extends TableWithWaiter {
  activeSession: {
    id: string;
    isRodizio: boolean;
    numPeople: number;
    startedAt: Date;
    totalAmount: number;
    pendingOrdersCount: number;
  } | null;
}

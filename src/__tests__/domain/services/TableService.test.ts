import { describe, it, expect } from 'vitest';
import { TableService } from '@/domain/services/TableService';
import { Table, TableFullStatus } from '@/domain/entities/Table';

// Helper para criar mesa de teste
function createTestTable(overrides: Partial<Table> = {}): Table {
  return {
    id: '1',
    number: 1,
    name: 'Mesa 1',
    location: 'circunvalacao',
    status: 'available',
    isActive: true,
    currentSessionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createTestTableWithSession(overrides: Partial<TableFullStatus> = {}): TableFullStatus {
  return {
    ...createTestTable(overrides),
    waiter: null,
    activeSession: null,
    ...overrides,
  };
}

describe('TableService', () => {
  describe('canStartSession', () => {
    it('deve permitir iniciar sessão em mesa disponível', () => {
      const table = createTestTable({ status: 'available' });
      const result = TableService.canStartSession(table);
      expect(result.isValid).toBe(true);
    });

    it('deve impedir iniciar sessão em mesa inativa', () => {
      const table = createTestTable({ isActive: false });
      const result = TableService.canStartSession(table);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('inativa');
    });

    it('deve impedir iniciar sessão em mesa ocupada', () => {
      const table = createTestTable({ status: 'occupied', currentSessionId: 'session-1' });
      const result = TableService.canStartSession(table);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('ocupada');
    });

    it('deve impedir iniciar sessão em mesa com sessão ativa', () => {
      const table = createTestTable({ status: 'available', currentSessionId: 'session-1' });
      const result = TableService.canStartSession(table);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('sessão ativa');
    });
  });

  describe('canCloseSession', () => {
    it('deve permitir fechar sessão em mesa ocupada', () => {
      const table = createTestTable({ status: 'occupied', currentSessionId: 'session-1' });
      const result = TableService.canCloseSession(table);
      expect(result.isValid).toBe(true);
    });

    it('deve impedir fechar sessão em mesa não ocupada', () => {
      const table = createTestTable({ status: 'available' });
      const result = TableService.canCloseSession(table);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('não está ocupada');
    });

    it('deve impedir fechar sessão em mesa sem sessão ativa', () => {
      const table = createTestTable({ status: 'occupied', currentSessionId: null });
      const result = TableService.canCloseSession(table);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('não tem sessão ativa');
    });
  });

  describe('canChangeStatus', () => {
    it('deve permitir mudar status de available para occupied', () => {
      const table = createTestTable({ status: 'available' });
      const result = TableService.canChangeStatus(table, 'occupied');
      expect(result.isValid).toBe(true);
    });

    it('deve impedir mudar para o mesmo status', () => {
      const table = createTestTable({ status: 'available' });
      const result = TableService.canChangeStatus(table, 'available');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('já está neste estado');
    });

    it('deve impedir mudar para available quando tem sessão ativa', () => {
      const table = createTestTable({ status: 'occupied', currentSessionId: 'session-1' });
      const result = TableService.canChangeStatus(table, 'available');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('sessão ativa');
    });

    it('deve impedir mudar para reserved quando tem sessão ativa', () => {
      const table = createTestTable({ status: 'occupied', currentSessionId: 'session-1' });
      const result = TableService.canChangeStatus(table, 'reserved');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('sessão ativa');
    });

    it('deve permitir mudar de inactive apenas para available', () => {
      const table = createTestTable({ status: 'inactive' });
      const result = TableService.canChangeStatus(table, 'available');
      expect(result.isValid).toBe(true);
    });

    it('deve impedir mudar de inactive para occupied', () => {
      const table = createTestTable({ status: 'inactive' });
      const result = TableService.canChangeStatus(table, 'occupied');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('só pode ser reativada');
    });
  });

  describe('canReserve', () => {
    it('deve permitir reservar mesa disponível', () => {
      const table = createTestTable({ status: 'available' });
      const result = TableService.canReserve(table);
      expect(result.isValid).toBe(true);
    });

    it('deve impedir reservar mesa inativa', () => {
      const table = createTestTable({ isActive: false });
      const result = TableService.canReserve(table);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('inativa');
    });

    it('deve impedir reservar mesa ocupada', () => {
      const table = createTestTable({ status: 'occupied' });
      const result = TableService.canReserve(table);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('não está disponível');
    });
  });

  describe('Status checks', () => {
    it('canAcceptCustomers deve retornar true para mesa ativa e disponível', () => {
      const table = createTestTable({ status: 'available', isActive: true });
      expect(TableService.canAcceptCustomers(table)).toBe(true);
    });

    it('canAcceptCustomers deve retornar false para mesa inativa', () => {
      const table = createTestTable({ isActive: false });
      expect(TableService.canAcceptCustomers(table)).toBe(false);
    });

    it('isActive deve retornar true para mesa ativa', () => {
      const table = createTestTable({ isActive: true, status: 'available' });
      expect(TableService.isActive(table)).toBe(true);
    });

    it('isOccupied deve retornar true apenas com status occupied e sessão', () => {
      const table1 = createTestTable({ status: 'occupied', currentSessionId: 'session-1' });
      expect(TableService.isOccupied(table1)).toBe(true);

      const table2 = createTestTable({ status: 'occupied', currentSessionId: null });
      expect(TableService.isOccupied(table2)).toBe(false);

      const table3 = createTestTable({ status: 'available', currentSessionId: 'session-1' });
      expect(TableService.isOccupied(table3)).toBe(false);
    });

    it('isAvailable deve retornar true apenas se ativa, disponível e sem sessão', () => {
      const table1 = createTestTable({ isActive: true, status: 'available', currentSessionId: null });
      expect(TableService.isAvailable(table1)).toBe(true);

      const table2 = createTestTable({ isActive: false, status: 'available', currentSessionId: null });
      expect(TableService.isAvailable(table2)).toBe(false);

      const table3 = createTestTable({ isActive: true, status: 'occupied', currentSessionId: null });
      expect(TableService.isAvailable(table3)).toBe(false);

      const table4 = createTestTable({ isActive: true, status: 'available', currentSessionId: 'session-1' });
      expect(TableService.isAvailable(table4)).toBe(false);
    });
  });

  describe('Grouping and filtering', () => {
    const tables: Table[] = [
      createTestTable({ id: '1', status: 'available', location: 'circunvalacao' }),
      createTestTable({ id: '2', status: 'occupied', location: 'circunvalacao' }),
      createTestTable({ id: '3', status: 'reserved', location: 'boavista' }),
      createTestTable({ id: '4', status: 'inactive', location: 'boavista' }),
      createTestTable({ id: '5', status: 'available', location: 'boavista' }),
    ];

    it('groupByStatus deve agrupar corretamente', () => {
      const groups = TableService.groupByStatus(tables);
      expect(groups.available).toHaveLength(2);
      expect(groups.occupied).toHaveLength(1);
      expect(groups.reserved).toHaveLength(1);
      expect(groups.inactive).toHaveLength(1);
    });

    it('groupByLocation deve agrupar corretamente', () => {
      const groups = TableService.groupByLocation(tables);
      expect(groups.circunvalacao).toHaveLength(2);
      expect(groups.boavista).toHaveLength(3);
    });

    it('countByStatus deve contar corretamente', () => {
      const counts = TableService.countByStatus(tables);
      expect(counts.available).toBe(2);
      expect(counts.occupied).toBe(1);
      expect(counts.reserved).toBe(1);
      expect(counts.inactive).toBe(1);
    });

    it('countByLocation deve contar corretamente', () => {
      const counts = TableService.countByLocation(tables);
      expect(counts.circunvalacao).toBe(2);
      expect(counts.boavista).toBe(3);
    });

    it('sortByNumber deve ordenar por número', () => {
      const unsorted = [
        createTestTable({ number: 5 }),
        createTestTable({ number: 1 }),
        createTestTable({ number: 3 }),
      ];
      const sorted = TableService.sortByNumber(unsorted);
      expect(sorted[0].number).toBe(1);
      expect(sorted[1].number).toBe(3);
      expect(sorted[2].number).toBe(5);
    });

    it('filterAvailable deve retornar apenas mesas disponíveis', () => {
      const available = TableService.filterAvailable(tables);
      expect(available).toHaveLength(2);
      available.forEach(t => {
        expect(t.status).toBe('available');
        expect(t.isActive).toBe(true);
        expect(t.currentSessionId).toBeNull();
      });
    });

    it('filterOccupied deve retornar apenas mesas ocupadas', () => {
      const occupied = TableService.filterOccupied([
        createTestTable({ id: '1', status: 'occupied', currentSessionId: 'session-1' }),
        createTestTable({ id: '2', status: 'occupied', currentSessionId: null }),
        createTestTable({ id: '3', status: 'available' }),
      ]);
      expect(occupied).toHaveLength(1);
      expect(occupied[0].id).toBe('1');
    });

    it('filterActive deve retornar apenas mesas ativas', () => {
      const tablesWithInactive = [
        ...tables,
        createTestTable({ id: '6', isActive: false }),
      ];
      const active = TableService.filterActive(tablesWithInactive);
      // Note: table 4 has status='inactive' which also fails isTableActive check
      // So we expect 4, not 5 (excludes table 4 and table 6)
      expect(active).toHaveLength(4);
    });

    it('filterByLocation deve filtrar por localização', () => {
      const circunvalacao = TableService.filterByLocation(tables, 'circunvalacao');
      expect(circunvalacao).toHaveLength(2);
      circunvalacao.forEach(t => expect(t.location).toBe('circunvalacao'));

      const boavista = TableService.filterByLocation(tables, 'boavista');
      expect(boavista).toHaveLength(3);
      boavista.forEach(t => expect(t.location).toBe('boavista'));
    });
  });

  describe('Statistics', () => {
    it('calculateOccupiedTotal deve calcular total de faturação', () => {
      const tables: TableFullStatus[] = [
        createTestTableWithSession({
          status: 'occupied',
          activeSession: {
            id: '1',
            isRodizio: false,
            numPeople: 2,
            startedAt: new Date(),
            totalAmount: 50.5,
            pendingOrdersCount: 3,
          },
        }),
        createTestTableWithSession({
          status: 'occupied',
          activeSession: {
            id: '2',
            isRodizio: false,
            numPeople: 4,
            startedAt: new Date(),
            totalAmount: 75.25,
            pendingOrdersCount: 5,
          },
        }),
        createTestTableWithSession({ status: 'available', activeSession: null }),
      ];

      const total = TableService.calculateOccupiedTotal(tables);
      expect(total).toBe(125.75);
    });

    it('getStatistics deve calcular estatísticas corretamente', () => {
      const tables: TableFullStatus[] = [
        createTestTableWithSession({ status: 'available' }),
        createTestTableWithSession({ status: 'available' }),
        createTestTableWithSession({
          status: 'occupied',
          activeSession: {
            id: '1',
            isRodizio: false,
            numPeople: 2,
            startedAt: new Date(),
            totalAmount: 100,
            pendingOrdersCount: 3,
          },
        }),
        createTestTableWithSession({
          status: 'occupied',
          activeSession: {
            id: '2',
            isRodizio: false,
            numPeople: 4,
            startedAt: new Date(),
            totalAmount: 200,
            pendingOrdersCount: 5,
          },
        }),
        createTestTableWithSession({ status: 'reserved' }),
        createTestTableWithSession({ status: 'inactive' }),
      ];

      const stats = TableService.getStatistics(tables);

      expect(stats.total).toBe(6);
      expect(stats.available).toBe(2);
      expect(stats.occupied).toBe(2);
      expect(stats.reserved).toBe(1);
      expect(stats.inactive).toBe(1);
      expect(stats.occupancyRate).toBe(40); // 2/5 * 100 = 40%
      expect(stats.totalRevenue).toBe(300);
      expect(stats.averageRevenuePerTable).toBe(150);
    });

    it('getStatistics deve retornar 0 quando não há mesas ativas', () => {
      const tables: TableFullStatus[] = [
        createTestTableWithSession({ status: 'inactive' }),
      ];

      const stats = TableService.getStatistics(tables);

      expect(stats.occupancyRate).toBe(0);
      expect(stats.totalRevenue).toBe(0);
      expect(stats.averageRevenuePerTable).toBe(0);
    });
  });

  describe('Validation', () => {
    it('validateCreateData deve aceitar dados válidos', () => {
      const result = TableService.validateCreateData({
        number: 1,
        name: 'Mesa 1',
        location: 'circunvalacao',
      });
      expect(result.isValid).toBe(true);
    });

    it('validateCreateData deve rejeitar número inválido', () => {
      const result1 = TableService.validateCreateData({
        number: 0,
        name: 'Mesa 1',
        location: 'circunvalacao',
      });
      expect(result1.isValid).toBe(false);
      expect(result1.error).toContain('pelo menos 1');

      const result2 = TableService.validateCreateData({
        number: 1000,
        name: 'Mesa 1',
        location: 'circunvalacao',
      });
      expect(result2.isValid).toBe(false);
      expect(result2.error).toContain('não pode exceder 999');
    });

    it('validateCreateData deve rejeitar nome vazio', () => {
      const result = TableService.validateCreateData({
        number: 1,
        name: '',
        location: 'circunvalacao',
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('obrigatório');
    });

    it('validateCreateData deve rejeitar sem localização', () => {
      const result = TableService.validateCreateData({
        number: 1,
        name: 'Mesa 1',
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Localização');
    });
  });

  describe('Utility functions', () => {
    it('generateTableName deve gerar nome correto', () => {
      expect(TableService.generateTableName(1)).toBe('Mesa 1');
      expect(TableService.generateTableName(10)).toBe('Mesa 10');
    });

    it('getStatusColor deve retornar cor correta', () => {
      expect(TableService.getStatusColor('available')).toBe('green');
      expect(TableService.getStatusColor('reserved')).toBe('yellow');
      expect(TableService.getStatusColor('occupied')).toBe('red');
      expect(TableService.getStatusColor('inactive')).toBe('gray');
    });

    it('getStatusLabel deve retornar label correto', () => {
      expect(TableService.getStatusLabel('available')).toBe('Disponível');
      expect(TableService.getStatusLabel('reserved')).toBe('Reservada');
      expect(TableService.getStatusLabel('occupied')).toBe('Ocupada');
      expect(TableService.getStatusLabel('inactive')).toBe('Inativa');
    });
  });
});

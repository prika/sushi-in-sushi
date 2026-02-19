import { describe, it, expect } from 'vitest';
import { WaiterAssignmentService, WaiterWithLoad } from '@/domain/services/WaiterAssignmentService';

describe('WaiterAssignmentService', () => {
  describe('selectLeastBusyWaiter', () => {
    it('deve retornar null quando lista vazia', () => {
      expect(WaiterAssignmentService.selectLeastBusyWaiter([])).toBeNull();
    });

    it('deve selecionar waiter com menos mesas ocupadas', () => {
      const waiters: WaiterWithLoad[] = [
        { staffId: 'w1', staffName: 'Alice', occupiedTableCount: 3 },
        { staffId: 'w2', staffName: 'Bob', occupiedTableCount: 1 },
        { staffId: 'w3', staffName: 'Carol', occupiedTableCount: 2 },
      ];
      const result = WaiterAssignmentService.selectLeastBusyWaiter(waiters);
      expect(result?.staffId).toBe('w2');
      expect(result?.staffName).toBe('Bob');
    });

    it('deve desempatar por staffId (determinístico)', () => {
      const waiters: WaiterWithLoad[] = [
        { staffId: 'w2', staffName: 'Bob', occupiedTableCount: 1 },
        { staffId: 'w1', staffName: 'Alice', occupiedTableCount: 1 },
      ];
      const result = WaiterAssignmentService.selectLeastBusyWaiter(waiters);
      expect(result?.staffId).toBe('w1');
    });

    it('deve selecionar o único waiter disponível', () => {
      const waiters: WaiterWithLoad[] = [
        { staffId: 'w1', staffName: 'Alice', occupiedTableCount: 5 },
      ];
      const result = WaiterAssignmentService.selectLeastBusyWaiter(waiters);
      expect(result?.staffId).toBe('w1');
    });

    it('deve preferir waiter com 0 mesas ocupadas', () => {
      const waiters: WaiterWithLoad[] = [
        { staffId: 'w1', staffName: 'Alice', occupiedTableCount: 2 },
        { staffId: 'w2', staffName: 'Bob', occupiedTableCount: 0 },
        { staffId: 'w3', staffName: 'Carol', occupiedTableCount: 1 },
      ];
      const result = WaiterAssignmentService.selectLeastBusyWaiter(waiters);
      expect(result?.staffId).toBe('w2');
    });

    it('não deve alterar o array original', () => {
      const waiters: WaiterWithLoad[] = [
        { staffId: 'w3', staffName: 'Carol', occupiedTableCount: 3 },
        { staffId: 'w1', staffName: 'Alice', occupiedTableCount: 1 },
      ];
      WaiterAssignmentService.selectLeastBusyWaiter(waiters);
      expect(waiters[0].staffId).toBe('w3');
    });
  });
});

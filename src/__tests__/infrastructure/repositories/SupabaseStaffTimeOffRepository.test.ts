import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseStaffTimeOffRepository } from '@/infrastructure/repositories/SupabaseStaffTimeOffRepository';

// Mock Supabase client com padrão thenable
function createMockSupabaseClient() {
  // Criar um único builder que será reutilizado
  let sharedBuilder: any = null;
  let sharedResult: any = { data: [], error: null };

  const createQueryBuilder = () => {
    if (sharedBuilder) return sharedBuilder;

    const builder: any = {};

    const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gte', 'lte', 'or', 'order', 'single'];

    chainMethods.forEach(method => {
      builder[method] = vi.fn(() => builder);
    });

    // Tornar o builder thenable (pode ser usado com await)
    builder.then = (onFulfilled: (_value: any) => any) => Promise.resolve(sharedResult).then(onFulfilled);
    builder.catch = (onRejected: (_reason: any) => any) => Promise.resolve(sharedResult).catch(onRejected);

    // Método helper para definir o resultado
    builder.setMockResult = (value: any) => {
      sharedResult = value;
    };

    sharedBuilder = builder;
    return builder;
  };

  const mockClient = {
    from: vi.fn((_table: string) => createQueryBuilder()),
    _resetBuilder: () => {
      sharedBuilder = null;
      sharedResult = { data: [], error: null };
    },
  };

  return mockClient;
}

describe('SupabaseStaffTimeOffRepository', () => {
  let repository: SupabaseStaffTimeOffRepository;
  let mockSupabase: any;
  let _builder: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    repository = new SupabaseStaffTimeOffRepository(mockSupabase);
    _builder = mockSupabase.from('staff_time_off');
    mockSupabase._resetBuilder();
    _builder = mockSupabase.from('staff_time_off');
  });

  describe('findAll', () => {
    it('deve retornar lista de ausências', async () => {
      const mockData = [
        {
          id: 1,
          staff_id: '123e4567-e89b-12d3-a456-426614174000',
          start_date: '2024-12-20',
          end_date: '2024-12-25',
          type: 'vacation',
          reason: 'Férias',
          status: 'approved',
          approved_by: null,
          approved_at: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          staff: { id: '123e4567-e89b-12d3-a456-426614174000', name: 'João Silva' },
          approver: null,
        },
      ];

      const builder = mockSupabase.from('staff_time_off');
      builder.setMockResult({ data: mockData, error: null });

      const result = await repository.findAll();

      expect(mockSupabase.from).toHaveBeenCalledWith('staff_time_off');
      expect(result).toHaveLength(1);
      expect(result[0].staffId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result[0].type).toBe('vacation');
    });

    it('deve aplicar filtro de staffId', async () => {
      const builder = mockSupabase.from('staff_time_off');
      builder.setMockResult({ data: [], error: null });

      await repository.findAll({ staffId: '123e4567-e89b-12d3-a456-426614174000' });

      expect(builder.eq).toHaveBeenCalledWith('staff_id', '123e4567-e89b-12d3-a456-426614174000');
    });

    it('deve aplicar filtro de mês e ano', async () => {
      const builder = mockSupabase.from('staff_time_off');
      builder.setMockResult({ data: [], error: null });

      await repository.findAll({ month: 0, year: 2024 });

      expect(builder.gte).toHaveBeenCalled();
      expect(builder.lte).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('deve retornar ausência por ID', async () => {
      const mockData = {
        id: 1,
        staff_id: '123e4567-e89b-12d3-a456-426614174000',
        start_date: '2024-12-20',
        end_date: '2024-12-25',
        type: 'vacation',
        reason: 'Férias',
        status: 'approved',
        approved_by: null,
        approved_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        staff: { id: '123e4567-e89b-12d3-a456-426614174000', name: 'João Silva' },
        approver: null,
      };

      const builder = mockSupabase.from('staff_time_off');
      builder.setMockResult({ data: mockData, error: null });

      const result = await repository.findById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.staffId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('deve retornar null se não encontrado', async () => {
      const builder = mockSupabase.from('staff_time_off');
      builder.setMockResult({ data: null, error: { code: 'PGRST116', message: 'Not found' } });

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('deve criar ausência com sucesso', async () => {
      const mockData = {
        id: 1,
        staff_id: '123e4567-e89b-12d3-a456-426614174000',
        start_date: '2024-12-20',
        end_date: '2024-12-25',
        type: 'vacation',
        reason: 'Férias',
        status: 'approved',
        approved_by: null,
        approved_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const builder = mockSupabase.from('staff_time_off');
      builder.setMockResult({ data: mockData, error: null });

      const result = await repository.create({
        staffId: '123e4567-e89b-12d3-a456-426614174000',
        startDate: '2024-12-20',
        endDate: '2024-12-25',
        type: 'vacation',
        reason: 'Férias',
      });

      expect(result.id).toBe(1);
      expect(result.type).toBe('vacation');
    });
  });

  describe('update', () => {
    it('deve atualizar ausência com sucesso', async () => {
      const mockData = {
        id: 1,
        staff_id: '123e4567-e89b-12d3-a456-426614174000',
        start_date: '2024-12-20',
        end_date: '2024-12-26',
        type: 'vacation',
        reason: 'Férias estendidas',
        status: 'approved',
        approved_by: null,
        approved_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const builder = mockSupabase.from('staff_time_off');
      builder.setMockResult({ data: mockData, error: null });

      const result = await repository.update(1, {
        endDate: '2024-12-26',
        reason: 'Férias estendidas',
      });

      expect(result.endDate).toBe('2024-12-26');
      expect(result.reason).toBe('Férias estendidas');
    });
  });

  describe('findOverlapping', () => {
    it('deve encontrar ausências sobrepostas', async () => {
      const mockData = [
        {
          id: 2,
          staff_id: '123e4567-e89b-12d3-a456-426614174000',
          start_date: '2024-12-22',
          end_date: '2024-12-28',
          type: 'vacation',
          reason: null,
          status: 'approved',
          approved_by: null,
          approved_at: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const builder = mockSupabase.from('staff_time_off');
      builder.setMockResult({ data: mockData, error: null });

      const result = await repository.findOverlapping(
        '123e4567-e89b-12d3-a456-426614174000',
        '2024-12-20',
        '2024-12-25'
      );

      expect(result).toHaveLength(1);
      expect(builder.eq).toHaveBeenCalledWith('staff_id', '123e4567-e89b-12d3-a456-426614174000');
      expect(builder.lte).toHaveBeenCalledWith('start_date', '2024-12-25');
      expect(builder.gte).toHaveBeenCalledWith('end_date', '2024-12-20');
    });

    it('deve excluir ID específico ao verificar sobreposição', async () => {
      const builder = mockSupabase.from('staff_time_off');
      builder.setMockResult({ data: [], error: null });

      await repository.findOverlapping(
        '123e4567-e89b-12d3-a456-426614174000',
        '2024-12-20',
        '2024-12-25',
        1
      );

      expect(builder.neq).toHaveBeenCalledWith('id', 1);
    });
  });

  describe('delete', () => {
    it('deve remover ausência com sucesso', async () => {
      const builder = mockSupabase.from('staff_time_off');
      builder.setMockResult({ data: null, error: null });

      await repository.delete(1);

      expect(mockSupabase.from).toHaveBeenCalledWith('staff_time_off');
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 1);
    });
  });
});

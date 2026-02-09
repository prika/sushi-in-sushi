import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IRestaurantRepository } from '@/domain/repositories/IRestaurantRepository';
import {
  Restaurant,
  CreateRestaurantData,
  UpdateRestaurantData,
} from '@/domain/entities/Restaurant';
import {
  GetAllRestaurantsUseCase,
  GetActiveRestaurantsUseCase,
  CreateRestaurantUseCase,
  UpdateRestaurantUseCase,
  DeleteRestaurantUseCase,
} from '@/application/use-cases/restaurants';

// Mock Restaurant data
const mockRestaurant: Restaurant = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Circunvalação',
  slug: 'circunvalacao',
  address: 'Via de Circunvalação, Porto',
  latitude: 41.1621,
  longitude: -8.6369,
  maxCapacity: 50,
  defaultPeoplePerTable: 4,
  autoTableAssignment: false,
  autoReservations: false,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockRestaurant2: Restaurant = {
  ...mockRestaurant,
  id: '223e4567-e89b-12d3-a456-426614174000',
  name: 'Boavista',
  slug: 'boavista',
  address: 'Avenida da Boavista, Porto',
};

const mockInactiveRestaurant: Restaurant = {
  ...mockRestaurant,
  id: '323e4567-e89b-12d3-a456-426614174000',
  name: 'Matosinhos',
  slug: 'matosinhos',
  isActive: false,
};

// Mock Repository
const createMockRepository = (): IRestaurantRepository => ({
  findAll: vi.fn(),
  findActive: vi.fn(),
  findById: vi.fn(),
  findBySlug: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  validateSlugUnique: vi.fn(),
});

describe('Restaurants Use Cases', () => {
  let mockRepository: IRestaurantRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    vi.clearAllMocks();
  });

  // =====================================================
  // GetAllRestaurantsUseCase
  // =====================================================
  describe('GetAllRestaurantsUseCase', () => {
    it('deve retornar todos os restaurantes', async () => {
      const allRestaurants = [mockRestaurant, mockRestaurant2, mockInactiveRestaurant];
      vi.mocked(mockRepository.findAll).mockResolvedValue(allRestaurants);

      const useCase = new GetAllRestaurantsUseCase(mockRepository);
      const result = await useCase.execute();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data).toEqual(allRestaurants);
      }
      expect(mockRepository.findAll).toHaveBeenCalledWith(undefined);
    });

    it('deve retornar restaurantes filtrados por isActive', async () => {
      const activeRestaurants = [mockRestaurant, mockRestaurant2];
      vi.mocked(mockRepository.findAll).mockResolvedValue(activeRestaurants);

      const useCase = new GetAllRestaurantsUseCase(mockRepository);
      const result = await useCase.execute({ filter: { isActive: true } });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every((r) => r.isActive)).toBe(true);
      }
      expect(mockRepository.findAll).toHaveBeenCalledWith({ isActive: true });
    });

    it('deve retornar restaurantes filtrados por slug', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([mockRestaurant]);

      const useCase = new GetAllRestaurantsUseCase(mockRepository);
      const result = await useCase.execute({ filter: { slug: 'circunvalacao' } });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].slug).toBe('circunvalacao');
      }
    });

    it('deve retornar erro quando o repositório falha', async () => {
      vi.mocked(mockRepository.findAll).mockRejectedValue(
        new Error('Database connection failed')
      );

      const useCase = new GetAllRestaurantsUseCase(mockRepository);
      const result = await useCase.execute();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });
  });

  // =====================================================
  // GetActiveRestaurantsUseCase
  // =====================================================
  describe('GetActiveRestaurantsUseCase', () => {
    it('deve retornar apenas restaurantes ativos', async () => {
      const activeRestaurants = [mockRestaurant, mockRestaurant2];
      vi.mocked(mockRepository.findActive).mockResolvedValue(activeRestaurants);

      const useCase = new GetActiveRestaurantsUseCase(mockRepository);
      const result = await useCase.execute();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every((r) => r.isActive)).toBe(true);
      }
      expect(mockRepository.findActive).toHaveBeenCalledTimes(1);
    });

    it('deve retornar array vazio quando não há restaurantes ativos', async () => {
      vi.mocked(mockRepository.findActive).mockResolvedValue([]);

      const useCase = new GetActiveRestaurantsUseCase(mockRepository);
      const result = await useCase.execute();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it('deve retornar erro quando o repositório falha', async () => {
      vi.mocked(mockRepository.findActive).mockRejectedValue(
        new Error('Network error')
      );

      const useCase = new GetActiveRestaurantsUseCase(mockRepository);
      const result = await useCase.execute();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Network error');
      }
    });
  });

  // =====================================================
  // CreateRestaurantUseCase
  // =====================================================
  describe('CreateRestaurantUseCase', () => {
    const validCreateData: CreateRestaurantData = {
      name: 'Matosinhos',
      slug: 'matosinhos',
      address: 'Avenida de Matosinhos, Porto',
      latitude: 41.1803,
      longitude: -8.6891,
      maxCapacity: 35,
      defaultPeoplePerTable: 4,
      autoTableAssignment: false,
      autoReservations: false,
      isActive: true,
    };

    it('deve criar restaurante com sucesso', async () => {
      const createdRestaurant = { ...mockRestaurant, ...validCreateData };
      vi.mocked(mockRepository.validateSlugUnique).mockResolvedValue(true);
      vi.mocked(mockRepository.create).mockResolvedValue(createdRestaurant);

      const useCase = new CreateRestaurantUseCase(mockRepository);
      const result = await useCase.execute(validCreateData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(validCreateData.name);
        expect(result.data.slug).toBe(validCreateData.slug);
      }
      expect(mockRepository.validateSlugUnique).toHaveBeenCalledWith('matosinhos');
      expect(mockRepository.create).toHaveBeenCalledWith(validCreateData);
    });

    it('deve falhar quando nome está vazio', async () => {
      const invalidData = { ...validCreateData, name: '' };

      const useCase = new CreateRestaurantUseCase(mockRepository);
      const result = await useCase.execute(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Nome do restaurante é obrigatório');
        expect(result.code).toBe('INVALID_NAME');
      }
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('deve falhar quando slug está vazio', async () => {
      const invalidData = { ...validCreateData, slug: '' };

      const useCase = new CreateRestaurantUseCase(mockRepository);
      const result = await useCase.execute(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Código do restaurante é obrigatório');
        expect(result.code).toBe('INVALID_SLUG');
      }
    });

    it('deve falhar quando slug tem formato inválido (maiúsculas)', async () => {
      const invalidData = { ...validCreateData, slug: 'Matosinhos' };

      const useCase = new CreateRestaurantUseCase(mockRepository);
      const result = await useCase.execute(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('letras minúsculas');
        expect(result.code).toBe('INVALID_SLUG_FORMAT');
      }
    });

    it('deve falhar quando slug tem formato inválido (espaços)', async () => {
      const invalidData = { ...validCreateData, slug: 'mato sinhos' };

      const useCase = new CreateRestaurantUseCase(mockRepository);
      const result = await useCase.execute(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_SLUG_FORMAT');
      }
    });

    it('deve aceitar slug com hífens', async () => {
      const dataWithHyphen = { ...validCreateData, slug: 'porto-alegre' };
      vi.mocked(mockRepository.validateSlugUnique).mockResolvedValue(true);
      vi.mocked(mockRepository.create).mockResolvedValue({
        ...mockRestaurant,
        slug: 'porto-alegre',
      });

      const useCase = new CreateRestaurantUseCase(mockRepository);
      const result = await useCase.execute(dataWithHyphen);

      expect(result.success).toBe(true);
    });

    it('deve falhar quando slug já existe', async () => {
      vi.mocked(mockRepository.validateSlugUnique).mockResolvedValue(false);

      const useCase = new CreateRestaurantUseCase(mockRepository);
      const result = await useCase.execute(validCreateData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Já existe um restaurante com este código');
        expect(result.code).toBe('SLUG_EXISTS');
      }
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('deve falhar quando endereço está vazio', async () => {
      const invalidData = { ...validCreateData, address: '' };
      vi.mocked(mockRepository.validateSlugUnique).mockResolvedValue(true);

      const useCase = new CreateRestaurantUseCase(mockRepository);
      const result = await useCase.execute(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Endereço é obrigatório');
        expect(result.code).toBe('INVALID_ADDRESS');
      }
    });

    it('deve falhar quando maxCapacity é zero', async () => {
      const invalidData = { ...validCreateData, maxCapacity: 0 };
      vi.mocked(mockRepository.validateSlugUnique).mockResolvedValue(true);

      const useCase = new CreateRestaurantUseCase(mockRepository);
      const result = await useCase.execute(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Lotação máxima deve ser maior que zero');
        expect(result.code).toBe('INVALID_CAPACITY');
      }
    });

    it('deve falhar quando defaultPeoplePerTable é negativo', async () => {
      const invalidData = { ...validCreateData, defaultPeoplePerTable: -1 };
      vi.mocked(mockRepository.validateSlugUnique).mockResolvedValue(true);

      const useCase = new CreateRestaurantUseCase(mockRepository);
      const result = await useCase.execute(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Pessoas por mesa deve ser maior que zero');
        expect(result.code).toBe('INVALID_PEOPLE_PER_TABLE');
      }
    });

    it('deve criar restaurante com valores padrão para campos opcionais', async () => {
      const minimalData: CreateRestaurantData = {
        name: 'Minimal',
        slug: 'minimal',
        address: 'Minimal Address',
        maxCapacity: 20,
        defaultPeoplePerTable: 2,
      };

      vi.mocked(mockRepository.validateSlugUnique).mockResolvedValue(true);
      vi.mocked(mockRepository.create).mockResolvedValue({
        ...mockRestaurant,
        ...minimalData,
        latitude: null,
        longitude: null,
        autoTableAssignment: false,
        autoReservations: false,
        isActive: true,
      });

      const useCase = new CreateRestaurantUseCase(mockRepository);
      const result = await useCase.execute(minimalData);

      expect(result.success).toBe(true);
    });
  });

  // =====================================================
  // UpdateRestaurantUseCase
  // =====================================================
  describe('UpdateRestaurantUseCase', () => {
    const restaurantId = '123e4567-e89b-12d3-a456-426614174000';
    const validUpdateData: UpdateRestaurantData = {
      name: 'Circunvalação Atualizado',
      maxCapacity: 60,
    };

    it('deve atualizar restaurante com sucesso', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockRestaurant);
      vi.mocked(mockRepository.update).mockResolvedValue({
        ...mockRestaurant,
        ...validUpdateData,
      });

      const useCase = new UpdateRestaurantUseCase(mockRepository);
      const result = await useCase.execute({ id: restaurantId, data: validUpdateData });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Circunvalação Atualizado');
        expect(result.data.maxCapacity).toBe(60);
      }
      expect(mockRepository.findById).toHaveBeenCalledWith(restaurantId);
      expect(mockRepository.update).toHaveBeenCalledWith(restaurantId, validUpdateData);
    });

    it('deve falhar quando restaurante não existe', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const useCase = new UpdateRestaurantUseCase(mockRepository);
      const result = await useCase.execute({ id: restaurantId, data: validUpdateData });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Restaurante não encontrado');
        expect(result.code).toBe('NOT_FOUND');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('deve falhar quando nome é vazio', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockRestaurant);

      const useCase = new UpdateRestaurantUseCase(mockRepository);
      const result = await useCase.execute({
        id: restaurantId,
        data: { name: '' },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Nome do restaurante não pode estar vazio');
        expect(result.code).toBe('INVALID_NAME');
      }
    });

    it('deve falhar quando novo slug tem formato inválido', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockRestaurant);

      const useCase = new UpdateRestaurantUseCase(mockRepository);
      const result = await useCase.execute({
        id: restaurantId,
        data: { slug: 'Invalid Slug' },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_SLUG_FORMAT');
      }
    });

    it('deve falhar quando novo slug já existe em outro restaurante', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockRestaurant);
      vi.mocked(mockRepository.validateSlugUnique).mockResolvedValue(false);

      const useCase = new UpdateRestaurantUseCase(mockRepository);
      const result = await useCase.execute({
        id: restaurantId,
        data: { slug: 'boavista' },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Já existe um restaurante com este código');
        expect(result.code).toBe('SLUG_EXISTS');
      }
      expect(mockRepository.validateSlugUnique).toHaveBeenCalledWith('boavista', restaurantId);
    });

    it('deve permitir manter o mesmo slug', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockRestaurant);
      vi.mocked(mockRepository.validateSlugUnique).mockResolvedValue(true);
      vi.mocked(mockRepository.update).mockResolvedValue({
        ...mockRestaurant,
        name: 'Novo Nome',
      });

      const useCase = new UpdateRestaurantUseCase(mockRepository);
      const result = await useCase.execute({
        id: restaurantId,
        data: { slug: 'circunvalacao', name: 'Novo Nome' },
      });

      expect(result.success).toBe(true);
    });

    it('deve falhar quando maxCapacity é inválida', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockRestaurant);

      const useCase = new UpdateRestaurantUseCase(mockRepository);
      const result = await useCase.execute({
        id: restaurantId,
        data: { maxCapacity: -5 },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_CAPACITY');
      }
    });

    it('deve falhar quando defaultPeoplePerTable é inválido', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockRestaurant);

      const useCase = new UpdateRestaurantUseCase(mockRepository);
      const result = await useCase.execute({
        id: restaurantId,
        data: { defaultPeoplePerTable: 0 },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_PEOPLE_PER_TABLE');
      }
    });

    it('deve atualizar flags de automação', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockRestaurant);
      vi.mocked(mockRepository.update).mockResolvedValue({
        ...mockRestaurant,
        autoTableAssignment: true,
        autoReservations: true,
      });

      const useCase = new UpdateRestaurantUseCase(mockRepository);
      const result = await useCase.execute({
        id: restaurantId,
        data: { autoTableAssignment: true, autoReservations: true },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.autoTableAssignment).toBe(true);
        expect(result.data.autoReservations).toBe(true);
      }
    });

    it('deve atualizar status isActive', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockRestaurant);
      vi.mocked(mockRepository.update).mockResolvedValue({
        ...mockRestaurant,
        isActive: false,
      });

      const useCase = new UpdateRestaurantUseCase(mockRepository);
      const result = await useCase.execute({
        id: restaurantId,
        data: { isActive: false },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(false);
      }
    });
  });

  // =====================================================
  // DeleteRestaurantUseCase
  // =====================================================
  describe('DeleteRestaurantUseCase', () => {
    const restaurantId = '123e4567-e89b-12d3-a456-426614174000';

    it('deve eliminar restaurante com sucesso', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockRestaurant);
      vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

      const useCase = new DeleteRestaurantUseCase(mockRepository);
      const result = await useCase.execute(restaurantId);

      expect(result.success).toBe(true);
      expect(mockRepository.findById).toHaveBeenCalledWith(restaurantId);
      expect(mockRepository.delete).toHaveBeenCalledWith(restaurantId);
    });

    it('deve falhar quando restaurante não existe', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const useCase = new DeleteRestaurantUseCase(mockRepository);
      const result = await useCase.execute(restaurantId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Restaurante não encontrado');
        expect(result.code).toBe('NOT_FOUND');
      }
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('deve retornar erro quando o repositório falha', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockRestaurant);
      vi.mocked(mockRepository.delete).mockRejectedValue(
        new Error('Foreign key constraint')
      );

      const useCase = new DeleteRestaurantUseCase(mockRepository);
      const result = await useCase.execute(restaurantId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Foreign key constraint');
      }
    });
  });
});

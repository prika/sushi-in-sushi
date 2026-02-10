import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetDeviceProfileUseCase } from '@/application/use-cases/device-profiles/GetDeviceProfileUseCase';
import { UpsertDeviceProfileUseCase } from '@/application/use-cases/device-profiles/UpsertDeviceProfileUseCase';
import { IDeviceProfileRepository } from '@/domain/repositories/IDeviceProfileRepository';
import { DeviceProfile } from '@/domain/entities/DeviceProfile';

// Helper para criar perfil de dispositivo de teste
function createTestDeviceProfile(overrides: Partial<DeviceProfile> = {}): DeviceProfile {
  return {
    deviceId: 'device-abc-123',
    lastDisplayName: 'João',
    lastFullName: null,
    lastEmail: null,
    lastPhone: null,
    lastBirthDate: null,
    lastPreferredContact: 'email',
    highestTier: 1,
    linkedCustomerId: null,
    visitCount: 1,
    firstSeenAt: new Date('2024-01-01T12:00:00Z'),
    lastSeenAt: new Date('2024-01-01T12:00:00Z'),
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

// Mock do repositório
function createMockRepository(): IDeviceProfileRepository {
  return {
    findByDeviceId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    incrementVisitCount: vi.fn(),
  };
}

describe('GetDeviceProfileUseCase', () => {
  let useCase: GetDeviceProfileUseCase;
  let mockRepository: IDeviceProfileRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new GetDeviceProfileUseCase(mockRepository);
  });

  it('deve retornar perfil do dispositivo existente', async () => {
    const profile = createTestDeviceProfile();
    vi.mocked(mockRepository.findByDeviceId).mockResolvedValue(profile);

    const result = await useCase.execute('device-abc-123');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toBeNull();
      expect(result.data!.deviceId).toBe('device-abc-123');
      expect(result.data!.lastDisplayName).toBe('João');
    }
    expect(mockRepository.findByDeviceId).toHaveBeenCalledWith('device-abc-123');
  });

  it('deve retornar null para dispositivo desconhecido', async () => {
    vi.mocked(mockRepository.findByDeviceId).mockResolvedValue(null);

    const result = await useCase.execute('device-unknown');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('deve retornar erro para deviceId vazio', async () => {
    const result = await useCase.execute('');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DEVICE_ID');
      expect(result.error).toContain('Device ID');
    }
  });

  it('deve retornar erro para deviceId com apenas espaços', async () => {
    const result = await useCase.execute('   ');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DEVICE_ID');
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findByDeviceId).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute('device-abc-123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB Error');
    }
  });
});

describe('UpsertDeviceProfileUseCase', () => {
  let useCase: UpsertDeviceProfileUseCase;
  let mockRepository: IDeviceProfileRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new UpsertDeviceProfileUseCase(mockRepository);
  });

  it('deve criar perfil com tier 1 (apenas displayName)', async () => {
    const profile = createTestDeviceProfile({ highestTier: 1 });
    vi.mocked(mockRepository.upsert).mockResolvedValue(profile);

    const result = await useCase.execute({
      deviceId: 'device-abc-123',
      displayName: 'João',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.highestTier).toBe(1);
      expect(result.data.lastDisplayName).toBe('João');
    }
    expect(mockRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: 'device-abc-123',
        lastDisplayName: 'João',
        highestTier: 1,
      })
    );
  });

  it('deve criar perfil com tier 2 (displayName + email)', async () => {
    const profile = createTestDeviceProfile({
      highestTier: 2,
      lastEmail: 'joao@email.com',
    });
    vi.mocked(mockRepository.upsert).mockResolvedValue(profile);

    const result = await useCase.execute({
      deviceId: 'device-abc-123',
      displayName: 'João',
      email: 'joao@email.com',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.highestTier).toBe(2);
    }
    expect(mockRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        highestTier: 2,
        lastEmail: 'joao@email.com',
      })
    );
  });

  it('deve criar perfil com tier 3 (todos os campos)', async () => {
    const profile = createTestDeviceProfile({
      highestTier: 3,
      lastEmail: 'joao@email.com',
      lastPhone: '+351912345678',
      lastFullName: 'João Silva',
      lastBirthDate: '1990-05-15',
    });
    vi.mocked(mockRepository.upsert).mockResolvedValue(profile);

    const result = await useCase.execute({
      deviceId: 'device-abc-123',
      displayName: 'João',
      email: 'joao@email.com',
      phone: '+351912345678',
      fullName: 'João Silva',
      birthDate: '1990-05-15',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.highestTier).toBe(3);
    }
    expect(mockRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        highestTier: 3,
        lastFullName: 'João Silva',
        lastPhone: '+351912345678',
        lastBirthDate: '1990-05-15',
      })
    );
  });

  it('deve retornar erro para deviceId vazio', async () => {
    const result = await useCase.execute({
      deviceId: '',
      displayName: 'João',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DEVICE_ID');
    }
  });

  it('deve retornar erro para displayName vazio', async () => {
    const result = await useCase.execute({
      deviceId: 'device-abc-123',
      displayName: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_NAME');
      expect(result.error).toContain('Nome');
    }
  });

  it('deve retornar erro para displayName com apenas espaços', async () => {
    const result = await useCase.execute({
      deviceId: 'device-abc-123',
      displayName: '   ',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_NAME');
    }
  });

  it('deve fazer trim dos campos de texto', async () => {
    const profile = createTestDeviceProfile({
      lastDisplayName: 'João',
      lastFullName: 'João Silva',
      lastEmail: 'joao@email.com',
      lastPhone: '+351912345678',
    });
    vi.mocked(mockRepository.upsert).mockResolvedValue(profile);

    await useCase.execute({
      deviceId: 'device-abc-123',
      displayName: '  João  ',
      fullName: '  João Silva  ',
      email: '  joao@email.com  ',
      phone: '  +351912345678  ',
    });

    expect(mockRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        lastDisplayName: 'João',
        lastFullName: 'João Silva',
        lastEmail: 'joao@email.com',
        lastPhone: '+351912345678',
      })
    );
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.upsert).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute({
      deviceId: 'device-abc-123',
      displayName: 'João',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB Error');
    }
  });
});

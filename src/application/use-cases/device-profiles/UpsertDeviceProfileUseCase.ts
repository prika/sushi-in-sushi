import { IDeviceProfileRepository } from '@/domain/repositories/IDeviceProfileRepository';
import { DeviceProfile } from '@/domain/entities/DeviceProfile';
import { computeCustomerTier } from '@/domain/value-objects/CustomerTier';
import { Result, Results } from '../Result';

interface UpsertDeviceProfileInput {
  deviceId: string;
  displayName: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  preferredContact?: 'email' | 'phone' | 'none';
}

export class UpsertDeviceProfileUseCase {
  constructor(private deviceProfileRepository: IDeviceProfileRepository) {}

  async execute(input: UpsertDeviceProfileInput): Promise<Result<DeviceProfile>> {
    try {
      if (!input.deviceId || input.deviceId.trim().length === 0) {
        return Results.error('Device ID é obrigatório', 'INVALID_DEVICE_ID');
      }
      if (!input.displayName || input.displayName.trim().length === 0) {
        return Results.error('Nome é obrigatório', 'INVALID_NAME');
      }

      const tier = computeCustomerTier({
        displayName: input.displayName,
        email: input.email,
        phone: input.phone,
        fullName: input.fullName,
        birthDate: input.birthDate,
      });

      const profile = await this.deviceProfileRepository.upsert({
        deviceId: input.deviceId,
        lastDisplayName: input.displayName.trim(),
        lastFullName: input.fullName?.trim() || null,
        lastEmail: input.email?.trim() || null,
        lastPhone: input.phone?.trim() || null,
        lastBirthDate: input.birthDate || null,
        lastPreferredContact: input.preferredContact || 'email',
        highestTier: tier,
      });

      return Results.success(profile);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao guardar perfil do dispositivo'
      );
    }
  }
}

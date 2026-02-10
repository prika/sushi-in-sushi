import { IDeviceProfileRepository } from '@/domain/repositories/IDeviceProfileRepository';
import { DeviceProfile } from '@/domain/entities/DeviceProfile';
import { Result, Results } from '../Result';

export class GetDeviceProfileUseCase {
  constructor(private deviceProfileRepository: IDeviceProfileRepository) {}

  async execute(deviceId: string): Promise<Result<DeviceProfile | null>> {
    try {
      if (!deviceId || deviceId.trim().length === 0) {
        return Results.error('Device ID é obrigatório', 'INVALID_DEVICE_ID');
      }
      const profile = await this.deviceProfileRepository.findByDeviceId(deviceId);
      return Results.success(profile);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao buscar perfil do dispositivo'
      );
    }
  }
}

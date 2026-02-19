import {
  DeviceProfile,
  CreateDeviceProfileData,
  UpdateDeviceProfileData,
} from '../entities/DeviceProfile';

export interface IDeviceProfileRepository {
  findByDeviceId(deviceId: string): Promise<DeviceProfile | null>;
  create(data: CreateDeviceProfileData): Promise<DeviceProfile>;
  update(deviceId: string, data: UpdateDeviceProfileData): Promise<DeviceProfile>;
  upsert(data: CreateDeviceProfileData & Partial<UpdateDeviceProfileData>): Promise<DeviceProfile>;
  incrementVisitCount(deviceId: string): Promise<DeviceProfile>;
}

import { IDeviceProfileRepository } from '@/domain/repositories/IDeviceProfileRepository';
import { computeCustomerTier, CustomerTier } from '@/domain/value-objects/CustomerTier';
import { Result, Results } from '../Result';

interface SessionCustomerRecord {
  display_name: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  birth_date: string | null;
}

interface UpdateInput {
  sessionCustomerId: string;
  deviceId: string;
  updates: {
    fullName?: string;
    email?: string;
    phone?: string;
    birthDate?: string;
  };
}

interface SessionCustomerClient {
  getSessionCustomer(id: string): Promise<{ data: SessionCustomerRecord | null; error: { message: string } | null }>;
  updateSessionCustomer(id: string, data: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
}

export class UpdateSessionCustomerTierUseCase {
  constructor(
    private sessionCustomerClient: SessionCustomerClient,
    private deviceProfileRepository: IDeviceProfileRepository,
  ) {}

  async execute(input: UpdateInput): Promise<Result<{ tier: CustomerTier }>> {
    try {
      if (!input.sessionCustomerId) {
        return Results.error('ID do cliente é obrigatório', 'INVALID_ID');
      }

      const { data: current, error: fetchError } = await this.sessionCustomerClient.getSessionCustomer(input.sessionCustomerId);
      if (fetchError || !current) {
        return Results.error('Cliente de sessão não encontrado', 'NOT_FOUND');
      }

      const merged = {
        displayName: current.display_name,
        email: input.updates.email || current.email,
        phone: input.updates.phone || current.phone,
        fullName: input.updates.fullName || current.full_name,
        birthDate: input.updates.birthDate || current.birth_date,
      };

      const newTier = computeCustomerTier(merged);

      const updateData: Record<string, unknown> = { tier: newTier };
      if (input.updates.email) updateData.email = input.updates.email;
      if (input.updates.phone) updateData.phone = input.updates.phone;
      if (input.updates.fullName) updateData.full_name = input.updates.fullName;
      if (input.updates.birthDate) updateData.birth_date = input.updates.birthDate;

      const { error: updateError } = await this.sessionCustomerClient.updateSessionCustomer(
        input.sessionCustomerId,
        updateData,
      );

      if (updateError) return Results.error(updateError.message);

      // Update device profile (fire-and-forget)
      this.deviceProfileRepository.upsert({
        deviceId: input.deviceId,
        lastDisplayName: merged.displayName,
        lastFullName: merged.fullName || null,
        lastEmail: merged.email || null,
        lastPhone: merged.phone || null,
        lastBirthDate: merged.birthDate || null,
        highestTier: newTier,
      }).catch(() => {});

      return Results.success({ tier: newTier });
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao atualizar perfil'
      );
    }
  }
}

import { IDeviceProfileRepository } from '@/domain/repositories/IDeviceProfileRepository';
import { computeCustomerTier, CustomerTier } from '@/domain/value-objects/CustomerTier';
import { Result, Results } from '../Result';

interface SessionCustomerData {
  id: string;
  session_id: string;
  display_name: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  marketing_consent: boolean;
  preferred_contact: string;
  customer_id: string | null;
  is_session_host: boolean;
  device_id: string | null;
  tier: number;
  created_at: string;
  updated_at: string;
}

interface RegisterInput {
  sessionId: string;
  deviceId: string;
  displayName: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  marketingConsent?: boolean;
  preferredContact?: 'email' | 'phone' | 'none';
  isSessionHost: boolean;
}

interface SessionCustomerClient {
  insertSessionCustomer(data: Record<string, unknown>): Promise<{ data: SessionCustomerData | null; error: { message: string } | null }>;
}

export class RegisterSessionCustomerUseCase {
  constructor(
    private sessionCustomerClient: SessionCustomerClient,
    private deviceProfileRepository: IDeviceProfileRepository,
  ) {}

  async execute(input: RegisterInput): Promise<Result<SessionCustomerData & { tier: CustomerTier }>> {
    try {
      if (!input.displayName || input.displayName.trim().length === 0) {
        return Results.error('Nome é obrigatório', 'INVALID_NAME');
      }

      if (!input.sessionId) {
        return Results.error('Sessão é obrigatória', 'INVALID_SESSION');
      }

      const tier = computeCustomerTier({
        displayName: input.displayName,
        email: input.email,
        phone: input.phone,
        fullName: input.fullName,
        birthDate: input.birthDate,
      });

      const { data, error } = await this.sessionCustomerClient.insertSessionCustomer({
        session_id: input.sessionId,
        display_name: input.displayName.trim(),
        full_name: input.fullName?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        birth_date: input.birthDate || null,
        marketing_consent: input.marketingConsent ?? false,
        preferred_contact: input.preferredContact || 'email',
        is_session_host: input.isSessionHost,
        device_id: input.deviceId,
        tier,
      });

      if (error) return Results.error(error.message);
      if (!data) return Results.error('Erro ao registar participante');

      // Upsert device profile (fire-and-forget)
      this.deviceProfileRepository.upsert({
        deviceId: input.deviceId,
        lastDisplayName: input.displayName.trim(),
        lastFullName: input.fullName?.trim() || null,
        lastEmail: input.email?.trim() || null,
        lastPhone: input.phone?.trim() || null,
        lastBirthDate: input.birthDate || null,
        lastPreferredContact: input.preferredContact || 'email',
        highestTier: tier,
      }).catch(() => {}); // Non-critical

      return Results.success({ ...data, tier });
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao registar participante'
      );
    }
  }
}

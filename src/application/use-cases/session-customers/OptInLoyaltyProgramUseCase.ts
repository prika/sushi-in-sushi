import { ICustomerRepository } from '@/domain/repositories/ICustomerRepository';
import { IDeviceProfileRepository } from '@/domain/repositories/IDeviceProfileRepository';
import { Result, Results } from '../Result';

interface OptInInput {
  sessionCustomerId: string;
  deviceId: string;
  email: string;
  name: string;
  phone?: string | null;
  birthDate?: string | null;
  preferredLocation?: string | null;
  marketingConsent: boolean;
}

interface SessionCustomerClient {
  updateSessionCustomer(id: string, data: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
}

export class OptInLoyaltyProgramUseCase {
  constructor(
    private customerRepository: ICustomerRepository,
    private deviceProfileRepository: IDeviceProfileRepository,
    private sessionCustomerClient: SessionCustomerClient,
  ) {}

  async execute(input: OptInInput): Promise<Result<{ customerId: string }>> {
    try {
      if (!input.marketingConsent) {
        return Results.error(
          'O consentimento de marketing é obrigatório para o programa de fidelização',
          'CONSENT_REQUIRED',
        );
      }

      if (!input.email?.trim()) {
        return Results.error(
          'Email é obrigatório para o programa de fidelização',
          'EMAIL_REQUIRED',
        );
      }

      if (!input.name?.trim()) {
        return Results.error(
          'Nome é obrigatório para o programa de fidelização',
          'NAME_REQUIRED',
        );
      }

      // Check if customer already exists
      let customer = await this.customerRepository.findByEmail(input.email);

      if (!customer) {
        customer = await this.customerRepository.create({
          email: input.email,
          name: input.name,
          phone: input.phone || null,
          birthDate: input.birthDate || null,
          preferredLocation: (input.preferredLocation as any) || null,
          marketingConsent: true,
        });
      }

      // Link to session_customer
      const { error } = await this.sessionCustomerClient.updateSessionCustomer(
        input.sessionCustomerId,
        { customer_id: customer.id, marketing_consent: true },
      );

      if (error) return Results.error(error.message);

      // Link to device profile (fire-and-forget)
      this.deviceProfileRepository.update(input.deviceId, {
        linkedCustomerId: customer.id,
      }).catch(() => {});

      return Results.success({ customerId: customer.id });
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao aderir ao programa de fidelização'
      );
    }
  }
}

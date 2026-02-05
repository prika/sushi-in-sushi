/**
 * CreateReservationUseCase - Cria nova reserva
 */

import { IReservationRepository } from '@/domain/repositories/IReservationRepository';
import { IRestaurantClosureRepository } from '@/domain/repositories/IRestaurantClosureRepository';
import { Reservation, CreateReservationData } from '@/domain/entities/Reservation';
import { Result, Results } from '../Result';

export class CreateReservationUseCase {
  constructor(
    private reservationRepository: IReservationRepository,
    private closureRepository: IRestaurantClosureRepository
  ) {}

  async execute(data: CreateReservationData): Promise<Result<Reservation>> {
    try {
      // Verificar se o restaurante está fechado na data
      const closureCheck = await this.closureRepository.checkClosure(
        data.reservationDate,
        data.location
      );

      if (closureCheck.isClosed) {
        return Results.error(
          closureCheck.reason || 'Restaurante fechado nesta data',
          'RESTAURANT_CLOSED'
        );
      }

      const reservation = await this.reservationRepository.create(data);
      return Results.success(reservation);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao criar reserva'
      );
    }
  }
}

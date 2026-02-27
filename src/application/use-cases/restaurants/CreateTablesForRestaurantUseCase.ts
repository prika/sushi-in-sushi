import { ITableRepository } from '@/domain/repositories/ITableRepository';
import { IRestaurantRepository } from '@/domain/repositories/IRestaurantRepository';
import { Table } from '@/domain/entities/Table';
import { Result, Results } from '../Result';

interface CreateTablesForRestaurantInput {
  restaurantSlug: string;
  forceRecreate?: boolean;
}

/**
 * Use Case: Sincronizar mesas de um restaurante com a capacidade configurada
 *
 * Princípios:
 * - Mesas nunca são apagadas (QR codes físicos + sessões históricas)
 * - Mais mesas necessárias → reativa inativas primeiro, depois cria novas
 * - Menos mesas necessárias → desativa as livres de número mais alto
 * - Mesas ocupadas/reservadas nunca são desativadas (erro se bloquear)
 * - Nunca duplica mesas com o mesmo número+location
 */
export class CreateTablesForRestaurantUseCase {
  constructor(
    private restaurantRepository: IRestaurantRepository,
    private tableRepository: ITableRepository
  ) {}

  async execute(input: CreateTablesForRestaurantInput): Promise<Result<Table[]>> {
    try {
      const restaurant = await this.restaurantRepository.findBySlug(input.restaurantSlug);

      if (!restaurant) {
        return Results.error('Restaurante não encontrado', 'RESTAURANT_NOT_FOUND');
      }

      if (!restaurant.isActive) {
        return Results.error('Restaurante não está ativo', 'RESTAURANT_INACTIVE');
      }

      const desiredCount = Math.ceil(restaurant.maxCapacity / restaurant.defaultPeoplePerTable);

      if (desiredCount === 0) {
        return Results.error('Capacidade inválida para criar mesas', 'INVALID_CAPACITY');
      }

      // Buscar mesas ativas
      const activeTables = await this.tableRepository.findAll({
        location: input.restaurantSlug as any,
        isActive: true,
      });

      const currentCount = activeTables.length;

      // Já tem o número exato → nada a fazer
      if (currentCount === desiredCount) {
        return Results.success(activeTables);
      }

      // Demasiadas mesas ativas → desativar excedentes (livres, número mais alto)
      if (currentCount > desiredCount) {
        const sorted = [...activeTables].sort((a, b) => a.number - b.number);
        const toKeep = sorted.slice(0, desiredCount);
        const candidates = sorted.slice(desiredCount);

        // Só desativar mesas livres (available/inactive)
        const free = candidates.filter(t => t.status === 'available' || t.status === 'inactive');
        const busy = candidates.filter(t => t.status === 'occupied' || t.status === 'reserved');

        if (busy.length > 0) {
          // Desativar as livres que puder, avisar sobre as ocupadas
          for (const t of free) {
            await this.tableRepository.update(t.id, { isActive: false });
          }
          const stillActive = desiredCount + busy.length;
          return Results.error(
            `Desativadas ${free.length} mesas. ${busy.length} mesa(s) ocupadas/reservadas não podem ser desativadas ` +
            `(mesas ${busy.map(t => t.number).join(', ')}). Ficam ${stillActive} mesas ativas até serem libertadas.`,
            'TABLES_HAVE_ACTIVE_SESSIONS'
          );
        }

        for (const t of free) {
          await this.tableRepository.update(t.id, { isActive: false });
        }

        return Results.success(toKeep);
      }

      // Precisa de mais mesas — verificar se é primeira criação ou expansão
      if (currentCount > 0 && !input.forceRecreate) {
        return Results.error(
          `Restaurante tem ${currentCount} mesas ativas, precisa de ${desiredCount}. ` +
          `Use forceRecreate=true para adicionar as ${desiredCount - currentCount} mesas em falta.`,
          'TABLES_ALREADY_EXIST'
        );
      }

      // --- Adicionar mesas em falta ---
      const toAdd = desiredCount - currentCount;

      // 1. Tentar reativar mesas inativas primeiro (preserva QR codes)
      const inactiveTables = await this.tableRepository.findAll({
        location: input.restaurantSlug as any,
        isActive: false,
      });

      const activeNumbers = new Set(activeTables.map(t => t.number));
      const reactivated: Table[] = [];

      // Reativar por ordem de número (mesas mais baixas primeiro)
      const inactiveSorted = [...inactiveTables]
        .filter(t => !activeNumbers.has(t.number)) // Sem colisão de números
        .sort((a, b) => a.number - b.number);

      // Deduplicar: só reativar uma mesa por número
      const seenNumbers = new Set<number>();
      for (const t of inactiveSorted) {
        if (reactivated.length >= toAdd) break;
        if (seenNumbers.has(t.number)) continue;
        seenNumbers.add(t.number);

        await this.tableRepository.update(t.id, { isActive: true, status: 'available' });
        reactivated.push({ ...t, isActive: true });
      }

      // 2. Criar as que ainda faltam
      const stillNeeded = toAdd - reactivated.length;
      const allUsedNumbers = new Set(
        [...activeTables, ...reactivated].map(t => t.number)
      );
      const created: Table[] = [];
      let nextNumber = 1;

      for (let i = 0; i < stillNeeded; i++) {
        while (allUsedNumbers.has(nextNumber)) nextNumber++;
        const table = await this.tableRepository.create({
          number: nextNumber,
          name: `Mesa ${nextNumber}`,
          location: input.restaurantSlug as any,
        });
        created.push(table);
        allUsedNumbers.add(nextNumber);
        nextNumber++;
      }

      return Results.success([...activeTables, ...reactivated, ...created]);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao criar mesas'
      );
    }
  }
}

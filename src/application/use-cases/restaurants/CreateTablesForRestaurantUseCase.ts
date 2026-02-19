import { ITableRepository } from '@/domain/repositories/ITableRepository';
import { IRestaurantRepository } from '@/domain/repositories/IRestaurantRepository';
import { Table } from '@/domain/entities/Table';
import { Result, Results } from '../Result';

interface CreateTablesForRestaurantInput {
  restaurantSlug: string;
  forceRecreate?: boolean; // Se true, remove mesas existentes e recria
}

interface TableDistribution {
  capacity: number;
  count: number;
}

/**
 * Use Case: Criar mesas automaticamente para um restaurante
 *
 * Algoritmo de Distribuição:
 * - Usa o defaultPeoplePerTable definido no restaurante
 * - Cria mesas uniformes com essa capacidade
 * - num_mesas = ceil(maxCapacity / defaultPeoplePerTable)
 *
 * Exemplos (defaultPeoplePerTable = 4):
 * - 50 pessoas → 13 mesas de 4 = 52 lugares
 * - 40 pessoas → 10 mesas de 4 = 40 lugares
 *
 * Exemplos (defaultPeoplePerTable = 2):
 * - 50 pessoas → 25 mesas de 2 = 50 lugares
 */
export class CreateTablesForRestaurantUseCase {
  constructor(
    private restaurantRepository: IRestaurantRepository,
    private tableRepository: ITableRepository
  ) {}

  /**
   * Calcula a distribuição de mesas baseada no defaultPeoplePerTable
   */
  private calculateTableDistribution(maxCapacity: number, peoplePerTable: number): TableDistribution[] {
    const numTables = Math.ceil(maxCapacity / peoplePerTable);

    if (numTables === 0) return [];

    return [{ capacity: peoplePerTable, count: numTables }];
  }

  /**
   * Calcula o total de lugares criados baseado na distribuição
   */
  private calculateTotalCapacity(distribution: TableDistribution[]): number {
    return distribution.reduce((total, d) => total + d.capacity * d.count, 0);
  }

  async execute(input: CreateTablesForRestaurantInput): Promise<Result<Table[]>> {
    try {
      // 1. Buscar restaurante
      const restaurant = await this.restaurantRepository.findBySlug(input.restaurantSlug);

      if (!restaurant) {
        return Results.error('Restaurante não encontrado', 'RESTAURANT_NOT_FOUND');
      }

      if (!restaurant.isActive) {
        return Results.error('Restaurante não está ativo', 'RESTAURANT_INACTIVE');
      }

      // 2. Calcular distribuição de mesas baseada em defaultPeoplePerTable
      const distribution = this.calculateTableDistribution(restaurant.maxCapacity, restaurant.defaultPeoplePerTable);
      const totalCapacity = this.calculateTotalCapacity(distribution);
      const totalTables = distribution.reduce((sum, d) => sum + d.count, 0);

      if (totalTables === 0) {
        return Results.error(
          'Capacidade inválida para criar mesas',
          'INVALID_CAPACITY'
        );
      }

      // 3. Verificar se já existem mesas (opcional: forçar recriação)
      const existingTables = await this.tableRepository.findAll({
        location: input.restaurantSlug as any
      });

      if (existingTables.length > 0 && !input.forceRecreate) {
        return Results.error(
          `Restaurante já tem ${existingTables.length} mesas. Use forceRecreate=true para recriar.`,
          'TABLES_ALREADY_EXIST'
        );
      }

      // 4. Remover mesas existentes se forceRecreate
      if (input.forceRecreate && existingTables.length > 0) {
        // Verificar se alguma mesa tem sessão ativa
        const tablesWithSessions = existingTables.filter(
          table => table.status === 'occupied' || table.status === 'reserved'
        );

        if (tablesWithSessions.length > 0) {
          return Results.error(
            `Não é possível recriar mesas. ${tablesWithSessions.length} mesa(s) têm sessões ativas.\n\n` +
            `Por favor, feche todas as sessões antes de recriar as mesas.`,
            'TABLES_HAVE_ACTIVE_SESSIONS'
          );
        }

        // Deletar mesas (apenas se não tiverem sessões ativas)
        for (const table of existingTables) {
          try {
            await this.tableRepository.delete(table.id);
          } catch (error) {
            // Se ainda assim der erro de FK, mostrar mensagem mais clara
            if (error instanceof Error && error.message.includes('foreign key constraint')) {
              return Results.error(
                `Não é possível eliminar mesa ${table.number}. Ela tem sessões ou pedidos associados.\n\n` +
                `Por favor, feche todas as sessões e tente novamente.`,
                'TABLE_HAS_DEPENDENCIES'
              );
            }
            throw error;
          }
        }
      }

      // 5. Criar mesas baseado na distribuição
      const createdTables: Table[] = [];
      let tableNumber = 1;

      for (const dist of distribution) {
        for (let i = 0; i < dist.count; i++) {
          const table = await this.tableRepository.create({
            number: tableNumber,
            name: `Mesa ${tableNumber}`,
            location: input.restaurantSlug as any, // Cast temporário até Location ser dinâmico
          });

          createdTables.push(table);
          tableNumber++;
        }
      }

      return Results.success(createdTables);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao criar mesas'
      );
    }
  }
}

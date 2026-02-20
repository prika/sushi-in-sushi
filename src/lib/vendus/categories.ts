/**
 * Vendus Category Synchronization Service
 *
 * Exporta categorias locais para o Vendus. Chamado automaticamente antes do push
 * de produtos para garantir que as categorias existam no Vendus.
 *
 * @module vendus/categories
 * @see docs/VENDUS_SYNC.md
 */

import { createAdminClient } from "@/lib/supabase/server";
import { getVendusClient, VendusApiError } from "./client";
import { getVendusConfig } from "./config";
import type { SyncResult } from "./types";

// Vendus API category structure (documentation: https://www.vendus.pt/ws/v1.1/products/categories.doc)
export interface VendusCategory {
  id: string;
  name: string;
}

export interface VendusCategoriesResponse {
  categories?: VendusCategory[];
  data?: VendusCategory[];
}

/**
 * Exporta categorias locais para o Vendus.
 *
 * - Cria categorias no Vendus se não existirem (match por nome)
 * - Atualiza vendus_id nas categorias locais para manter o mapeamento
 *
 * @param locationSlug - Localização (circunvalacao, boavista)
 * @param initiatedBy - ID do utilizador que iniciou (opcional)
 * @returns Resultado com recordsCreated, recordsUpdated
 * @throws Error se Vendus não estiver configurado
 */
export async function syncCategoriesToVendus(
  locationSlug: string,
  initiatedBy?: string,
): Promise<SyncResult> {
  const startTime = Date.now();

  const config = await getVendusConfig(locationSlug);
  if (!config) {
    throw new Error(`Vendus nao configurado para ${locationSlug}`);
  }

  const client = getVendusClient(config, locationSlug);
  const supabase = createAdminClient();

  const result: SyncResult = {
    success: true,
    operation: "category_sync",
    direction: "push",
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsFailed: 0,
    errors: [],
    duration: 0,
  };

  try {
    // Fetch local categories
    const { data: localCategories, error: fetchError } = await supabase
      .from("categories")
      .select("id, name, vendus_id")
      .order("sort_order");

    if (fetchError) {
      throw new Error(`Erro ao obter categorias: ${fetchError.message}`);
    }

    if (!localCategories || localCategories.length === 0) {
      console.info("[Vendus] Nenhuma categoria local para exportar");
      result.duration = Date.now() - startTime;
      return result;
    }

    // Fetch existing Vendus categories (for matching by name)
    const vendusCategoriesMap = new Map<string, string>(); // name -> vendus_id
    try {
      // Vendus API may return an array directly or { categories: [...] }
      const raw = await client.get<VendusCategory[] | VendusCategoriesResponse>(
        "/products/categories?per_page=500",
      );
      const vendusCategories = Array.isArray(raw) ? raw : (raw.categories || raw.data || []);
      for (const vc of vendusCategories) {
        vendusCategoriesMap.set(vc.name.toLowerCase().trim(), vc.id);
      }
    } catch {
      // Vendus may have no categories yet - continue
    }

    for (const category of localCategories) {
      result.recordsProcessed++;

      try {
        const categoryName = category.name.trim();
        const existingVendusId =
          category.vendus_id ||
          vendusCategoriesMap.get(categoryName.toLowerCase());

        if (existingVendusId) {
          // Already in Vendus - update mapping if needed
          if (!category.vendus_id) {
            const { error: updateError } = await supabase
              .from("categories")
              .update({
                vendus_id: existingVendusId,
                vendus_synced_at: new Date().toISOString(),
              })
              .eq("id", category.id);

            if (updateError) {
              console.error(
                `[Vendus] Erro ao atualizar vendus_id da categoria (categoryName=${categoryName}, category.id=${category.id}, vendusId=${existingVendusId}):`,
                updateError.message,
              );
              throw updateError;
            }
            result.recordsUpdated++;
          }
        } else {
          // Create in Vendus
          const createResponse = await client.post<{ id: string }>(
            "/products/categories",
            { name: categoryName } as unknown as Record<string, unknown>,
          );
          const vendusId = createResponse.id;

          const { error: updateError } = await supabase
            .from("categories")
            .update({
              vendus_id: vendusId,
              vendus_synced_at: new Date().toISOString(),
            })
            .eq("id", category.id);

          if (updateError) {
            console.error(
              `[Vendus] Erro ao atualizar vendus_id após criar categoria (categoryName=${categoryName}, category.id=${category.id}, vendusId=${vendusId}):`,
              updateError.message,
            );
            throw updateError;
          }

          vendusCategoriesMap.set(categoryName.toLowerCase(), vendusId);
          result.recordsCreated++;
          console.info(
            `[Vendus] Categoria criada: ${categoryName} (${vendusId})`,
          );
        }
      } catch (error) {
        result.recordsFailed++;
        const errorMessage =
          error instanceof VendusApiError
            ? error.getUserMessage()
            : (error as Error).message;
        result.errors.push({
          id: category.id,
          error: `${category.name}: ${errorMessage}`,
        });
        console.error(
          `[Vendus] Erro ao exportar categoria ${category.name}:`,
          errorMessage,
        );
      }
    }

    result.success = result.recordsFailed === 0;
  } catch (error) {
    result.success = false;
    result.errors.push({
      id: "global",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }

  result.duration = Date.now() - startTime;
  return result;
}

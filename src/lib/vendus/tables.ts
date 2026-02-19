/**
 * Vendus Table/Room Import Service
 */

import { createClient } from "@/lib/supabase/server";
import { VendusClient, getVendusClient, VendusApiError } from "./client";
import { getVendusConfig } from "./config";
import type {
  VendusRoom,
  VendusTable,
  VendusRoomsResponse,
  VendusTablesResponse,
  TableImportOptions,
  TableMapping,
  SyncResult,
} from "./types";

// =============================================
// TABLE IMPORT
// =============================================

/**
 * Import tables and rooms from Vendus
 */
export async function importTablesFromVendus(
  options: TableImportOptions,
): Promise<SyncResult> {
  const { locationSlug, initiatedBy } = options;
  const startTime = Date.now();

  const config = await getVendusConfig(locationSlug);
  if (!config) {
    throw new Error(`Vendus nao configurado para ${locationSlug}`);
  }

  const client = getVendusClient(config, locationSlug);
  const supabase = await createClient();

  const result: SyncResult = {
    success: true,
    operation: "table_import",
    direction: "pull",
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsFailed: 0,
    errors: [],
    duration: 0,
  };

  // Log sync start
  const { data: logEntry } = await supabase
    .from("vendus_sync_log")
    .insert({
      operation: "table_import",
      direction: "pull",
      entity_type: "table",
      status: "started",
      initiated_by: initiatedBy,
    })
    .select("id")
    .single();

  try {
    // Fetch rooms from Vendus
    console.log(`[Vendus] Fetching rooms for store ${config.storeId}...`);
    const roomsResponse = await client.get<VendusRoomsResponse>(
      `/stores/${config.storeId}/rooms`,
    );

    const rooms = roomsResponse.rooms || [];
    console.log(`[Vendus] Found ${rooms.length} rooms`);

    // Fetch tables for each room
    for (const room of rooms) {
      try {
        console.log(`[Vendus] Fetching tables for room: ${room.name}`);
        const tablesResponse = await client.get<VendusTablesResponse>(
          `/rooms/${room.id}/tables`,
        );

        const tables = tablesResponse.tables || [];
        console.log(
          `[Vendus] Found ${tables.length} tables in room ${room.name}`,
        );

        for (const vTable of tables) {
          result.recordsProcessed++;

          try {
            await processVendusTable(
              supabase,
              vTable,
              room,
              locationSlug,
              result,
            );
          } catch (error) {
            result.recordsFailed++;
            result.errors.push({
              id: vTable.id,
              error:
                error instanceof Error ? error.message : "Erro desconhecido",
            });
          }
        }
      } catch (error) {
        console.error(
          `[Vendus] Error fetching tables for room ${room.name}:`,
          error,
        );
        result.errors.push({
          id: room.id,
          error: `Erro ao obter mesas da sala ${room.name}`,
        });
      }
    }

    result.success = result.recordsFailed === 0;
  } catch (error) {
    result.success = false;
    result.errors.push({
      id: "global",
      error:
        error instanceof VendusApiError
          ? error.getUserMessage()
          : (error as Error).message,
    });
  }

  result.duration = Date.now() - startTime;

  // Update sync log
  if (logEntry?.id) {
    await supabase
      .from("vendus_sync_log")
      .update({
        status: result.success
          ? "success"
          : result.errors.length > 0
            ? "partial"
            : "error",
        records_processed: result.recordsProcessed,
        records_created: result.recordsCreated,
        records_updated: result.recordsUpdated,
        records_failed: result.recordsFailed,
        error_message: result.errors[0]?.error,
        error_details:
          result.errors.length > 0
            ? JSON.parse(JSON.stringify({ errors: result.errors }))
            : null,
        completed_at: new Date().toISOString(),
        duration_ms: result.duration,
      })
      .eq("id", logEntry.id);
  }

  return result;
}

/**
 * Process a single Vendus table
 */
async function processVendusTable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  vTable: VendusTable,
  room: VendusRoom,
  locationSlug: string,
  result: SyncResult,
): Promise<void> {
  // Check if table exists by vendus_table_id
  const { data: existingByVendusId } = await supabase
    .from("tables")
    .select("id")
    .eq("vendus_table_id", vTable.id)
    .single();

  const tableData = {
    vendus_table_id: vTable.id,
    vendus_room_id: room.id,
    vendus_synced_at: new Date().toISOString(),
  };

  if (existingByVendusId) {
    // Update existing table
    await supabase
      .from("tables")
      .update(tableData)
      .eq("id", existingByVendusId.id);
    result.recordsUpdated++;
    console.log(`[Vendus] Updated table by vendus_id: ${vTable.name}`);
    return;
  }

  // Try to match by table number and location
  const { data: existingByNumber } = await supabase
    .from("tables")
    .select("id")
    .eq("number", vTable.number)
    .eq("location", locationSlug)
    .is("vendus_table_id", null)
    .single();

  if (existingByNumber) {
    // Link existing local table to Vendus
    await supabase
      .from("tables")
      .update(tableData)
      .eq("id", existingByNumber.id);
    result.recordsUpdated++;
    console.log(`[Vendus] Linked local table ${vTable.number} to Vendus`);
    return;
  }

  // Create new table
  const { error: insertError } = await supabase.from("tables").insert({
    number: vTable.number,
    name: vTable.name || `Mesa ${vTable.number}`,
    location: locationSlug,
    is_active: vTable.is_active,
    ...tableData,
  });

  if (insertError) {
    throw new Error(`Erro ao criar mesa: ${insertError.message}`);
  }

  result.recordsCreated++;
  console.log(`[Vendus] Created new table: ${vTable.name}`);
}

// =============================================
// TABLE MAPPING
// =============================================

/**
 * Get current table mapping for a location
 */
export async function getTableMapping(
  locationSlug: string,
): Promise<TableMapping[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tables")
    .select(
      "id, number, name, vendus_table_id, vendus_room_id, vendus_synced_at",
    )
    .eq("location", locationSlug)
    .order("number");

  if (error) {
    console.error("[Vendus] Error fetching table mapping:", error);
    return [];
  }

  return data || [];
}

/**
 * Manually map a local table to a Vendus table
 */
export async function mapTableToVendus(
  tableId: string,
  vendusTableId: string,
  vendusRoomId?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tables")
    .update({
      vendus_table_id: vendusTableId,
      vendus_room_id: vendusRoomId || null,
      vendus_synced_at: new Date().toISOString(),
    })
    .eq("id", tableId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Remove Vendus mapping from a table
 */
export async function unmapTableFromVendus(
  tableId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tables")
    .update({
      vendus_table_id: null,
      vendus_room_id: null,
      vendus_synced_at: null,
    })
    .eq("id", tableId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get Vendus tables for manual mapping selection
 * Returns JSON-serializable data (Record instead of Map).
 */
export async function getVendusTables(
  locationSlug: string,
): Promise<{ rooms: VendusRoom[]; tables: Record<string, VendusTable[]> }> {
  const config = await getVendusConfig(locationSlug);
  if (!config) {
    throw new Error(`Vendus nao configurado para ${locationSlug}`);
  }

  const client = getVendusClient(config, locationSlug);
  const tablesObj: Record<string, VendusTable[]> = {};

  const roomsResponse = await client.get<VendusRoomsResponse>(
    `/stores/${config.storeId}/rooms`,
  );

  const rooms = roomsResponse.rooms || [];

  for (const room of rooms) {
    const tablesResponse = await client.get<VendusTablesResponse>(
      `/rooms/${room.id}/tables`,
    );
    tablesObj[room.id] = tablesResponse.tables || [];
  }

  return { rooms, tables: tablesObj };
}

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import type {
  VendusStore,
  VendusStoresResponse,
  VendusRegister,
  VendusRegistersResponse,
} from "@/lib/vendus/types";

export const dynamic = "force-dynamic";

const VENDUS_STORES_BASE_URL = "https://www.vendus.pt/ws/v1.2";

/**
 * GET /api/vendus/stores
 * Import stores and registers from Vendus API (v1.2)
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const apiKey = process.env.VENDUS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "VENDUS_API_KEY nao configurada" },
        { status: 400 },
      );
    }

    const authHeader = `Basic ${Buffer.from(apiKey + ":").toString("base64")}`;

    // Fetch stores
    const storesRes = await fetch(`${VENDUS_STORES_BASE_URL}/stores/`, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(30000),
    });

    if (!storesRes.ok) {
      const errorText = await storesRes.text().catch(() => "");
      return NextResponse.json(
        { error: `Erro Vendus (${storesRes.status}): ${errorText}` },
        { status: 502 },
      );
    }

    const rawStores = await storesRes.json();
    const stores: VendusStore[] = Array.isArray(rawStores)
      ? rawStores
      : (rawStores as VendusStoresResponse).stores || [];

    // Fetch registers for each store
    const registers: Record<string, VendusRegister[]> = {};

    await Promise.all(
      stores.map(async (store) => {
        try {
          const registersRes = await fetch(
            `${VENDUS_STORES_BASE_URL}/stores/${store.id}/registers/`,
            {
              headers: { Authorization: authHeader },
              signal: AbortSignal.timeout(30000),
            },
          );

          if (registersRes.ok) {
            const rawRegisters = await registersRes.json();
            registers[store.id] = Array.isArray(rawRegisters)
              ? rawRegisters
              : (rawRegisters as VendusRegistersResponse).registers || [];
          } else {
            registers[store.id] = [];
          }
        } catch {
          registers[store.id] = [];
        }
      }),
    );

    return NextResponse.json({ stores, registers });
  } catch (error) {
    console.error("Erro ao obter lojas Vendus:", error);
    return NextResponse.json(
      { error: "Erro ao comunicar com Vendus" },
      { status: 500 },
    );
  }
}

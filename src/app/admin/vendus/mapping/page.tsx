"use client";

import { useState, useEffect, useCallback } from "react";

interface TableMapping {
  id: string;
  number: number;
  name: string;
  vendus_table_id: string | null;
  vendus_room_id: string | null;
  vendus_synced_at: string | null;
}

interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: Array<{ id: string; error: string }>;
}

export default function VendusMappingPage() {
  const [tables, setTables] = useState<TableMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [locations, setLocations] = useState<
    { id: string; name: string; slug: string }[]
  >([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [importResult, setImportResult] = useState<SyncResult | null>(null);

  const fetchTables = useCallback(async () => {
    if (!selectedLocation) return;
    try {
      const response = await fetch(
        `/api/vendus/sync/tables?location=${selectedLocation}`,
      );
      const data = await response.json();
      setTables(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching tables:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocation]);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((locs) => {
        const arr = Array.isArray(locs) ? locs : [];
        setLocations(arr);
        setSelectedLocation((prev) => prev || arr[0]?.slug || "");
      });
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      setIsLoading(true);
      fetchTables();
    }
  }, [fetchTables, selectedLocation]);

  const handleImport = async () => {
    setIsImporting(true);
    setImportResult(null);

    try {
      const response = await fetch("/api/vendus/sync/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationSlug: selectedLocation }),
      });

      const result = await response.json();
      setImportResult(result);
      await fetchTables();
    } catch (error) {
      setImportResult({
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        errors: [{ id: "global", error: "Erro na importacao" }],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const stats = {
    total: tables.length,
    mapped: tables.filter((t) => t.vendus_table_id).length,
    unmapped: tables.filter((t) => !t.vendus_table_id).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Mapeamento de Mesas
          </h1>
          <p className="text-gray-500">
            Mapear mesas locais com as mesas do Vendus POS
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.slug}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Total Mesas</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Mapeadas</p>
          <p className="text-2xl font-bold text-green-600">{stats.mapped}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Nao Mapeadas</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.unmapped}</p>
        </div>
      </div>

      {/* Import Action */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Importar Mesas do Vendus</h2>
        <p className="text-gray-600 mb-4">
          Importar automaticamente as mesas configuradas no Vendus POS. As mesas
          serao mapeadas por numero ou criadas se nao existirem localmente.
        </p>
        <button
          onClick={handleImport}
          disabled={isImporting}
          className="px-4 py-2 bg-[#D4AF37] text-black rounded-lg hover:bg-[#C4A030] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isImporting ? "A importar..." : "Importar Mesas do Vendus"}
        </button>

        {importResult && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              importResult.success
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <p
              className={
                importResult.success ? "text-green-700" : "text-red-700"
              }
            >
              {importResult.success
                ? `Importacao concluida: ${importResult.recordsCreated} criadas, ${importResult.recordsUpdated} atualizadas`
                : `Erro: ${importResult.errors?.[0]?.error || "Erro desconhecido"}`}
            </p>
          </div>
        )}
      </div>

      {/* Tables List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mesa Local
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendus ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sala Vendus
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ultima Sync
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tables.map((table) => (
              <tr key={table.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  Mesa {table.number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {table.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                  {table.vendus_table_id || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                  {table.vendus_room_id || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {table.vendus_table_id ? (
                    <span className="px-2 py-1 text-xs rounded-full border bg-green-100 text-green-700 border-green-200">
                      Mapeada
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs rounded-full border bg-yellow-100 text-yellow-700 border-yellow-200">
                      Nao mapeada
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {table.vendus_synced_at
                    ? new Date(table.vendus_synced_at).toLocaleString("pt-PT", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Nunca"}
                </td>
              </tr>
            ))}
            {tables.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma mesa encontrada para esta localizacao
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          Como funciona o mapeamento
        </h3>
        <ul className="text-blue-700 text-sm space-y-2">
          <li className="flex items-start gap-2">
            <span>1.</span>
            <span>
              Ao importar, o sistema tenta corresponder mesas pelo numero (ex:
              Mesa 5 local = Mesa 5 Vendus)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span>2.</span>
            <span>
              Se uma mesa do Vendus nao existir localmente, sera criada
              automaticamente
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span>3.</span>
            <span>
              O mapeamento permite enviar pedidos para a impressora da cozinha e
              emitir faturas com a mesa correta
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

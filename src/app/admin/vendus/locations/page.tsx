"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  vendus_enabled: boolean;
  vendus_store_id: string | null;
  vendus_register_id: string | null;
}

interface VendusStore {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  is_active: boolean;
}

interface VendusRegister {
  id: string;
  name: string;
  store_id: string;
  is_active: boolean;
}

export default function VendusLocationsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    vendus_enabled: boolean;
    vendus_store_id: string;
    vendus_register_id: string;
  }>({ vendus_enabled: false, vendus_store_id: "", vendus_register_id: "" });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Vendus import state
  const [vendusStores, setVendusStores] = useState<VendusStore[]>([]);
  const [vendusRegisters, setVendusRegisters] = useState<Record<string, VendusRegister[]>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const fetchRestaurants = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/locations");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFetchError(err.error || `Erro ${res.status}`);
        setRestaurants([]);
        return;
      }
      const data = await res.json();
      setRestaurants(Array.isArray(data) ? data : []);
    } catch {
      setFetchError("Erro de ligacao ao servidor");
      setRestaurants([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleImportStores = async () => {
    setIsImporting(true);
    setImportError(null);
    try {
      const res = await fetch("/api/vendus/stores");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setImportError(err.error || `Erro ${res.status}`);
        return;
      }
      const data = await res.json();
      setVendusStores(data.stores || []);
      setVendusRegisters(data.registers || {});
      setShowImport(true);
    } catch {
      setImportError("Erro ao comunicar com Vendus");
    } finally {
      setIsImporting(false);
    }
  };

  const handleAssignStore = (restaurantSlug: string, store: VendusStore) => {
    const storeRegisters = vendusRegisters[store.id] || [];
    const firstRegister = storeRegisters[0];

    setEditingSlug(restaurantSlug);
    setFormData({
      vendus_enabled: true,
      vendus_store_id: store.id,
      vendus_register_id: firstRegister?.id || "",
    });
    setSaveStatus(null);
  };

  const handleEdit = (loc: Restaurant) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setEditingSlug(loc.slug);
    setFormData({
      vendus_enabled: loc.vendus_enabled ?? false,
      vendus_store_id: loc.vendus_store_id || "",
      vendus_register_id: loc.vendus_register_id || "",
    });
    setSaveStatus(null);
  };

  const handleCancel = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setEditingSlug(null);
    setSaveStatus(null);
  };

  const handleSave = async (slug: string) => {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/locations/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendus_enabled: formData.vendus_enabled,
          vendus_store_id: formData.vendus_store_id || null,
          vendus_register_id: formData.vendus_register_id || null,
        }),
      });
      if (res.ok) {
        setSaveStatus("saved");
        await fetchRestaurants();
        saveTimeoutRef.current = setTimeout(() => {
          saveTimeoutRef.current = null;
          setSaveStatus(null);
          setEditingSlug(null);
        }, 2000);
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveStatus(err.error || "Erro");
      }
    } catch {
      setSaveStatus("Erro de ligacao");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center h-64 items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Configuracao Vendus por Restaurante
          </h1>
          <p className="text-gray-500">
            Configure Store ID e Register ID para cada restaurante. A API key e
            global (.env).
          </p>
        </div>
        <button
          onClick={handleImportStores}
          disabled={isImporting}
          className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] text-sm disabled:opacity-50 cursor-pointer"
        >
          {isImporting ? "A importar..." : "Importar do Vendus"}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>VENDUS_API_KEY</strong> em .env e obrigatoria. Obtenha em{" "}
        <a
          href="https://www.vendus.pt/dashboard/settings/api"
          target="_blank"
          rel="noopener noreferrer"
          className="underline cursor-pointer"
        >
          vendus.pt/dashboard
        </a>
        . Store ID e Register ID encontram-se nas definicoes da sua loja Vendus.
      </div>

      {/* Import error */}
      {importError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{importError}</p>
        </div>
      )}

      {/* Vendus stores import panel */}
      {showImport && vendusStores.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-blue-900">
              Lojas encontradas no Vendus ({vendusStores.length})
            </h2>
            <button
              onClick={() => setShowImport(false)}
              className="text-blue-600 hover:text-blue-800 text-sm cursor-pointer"
            >
              Fechar
            </button>
          </div>
          <p className="text-sm text-blue-700">
            Clique numa loja para associar a um restaurante.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vendusStores.map((store) => {
              const regs = vendusRegisters[store.id] || [];
              const assignedTo = restaurants.find(
                (r) => r.vendus_store_id === store.id,
              );
              return (
                <div
                  key={store.id}
                  className={`rounded-lg border p-4 ${
                    assignedTo
                      ? "bg-green-50 border-green-200"
                      : "bg-white border-blue-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{store.name}</p>
                      <p className="text-xs text-gray-400 font-mono">
                        ID: {store.id}
                      </p>
                    </div>
                    {store.is_active ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                        Ativa
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                        Inativa
                      </span>
                    )}
                  </div>
                  {store.address && (
                    <p className="text-xs text-gray-500 mb-2">{store.address}</p>
                  )}
                  {regs.length > 0 && (
                    <p className="text-xs text-gray-400 mb-2">
                      {regs.length} caixa{regs.length > 1 ? "s" : ""}:{" "}
                      {regs.map((r) => r.name || r.id).join(", ")}
                    </p>
                  )}
                  {assignedTo ? (
                    <p className="text-xs text-green-700 font-medium">
                      Associada a: {assignedTo.name}
                    </p>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      {restaurants
                        .filter((r) => !r.vendus_store_id)
                        .map((r) => (
                          <button
                            key={r.id}
                            onClick={() => handleAssignStore(r.slug, store)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 cursor-pointer"
                          >
                            Associar a {r.name}
                          </button>
                        ))}
                      {restaurants.filter((r) => !r.vendus_store_id).length ===
                        0 && (
                        <p className="text-xs text-gray-400">
                          Todos os restaurantes ja estao associados
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showImport && vendusStores.length === 0 && !isImporting && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-700">
            Nenhuma loja encontrada no Vendus. Verifique a API key e as
            definicoes da conta.
          </p>
        </div>
      )}

      {/* Error state */}
      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">
            Erro ao carregar restaurantes: {fetchError}
          </p>
          <button
            onClick={fetchRestaurants}
            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Restaurants list */}
      {fetchError ? null : restaurants.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-2">Nenhum restaurante encontrado.</p>
          <p className="text-gray-400 text-sm">
            Adicione restaurantes em Definicoes &gt; Gestao de Restaurantes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {restaurants.map((loc) => (
            <div
              key={loc.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {loc.name}
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">
                    {loc.slug}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {loc.vendus_enabled ? (
                    <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Vendus ativo
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                      Vendus inativo
                    </span>
                  )}
                  {editingSlug !== loc.slug && (
                    <button
                      onClick={() => handleEdit(loc)}
                      className="px-3 py-1.5 bg-[#D4AF37] text-black rounded-lg text-sm font-medium hover:bg-[#C4A030] cursor-pointer"
                    >
                      Configurar Vendus
                    </button>
                  )}
                </div>
              </div>

              {editingSlug !== loc.slug ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Store ID:</span>{" "}
                    <span className="font-mono text-gray-700">
                      {loc.vendus_store_id || (
                        <span className="text-gray-300">nao configurado</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Register ID:</span>{" "}
                    <span className="font-mono text-gray-700">
                      {loc.vendus_register_id || (
                        <span className="text-gray-300">nao configurado</span>
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-100 pt-4 mt-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Store ID (Vendus)
                      </label>
                      <input
                        type="text"
                        value={formData.vendus_store_id}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            vendus_store_id: e.target.value,
                          }))
                        }
                        placeholder="Ex: 12345"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Vendus Dashboard &gt; Definicoes &gt; Lojas
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Register ID (Caixa)
                      </label>
                      {/* Show dropdown if we have registers for the selected store */}
                      {formData.vendus_store_id &&
                      vendusRegisters[formData.vendus_store_id]?.length > 0 ? (
                        <select
                          value={formData.vendus_register_id}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              vendus_register_id: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono cursor-pointer"
                        >
                          <option value="">Selecionar caixa...</option>
                          {vendusRegisters[formData.vendus_store_id].map(
                            (reg) => (
                              <option key={reg.id} value={reg.id}>
                                {reg.name || `Caixa ${reg.id}`}
                              </option>
                            ),
                          )}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={formData.vendus_register_id}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              vendus_register_id: e.target.value,
                            }))
                          }
                          placeholder="Ex: 67890"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono"
                        />
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Vendus Dashboard &gt; Definicoes &gt; Caixas
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.vendus_enabled}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          vendus_enabled: e.target.checked,
                        }))
                      }
                      className="rounded border-gray-300 cursor-pointer"
                    />
                    Ativar integracao Vendus para este restaurante
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSave(loc.slug)}
                      disabled={saveStatus === "saving"}
                      className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] text-sm disabled:opacity-50 cursor-pointer"
                    >
                      {saveStatus === "saving" ? "A guardar..." : "Guardar"}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm cursor-pointer"
                    >
                      Cancelar
                    </button>
                    {saveStatus === "saved" && (
                      <span className="text-sm text-green-600">Guardado!</span>
                    )}
                    {saveStatus &&
                      saveStatus !== "saving" &&
                      saveStatus !== "saved" && (
                        <span className="text-sm text-red-600">
                          {saveStatus}
                        </span>
                      )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

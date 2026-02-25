"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Location {
  id: string;
  name: string;
  slug: string;
  vendus_enabled: boolean;
  vendus_store_id: string | null;
  vendus_register_id: string | null;
}

export default function VendusLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    vendus_enabled: boolean;
    vendus_store_id: string;
    vendus_register_id: string;
  }>({ vendus_enabled: false, vendus_store_id: "", vendus_register_id: "" });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: "",
    slug: "",
    vendus_enabled: false,
    vendus_store_id: "",
    vendus_register_id: "",
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/locations");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFetchError(err.error || `Erro ${res.status}`);
        setLocations([]);
        return;
      }
      const data = await res.json();
      setLocations(Array.isArray(data) ? data : []);
    } catch {
      setFetchError("Erro de ligacao ao servidor");
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleEdit = (loc: Location) => {
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

  const handleAddLocation = async () => {
    if (!newLocation.name.trim() || !newLocation.slug.trim()) {
      setAddError("Nome e slug obrigatorios");
      return;
    }
    setAddError(null);
    setIsAdding(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLocation),
      });
      if (res.ok) {
        setShowAddForm(false);
        setNewLocation({ name: "", slug: "", vendus_enabled: false, vendus_store_id: "", vendus_register_id: "" });
        await fetchLocations();
      } else {
        const err = await res.json().catch(() => ({}));
        setAddError(err.error || "Erro ao criar");
      }
    } catch {
      setAddError("Erro de ligacao");
    } finally {
      setIsAdding(false);
    }
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
        await fetchLocations();
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Configuracao Vendus por Local
        </h1>
        <p className="text-gray-500">
          Configure Store ID e Register ID para cada restaurante. A API key e
          global (.env).
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>VENDUS_API_KEY</strong> em .env e obrigatoria. Obtenha em{" "}
        <a
          href="https://www.vendus.pt/dashboard/settings/api"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          vendus.pt/dashboard
        </a>
        . Store ID e Register ID encontram-se nas definicoes da sua loja Vendus.
      </div>

      {/* Error state */}
      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">
            Erro ao carregar localizacoes: {fetchError}
          </p>
          <button
            onClick={fetchLocations}
            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Locations list */}
      {fetchError ? null : locations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-2">Nenhuma localizacao encontrada.</p>
          <p className="text-gray-400 text-sm">
            Verifique se a migracao 046 (Vendus integration) foi aplicada na base de dados.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{loc.name}</h3>
                  <span className="text-xs text-gray-400 font-mono">{loc.slug}</span>
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
                      className="px-3 py-1.5 bg-[#D4AF37] text-black rounded-lg text-sm font-medium hover:bg-[#C4A030]"
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
                      {loc.vendus_store_id || <span className="text-gray-300">nao configurado</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Register ID:</span>{" "}
                    <span className="font-mono text-gray-700">
                      {loc.vendus_register_id || <span className="text-gray-300">nao configurado</span>}
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
                          setFormData((p) => ({ ...p, vendus_store_id: e.target.value }))
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
                      <input
                        type="text"
                        value={formData.vendus_register_id}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, vendus_register_id: e.target.value }))
                        }
                        placeholder="Ex: 67890"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Vendus Dashboard &gt; Definicoes &gt; Caixas
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.vendus_enabled}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, vendus_enabled: e.target.checked }))
                      }
                      className="rounded border-gray-300"
                    />
                    Ativar integracao Vendus para este local
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSave(loc.slug)}
                      disabled={saveStatus === "saving"}
                      className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] text-sm disabled:opacity-50"
                    >
                      {saveStatus === "saving" ? "A guardar..." : "Guardar"}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      Cancelar
                    </button>
                    {saveStatus === "saved" && (
                      <span className="text-sm text-green-600">Guardado!</span>
                    )}
                    {saveStatus && saveStatus !== "saving" && saveStatus !== "saved" && (
                      <span className="text-sm text-red-600">{saveStatus}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Location */}
      {!fetchError && (
        <>
          {!showAddForm ? (
            <button
              onClick={() => { setShowAddForm(true); setAddError(null); }}
              className="px-4 py-2 border border-dashed border-gray-300 text-gray-500 rounded-lg hover:bg-gray-50 hover:border-gray-400 text-sm w-full"
            >
              + Adicionar novo local
            </button>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Novo Local</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
                  <input
                    type="text"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Circunvalacao"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Slug</label>
                  <input
                    type="text"
                    value={newLocation.slug}
                    onChange={(e) => setNewLocation((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                    placeholder="Ex: circunvalacao"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Store ID</label>
                  <input
                    type="text"
                    value={newLocation.vendus_store_id}
                    onChange={(e) => setNewLocation((p) => ({ ...p, vendus_store_id: e.target.value }))}
                    placeholder="ID da loja no Vendus"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Register ID</label>
                  <input
                    type="text"
                    value={newLocation.vendus_register_id}
                    onChange={(e) => setNewLocation((p) => ({ ...p, vendus_register_id: e.target.value }))}
                    placeholder="ID da caixa no Vendus"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newLocation.vendus_enabled}
                  onChange={(e) => setNewLocation((p) => ({ ...p, vendus_enabled: e.target.checked }))}
                  className="rounded"
                />
                Vendus ativo
              </label>
              {addError && <p className="text-sm text-red-600">{addError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleAddLocation}
                  disabled={isAdding}
                  className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdding ? "A criar..." : "Criar"}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

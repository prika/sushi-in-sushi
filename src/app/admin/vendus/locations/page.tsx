"use client";

import { useState, useEffect, useCallback } from "react";

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
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    vendus_enabled: boolean;
    vendus_store_id: string;
    vendus_register_id: string;
  }>({ vendus_enabled: false, vendus_store_id: "", vendus_register_id: "" });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      setLocations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao obter localizacoes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleEdit = (loc: Location) => {
    setEditingSlug(loc.slug);
    setFormData({
      vendus_enabled: loc.vendus_enabled ?? false,
      vendus_store_id: loc.vendus_store_id || "",
      vendus_register_id: loc.vendus_register_id || "",
    });
    setSaveStatus(null);
  };

  const handleCancel = () => {
    setEditingSlug(null);
  };

  const handleSave = async (slug: string) => {
    setSaveStatus("A guardar...");
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
        setSaveStatus("Guardado!");
        setEditingSlug(null);
        await fetchLocations();
        setTimeout(() => setSaveStatus(null), 2000);
      } else {
        const err = await res.json();
        setSaveStatus(err.error || "Erro");
      }
    } catch (error) {
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Local
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Vendus Ativo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Store ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Register ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acao
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {locations.map((loc) => (
              <tr key={loc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {loc.name}
                </td>
                {editingSlug === loc.slug ? (
                  <>
                    <td className="px-6 py-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.vendus_enabled}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              vendus_enabled: e.target.checked,
                            }))
                          }
                          className="rounded"
                        />
                        Ativo
                      </label>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={formData.vendus_store_id}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            vendus_store_id: e.target.value,
                          }))
                        }
                        placeholder="Store ID"
                        className="w-32 px-2 py-1 border rounded text-sm"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={formData.vendus_register_id}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            vendus_register_id: e.target.value,
                          }))
                        }
                        placeholder="Register ID"
                        className="w-32 px-2 py-1 border rounded text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <button
                        onClick={() => handleSave(loc.slug)}
                        className="px-3 py-1 bg-[#D4AF37] text-black rounded text-sm hover:bg-[#C4A030]"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
                      >
                        Cancelar
                      </button>
                      {saveStatus && (
                        <span className="text-sm text-gray-500 self-center">
                          {saveStatus}
                        </span>
                      )}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4">
                      {loc.vendus_enabled ? (
                        <span className="text-green-600 font-medium">Sim</span>
                      ) : (
                        <span className="text-gray-400">Nao</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                      {loc.vendus_store_id || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                      {loc.vendus_register_id || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleEdit(loc)}
                        className="text-[#D4AF37] hover:underline text-sm"
                      >
                        Editar
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

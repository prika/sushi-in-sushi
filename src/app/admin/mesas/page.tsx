"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Table, TableStatus } from "@/types/database";
import type { TableDTO } from "@/application/use-cases/tables/GetAllTablesUseCase";
import { generateQRCodeToCanvas, buildTableOrderURLByNumber } from "@/lib/qrcode";
import { TableMap } from "@/components/admin/TableMap";
import { TableDetailModal } from "@/components/admin/TableDetailModal";
import { useTableManagement, useLocations, useSiteSettings } from "@/presentation/hooks";

type TabType = "config" | "map";

export default function MesasPage() {
  const { settings } = useSiteSettings();
  const [activeTab, setActiveTab] = useState<TabType>("map");
  const [tables, setTables] = useState<(Table & { waiter_name?: string | null })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [selectedTableForQR, setSelectedTableForQR] = useState<Table | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [formData, setFormData] = useState({
    number: 1,
    name: "",
    location: "",
    is_active: true,
  });

  // Map tab state
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedTableForDetail, setSelectedTableForDetail] = useState<TableDTO | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Table management hook
  const {
    tables: mapTables,
    isLoading: mapIsLoading,
    refresh: refreshMap,
    startWalkInSession,
    markTableInactive,
    reactivateTable,
    requestBill,
    closeSession,
  } = useTableManagement({ location: selectedLocation || undefined, refreshInterval: 15000 });

  // Locations hook for dynamic dropdowns
  const { locations } = useLocations();

  // Helper to get location label
  const getLocationLabel = (slug: string) => {
    return locations.find(loc => loc.slug === slug)?.name || slug;
  };

  // Set default location from DB
  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].slug);
    }
  }, [locations, selectedLocation]);

  useEffect(() => {
    fetchTables();
  }, []);

  // Generate QR when modal opens
  useEffect(() => {
    if (showQRModal && selectedTableForQR && qrCanvasRef.current) {
      const url = buildTableOrderURLByNumber(
        selectedTableForQR.number,
        selectedTableForQR.location,
      );
      generateQRCodeToCanvas(qrCanvasRef.current, url, { width: 250 });
    }
  }, [showQRModal, selectedTableForQR]);

  const fetchTables = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("tables")
      .select("*")
      .order("number");

    // Fetch waiter assignments
    const { data: waiterData } = await supabase
      .from("waiter_tables")
      .select("table_id, staff:staff_id(name)");

    const waiterMap = new Map<string, string>(
      (waiterData || []).map((w: any) => [
        w.table_id,
        w.staff?.name || null,
      ])
    );

    // Fetch active sessions to determine real status
    const { data: sessionsData } = await supabase
      .from("sessions")
      .select("id, table_id, status")
      .in("status", ["active", "pending_payment"]);

    const activeSessionsMap = new Map<string, string>(
      (sessionsData || []).map((s: any) => [s.table_id, s.status])
    );

    // Combine tables with waiter info and real status
    const tablesWithWaiter = (data || []).map((table) => {
      const hasActiveSession = activeSessionsMap.has(table.id);
      const _sessionStatus = activeSessionsMap.get(table.id);

      // Determine real status based on session and table state
      let realStatus: "available" | "occupied" | "reserved" | "inactive";
      if (!table.is_active) {
        realStatus = "inactive";
      } else if (hasActiveSession) {
        realStatus = "occupied";
      } else {
        realStatus = "available";
      }

      return {
        ...table,
        status: realStatus, // Override with real status
        waiter_name: waiterMap.get(table.id) || null,
      };
    });

    setTables(tablesWithWaiter);
    setIsLoading(false);
  };

  const handleOpenModal = (table?: Table) => {
    if (table) {
      setEditingTable(table);
      setFormData({
        number: table.number,
        name: table.name,
        location: table.location,
        is_active: table.is_active,
      });
    } else {
      setEditingTable(null);
      const nextNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1;
      setFormData({
        number: nextNumber,
        name: `Mesa ${nextNumber}`,
        location: locations[0]?.slug || "",
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleOpenQRModal = (table: Table) => {
    setSelectedTableForQR(table);
    setShowQRModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    if (editingTable) {
      await supabase
        .from("tables")
        .update(formData)
        .eq("id", editingTable.id);
    } else {
      await supabase.from("tables").insert(formData);
    }

    setShowModal(false);
    fetchTables();
  };

  const handleDelete = async (table: Table) => {
    if (!confirm(`Tem certeza que deseja eliminar ${table.name}?`)) return;

    const supabase = createClient();
    await supabase.from("tables").delete().eq("id", table.id);
    fetchTables();
  };

  const handleToggleActive = async (table: Table) => {
    const supabase = createClient();
    await supabase
      .from("tables")
      .update({ is_active: !table.is_active })
      .eq("id", table.id);
    fetchTables();
  };

  const handlePrintQR = (table: Table) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !qrCanvasRef.current) return;

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${table.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A6 portrait; margin: 10mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              text-align: center;
            }
            .logo { font-size: 48px; margin-bottom: 8px; }
            .restaurant-name {
              font-size: 20px;
              font-weight: 600;
              color: #333;
              margin-bottom: 24px;
              letter-spacing: 1px;
            }
            .qr-container {
              background: white;
              padding: 16px;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              margin-bottom: 24px;
            }
            .qr-image { width: 180px; height: 180px; }
            .table-label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 4px;
            }
            .table-number {
              font-size: 56px;
              font-weight: 700;
              color: #D4AF37;
              line-height: 1;
            }
            .location {
              font-size: 14px;
              color: #888;
              margin-top: 8px;
            }
            .scan-text {
              font-size: 13px;
              color: #666;
              margin-top: 24px;
              padding: 8px 16px;
              background: #f5f5f5;
              border-radius: 20px;
            }
          </style>
        </head>
        <body>
          <div class="logo">🍣</div>
          <div class="restaurant-name">SUSHI IN SUSHI</div>
          <div class="qr-container">
            <img class="qr-image" src="${qrCanvasRef.current.toDataURL()}" alt="QR Code" />
          </div>
          <div class="table-label">Mesa</div>
          <div class="table-number">${table.number}</div>
          <div class="location">${getLocationLabel(table.location)}</div>
          <div class="scan-text">Escaneie para fazer o pedido</div>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleTableClick = (table: TableDTO) => {
    setSelectedTableForDetail(table);
    setShowDetailModal(true);
  };

  const handleDetailModalClose = () => {
    setShowDetailModal(false);
    setSelectedTableForDetail(null);
  };

  const getStatusCounts = () => {
    const counts = {
      available: 0,
      reserved: 0,
      occupied: 0,
      inactive: 0,
    };
    mapTables.forEach((t) => {
      const status = (t.status as TableStatus) || "available";
      counts[status]++;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  const handlePrintAllQRs = (location?: string) => {
    const tablesToPrint = location
      ? tables.filter(t => t.location === location && t.is_active)
      : tables.filter(t => t.is_active);

    if (tablesToPrint.length === 0) {
      alert("Não há mesas ativas para imprimir.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const tablesHtml = tablesToPrint.map(table => `
      <div class="qr-card">
        <div class="logo">🍣</div>
        <div class="restaurant-name">SUSHI IN SUSHI</div>
        <div class="qr-container">
          <img class="qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
            `${window.location.origin}/mesa/${table.number}?loc=${table.location}`
          )}&format=png&margin=10" alt="QR Code" />
        </div>
        <div class="table-label">Mesa</div>
        <div class="table-number">${table.number}</div>
        <div class="location">${getLocationLabel(table.location)}</div>
        <div class="scan-text">Escaneie para fazer o pedido</div>
      </div>
    `).join("");

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Codes - Mesas</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A6 portrait; margin: 10mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .qr-card {
              page-break-after: always;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              text-align: center;
            }
            .qr-card:last-child { page-break-after: auto; }
            .logo { font-size: 48px; margin-bottom: 8px; }
            .restaurant-name {
              font-size: 20px;
              font-weight: 600;
              color: #333;
              margin-bottom: 24px;
              letter-spacing: 1px;
            }
            .qr-container {
              background: white;
              padding: 16px;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              margin-bottom: 24px;
            }
            .qr-image { width: 180px; height: 180px; }
            .table-label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 4px;
            }
            .table-number {
              font-size: 56px;
              font-weight: 700;
              color: #D4AF37;
              line-height: 1;
            }
            .location {
              font-size: 14px;
              color: #888;
              margin-top: 8px;
            }
            .scan-text {
              font-size: 13px;
              color: #666;
              margin-top: 24px;
              padding: 8px 16px;
              background: #f5f5f5;
              border-radius: 20px;
            }
          </style>
        </head>
        <body>
          ${tablesHtml}
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Group tables by location dynamically
  const tablesByLocation: Record<string, (Table & { waiter_name?: string | null })[]> = {};
  tables.forEach((t) => {
    if (!tablesByLocation[t.location]) tablesByLocation[t.location] = [];
    tablesByLocation[t.location].push(t);
  });

  const TableCard = ({ table }: { table: Table & { waiter_name?: string | null } }) => {
    // Status badge configuration
    const statusConfig = {
      available: { icon: '🟢', label: 'Livre', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
      occupied: { icon: '🔴', label: 'Ocupada', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
      reserved: { icon: '🟡', label: 'Reservada', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
      inactive: { icon: '⚫', label: 'Inativa', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
    };

    const status = (table.status as keyof typeof statusConfig) || 'available';
    const config = statusConfig[status];

    return (
      <div
        className={`relative p-4 rounded-xl border-2 text-center ${config.border} ${config.bg}`}
      >
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <span className="text-lg">{config.icon}</span>
        </div>

        <div className="text-2xl font-bold text-gray-900">#{table.number}</div>
        <div className="text-xs text-gray-500 truncate">{table.name}</div>

        {/* Status Label */}
        <div className={`text-xs font-medium ${config.text} mt-1`}>
          {config.label}
        </div>

        {table.waiter_name && (
          <div className="flex items-center justify-center gap-1 mt-1 text-xs text-blue-600">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="truncate max-w-[80px]">{table.waiter_name}</span>
          </div>
        )}

        <div className="flex justify-center gap-1 mt-2">
        <button
          onClick={() => handleOpenQRModal(table)}
          className="p-1 text-gray-400 hover:text-[#D4AF37]"
          title="Ver QR Code"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </button>
        <button
          onClick={() => handleOpenModal(table)}
          className="p-1 text-gray-400 hover:text-blue-600"
          title="Editar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => handleToggleActive(table)}
          className={`p-1 ${table.is_active ? "text-green-600" : "text-gray-400"}`}
          title={table.is_active ? "Desativar" : "Ativar"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button
          onClick={() => handleDelete(table)}
          className="p-1 text-gray-400 hover:text-red-600"
          title="Eliminar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Mesas</h1>
          <p className="text-gray-500">Mapa em tempo real e configuração</p>
        </div>
        {activeTab === "config" && (
          <div className="flex gap-2">
            <button
              onClick={() => handlePrintAllQRs()}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir QRs
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova Mesa
            </button>
          </div>
        )}
        {activeTab === "map" && (
          <button
            onClick={() => refreshMap()}
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("map")}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            activeTab === "map"
              ? "text-[#D4AF37] border-b-2 border-[#D4AF37]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Mapa em Tempo Real
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            activeTab === "config"
              ? "text-[#D4AF37] border-b-2 border-[#D4AF37]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Configuração
        </button>
      </div>

      {/* Map Tab */}
      {activeTab === "map" && (
        <>
          {/* Location Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {locations.map((location) => (
                <button
                  key={location.slug}
                  onClick={() => setSelectedLocation(location.slug)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedLocation === location.slug
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {location.name}
                </button>
              ))}
            </div>

            {/* Status Summary */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-green-500">🟢</span>
                <span className="text-gray-600">{statusCounts.available} Livres</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">🟡</span>
                <span className="text-gray-600">{statusCounts.reserved} Reservadas</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-500">🔴</span>
                <span className="text-gray-600">{statusCounts.occupied} Ocupadas</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">⚫</span>
                <span className="text-gray-600">{statusCounts.inactive} Inativas</span>
              </div>
            </div>
          </div>

          {/* Table Map */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <TableMap
              tables={mapTables}
              onTableClick={handleTableClick}
              isLoading={mapIsLoading}
            />
          </div>

          {/* Table Detail Modal */}
          <TableDetailModal
            table={selectedTableForDetail}
            isOpen={showDetailModal}
            onClose={handleDetailModalClose}
            onStatusChange={refreshMap}
            onStartSession={startWalkInSession}
            onMarkInactive={markTableInactive}
            onReactivate={reactivateTable}
            onRequestBill={requestBill}
            onCloseSession={closeSession}
          />
        </>
      )}

      {/* Config Tab */}
      {activeTab === "config" && (
        <>
          {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{tables.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Ativas</p>
          <p className="text-2xl font-bold text-green-600">{tables.filter(t => t.is_active).length}</p>
        </div>
        {locations.map((loc) => (
          <div key={loc.slug} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">{loc.name}</p>
            <p className="text-2xl font-bold text-blue-600">{(tablesByLocation[loc.slug] || []).length}</p>
          </div>
        ))}
      </div>

      {/* Tables by Location */}
      <div className="grid md:grid-cols-2 gap-6">
        {locations.map((loc) => {
          const locTables = tablesByLocation[loc.slug] || [];
          return (
            <div key={loc.slug} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-blue-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-blue-900">{loc.name}</h2>
                <button
                  onClick={() => handlePrintAllQRs(loc.slug)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir todos
                </button>
              </div>
              <div className="p-4">
                {locTables.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhuma mesa</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {locTables.map((table) => (
                      <TableCard key={table.id} table={table} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTable ? "Editar Mesa" : "Nova Mesa"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localização
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                >
                  {locations.map((location) => (
                    <option key={location.slug} value={location.slug}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Mesa ativa
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030]"
                >
                  {editingTable ? "Guardar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedTableForQR && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="text-4xl mb-2">🍣</div>
              <h3 className="text-xl font-bold mb-4">{settings?.brand_name ?? ""}</h3>

              <div className="bg-gray-50 rounded-xl p-4 mb-4 inline-block">
                <canvas
                  ref={qrCanvasRef}
                  style={{ width: 200, height: 200 }}
                />
              </div>

              <div className="text-sm text-gray-500 uppercase tracking-wider">Mesa</div>
              <div className="text-5xl font-bold text-[#D4AF37] mb-1">{selectedTableForQR.number}</div>
              <div className="text-sm text-gray-500 mb-4">{getLocationLabel(selectedTableForQR.location)}</div>

              <div className="text-xs text-gray-400 mb-6 break-all px-4">
                {buildTableOrderURLByNumber(
                  selectedTableForQR.number,
                  selectedTableForQR.location,
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowQRModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Fechar
                </button>
                <button
                  onClick={() => window.open(buildTableOrderURLByNumber(
                    selectedTableForQR.number,
                    selectedTableForQR.location,
                  ), "_blank")}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Testar
                </button>
                <button
                  onClick={() => handlePrintQR(selectedTableForQR)}
                  className="flex-1 px-4 py-2 bg-black text-white font-semibold rounded-lg hover:bg-gray-800"
                >
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

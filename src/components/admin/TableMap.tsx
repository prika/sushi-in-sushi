"use client";

import { useState } from "react";
import type { TableDTO } from "@/application/use-cases/tables/GetAllTablesUseCase";
import type { TableStatus } from "@/domain/value-objects/TableStatus";

interface TableMapProps {
  tables: TableDTO[];
  onTableClick: (_table: TableDTO) => void;
  isLoading?: boolean;
}

const statusColors: Record<TableStatus, { bg: string; border: string; text: string }> = {
  available: { bg: "bg-green-100", border: "border-green-500", text: "text-green-700" },
  reserved: { bg: "bg-yellow-100", border: "border-yellow-500", text: "text-yellow-700" },
  occupied: { bg: "bg-red-100", border: "border-red-500", text: "text-red-700" },
  inactive: { bg: "bg-gray-100", border: "border-gray-400", text: "text-gray-500" },
};

const statusIcons: Record<TableStatus, string> = {
  available: "🟢",
  reserved: "🟡",
  occupied: "🔴",
  inactive: "⚫",
};

export function TableMap({ tables, onTableClick, isLoading }: TableMapProps) {
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nenhuma mesa encontrada
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span>{statusIcons.available}</span>
          <span className="text-gray-600">Livre</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{statusIcons.reserved}</span>
          <span className="text-gray-600">Reservada</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{statusIcons.occupied}</span>
          <span className="text-gray-600">Ocupada</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{statusIcons.inactive}</span>
          <span className="text-gray-600">Inativa</span>
        </div>
      </div>

      {/* Mapa de Mesas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tables.map((table) => {
          const status = table.status;
          const colors = statusColors[status];
          const isHovered = hoveredTable === table.id;

          return (
            <div
              key={table.id}
              className="relative"
              onMouseEnter={() => setHoveredTable(table.id)}
              onMouseLeave={() => setHoveredTable(null)}
            >
              <button
                onClick={() => onTableClick(table)}
                className={`
                  w-full aspect-square rounded-xl border-2 p-3
                  flex flex-col items-center justify-center
                  transition-all duration-200
                  hover:shadow-lg hover:scale-105
                  ${colors.bg} ${colors.border}
                `}
              >
                <span className="text-2xl mb-1">{statusIcons[status]}</span>
                <span className={`text-xl font-bold ${colors.text}`}>
                  #{table.number}
                </span>
                <span className="text-xs text-gray-500 truncate max-w-full">
                  {table.name}
                </span>

                {/* Nome do Waiter */}
                {table.waiter && (
                  <div className="flex items-center gap-1 mt-1">
                    <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-xs font-medium text-blue-600 truncate max-w-full">
                      {table.waiter.name}
                    </span>
                  </div>
                )}

                {/* Info adicional para mesas ocupadas */}
                {status === "occupied" && table.activeSession && (
                  <span className="text-xs font-medium text-red-600 mt-1">
                    {table.activeSession.durationMinutes} min
                  </span>
                )}
              </button>

              {/* Tooltip */}
              {isHovered && (
                <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg">
                  <div className="font-semibold mb-1">
                    Mesa {table.number} - {table.name}
                  </div>
                  <div className="text-gray-300">
                    Estado: {table.statusLabel}
                  </div>

                  {status === "occupied" && table.activeSession && (
                    <>
                      <div className="text-gray-300">
                        Pessoas: {table.activeSession.numPeople}
                      </div>
                      <div className="text-gray-300">
                        Tipo: {table.activeSession.isRodizio ? "Rodízio" : "À Carta"}
                      </div>
                      <div className="text-gray-300">
                        Total: €{table.activeSession.totalAmount.toFixed(2)}
                      </div>
                      {table.activeSession.pendingOrdersCount > 0 && (
                        <div className="text-yellow-300">
                          Pedidos pendentes: {table.activeSession.pendingOrdersCount}
                        </div>
                      )}
                    </>
                  )}

                  {table.waiter && (
                    <div className="text-blue-300 mt-1 pt-1 border-t border-gray-700">
                      Empregado: {table.waiter.name}
                    </div>
                  )}

                  {/* Seta do tooltip */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { TableFullStatus, TableStatus } from "@/types/database";

interface TableMapProps {
  tables: TableFullStatus[];
  onTableClick: (table: TableFullStatus) => void;
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
          const status = (table.status as TableStatus) || "available";
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

                {/* Info adicional para mesas ocupadas */}
                {status === "occupied" && table.minutes_occupied !== null && (
                  <span className="text-xs font-medium text-red-600 mt-1">
                    {table.minutes_occupied} min
                  </span>
                )}

                {/* Info adicional para reservas */}
                {status === "reserved" && table.reservation_time && (
                  <span className="text-xs font-medium text-yellow-600 mt-1">
                    {table.reservation_time}
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
                    Estado: {table.status_label}
                  </div>

                  {status === "occupied" && (
                    <>
                      {table.session_people && (
                        <div className="text-gray-300">
                          Pessoas: {table.session_people}
                        </div>
                      )}
                      {table.is_rodizio !== null && (
                        <div className="text-gray-300">
                          Tipo: {table.is_rodizio ? "Rodízio" : "À Carta"}
                        </div>
                      )}
                      {table.session_total !== null && (
                        <div className="text-gray-300">
                          Total: €{table.session_total.toFixed(2)}
                        </div>
                      )}
                    </>
                  )}

                  {status === "reserved" && table.reservation_name && (
                    <div className="text-gray-300">
                      Reserva: {table.reservation_name}
                    </div>
                  )}

                  {status === "inactive" && table.status_note && (
                    <div className="text-gray-300">
                      Motivo: {table.status_note}
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

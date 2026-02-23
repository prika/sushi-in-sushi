"use client";

interface TableData {
  id: string;
  number: number;
  name: string;
  is_active: boolean;
  hasActiveSession?: boolean;
}

interface TableSelectorProps {
  tables: TableData[];
  selectedId?: string | null;
  onSelect: (_tableId: string) => void;
  showStatus?: boolean;
  disabled?: boolean;
}

export function TableSelector({
  tables,
  selectedId,
  onSelect,
  showStatus = true,
  disabled = false,
}: TableSelectorProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
      {tables.map((table) => {
        const isSelected = selectedId === table.id;
        const isOccupied = table.hasActiveSession;
        const isDisabled = disabled || !table.is_active;

        return (
          <button
            key={table.id}
            onClick={() => !isDisabled && onSelect(table.id)}
            disabled={isDisabled}
            className={`
              relative p-4 rounded-xl border-2 transition-all
              ${isSelected
                ? "border-[#D4AF37] bg-[#D4AF37]/10 ring-2 ring-[#D4AF37]/30"
                : "border-gray-200 bg-white hover:border-gray-300"
              }
              ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {/* Table Number */}
            <div className={`text-2xl font-bold ${isSelected ? "text-[#D4AF37]" : "text-gray-900"}`}>
              {table.number}
            </div>

            {/* Table Name */}
            {table.name && (
              <div className="text-xs text-gray-500 mt-1 truncate">
                {table.name}
              </div>
            )}

            {/* Status Indicator */}
            {showStatus && (
              <div
                className={`
                  absolute top-2 right-2 w-3 h-3 rounded-full
                  ${isOccupied ? "bg-red-500" : "bg-green-500"}
                `}
                title={isOccupied ? "Ocupada" : "Livre"}
              />
            )}

            {/* Selected Checkmark */}
            {isSelected && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#D4AF37] rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

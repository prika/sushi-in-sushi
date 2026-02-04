"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Card, Button } from "@/components/ui";
import { APP_URL } from "@/lib/config/constants";

interface TableData {
  id: string;
  number: number;
  name: string;
  location: string;
  is_active: boolean;
}

export default function QRCodesPage() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch tables
  useEffect(() => {
    const fetchTables = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("tables")
        .select("*")
        .eq("is_active", true)
        .order("location")
        .order("number");

      if (data) {
        setTables(data);
      }
      setIsLoading(false);
    };

    fetchTables();
  }, []);

  // Group tables by location
  const tablesByLocation = tables.reduce(
    (acc, table) => {
      if (!acc[table.location]) {
        acc[table.location] = [];
      }
      acc[table.location].push(table);
      return acc;
    },
    {} as Record<string, TableData[]>,
  );

  // Generate QR code URL
  const getQRCodeUrl = (table: TableData, size: number = 300) => {
    const mesaUrl = encodeURIComponent(
      `${APP_URL}/mesa/${table.number}?loc=${encodeURIComponent(table.location)}`,
    );
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${mesaUrl}&format=png&margin=10`;
  };

  // Get direct mesa URL
  const getMesaUrl = (table: TableData) => {
    return `${APP_URL}/mesa/${table.number}?loc=${encodeURIComponent(table.location)}`;
  };

  // Print all QR codes
  const handlePrintAll = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Codes - Sushi in Sushi</title>
          <style>
            @page {
              size: A6 portrait;
              margin: 10mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
            .qr-card {
              page-break-after: always;
              text-align: center;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              box-sizing: border-box;
            }
            .qr-card:last-child {
              page-break-after: auto;
            }
            .logo {
              font-size: 24px;
              margin-bottom: 10px;
            }
            .restaurant-name {
              font-size: 18px;
              font-weight: bold;
              color: #333;
              margin-bottom: 20px;
            }
            .qr-image {
              width: 200px;
              height: 200px;
              margin-bottom: 20px;
            }
            .table-number {
              font-size: 48px;
              font-weight: bold;
              color: #D4AF37;
              margin-bottom: 10px;
            }
            .table-label {
              font-size: 14px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .location {
              font-size: 12px;
              color: #999;
              margin-top: 10px;
            }
            .scan-text {
              font-size: 12px;
              color: #666;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          ${tables
            .map(
              (table) => `
            <div class="qr-card">
              <div class="logo">🍣</div>
              <div class="restaurant-name">Sushi in Sushi</div>
              <img class="qr-image" src="${getQRCodeUrl(table, 200)}" alt="QR Code Mesa ${table.number}" />
              <div class="table-label">Mesa</div>
              <div class="table-number">${table.number}</div>
              <div class="location">${table.location}</div>
              <div class="scan-text">Scan para fazer o pedido</div>
            </div>
          `,
            )
            .join("")}
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  // Print single QR code
  const handlePrintSingle = (table: TableData) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - Mesa ${table.number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .logo { font-size: 32px; margin-bottom: 10px; }
            .restaurant-name { font-size: 24px; font-weight: bold; margin-bottom: 30px; }
            .qr-image { width: 300px; height: 300px; margin-bottom: 30px; }
            .table-number { font-size: 72px; font-weight: bold; color: #D4AF37; }
            .table-label { font-size: 18px; color: #666; text-transform: uppercase; letter-spacing: 3px; }
            .location { font-size: 14px; color: #999; margin-top: 15px; }
            .scan-text { font-size: 14px; color: #666; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="logo">🍣</div>
          <div class="restaurant-name">Sushi in Sushi</div>
          <img class="qr-image" src="${getQRCodeUrl(table, 300)}" alt="QR Code" />
          <div class="table-label">Mesa</div>
          <div class="table-number">${table.number}</div>
          <div class="location">${table.location}</div>
          <div class="scan-text">Scan para fazer o pedido</div>
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            QR Codes das Mesas
          </h2>
          <p className="text-sm text-gray-500">{tables.length} mesas ativas</p>
        </div>
        <Button variant="primary" onClick={handlePrintAll}>
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Imprimir Todos
        </Button>
      </div>

      {/* Tables by Location */}
      {Object.entries(tablesByLocation).map(([location, locationTables]) => (
        <Card
          key={location}
          variant="light"
          header={
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{location}</h3>
              <span className="text-sm text-gray-500">
                {locationTables.length} mesas
              </span>
            </div>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {locationTables.map((table) => (
              <div
                key={table.id}
                className="bg-gray-50 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setSelectedTable(table)}
              >
                <Image
                  src={getQRCodeUrl(table, 150)}
                  alt={`QR Code Mesa ${table.number}`}
                  width={150}
                  height={150}
                  className="w-full aspect-square rounded-lg mb-3"
                  unoptimized
                />
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  Mesa
                </div>
                <div className="text-2xl font-bold text-[#D4AF37]">
                  {table.number}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Preview Modal */}
      {selectedTable && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTable(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl mb-2">🍣</div>
            <h3 className="text-xl font-bold mb-4">Sushi in Sushi</h3>

            <Image
              src={getQRCodeUrl(selectedTable, 300)}
              alt={`QR Code Mesa ${selectedTable.number}`}
              width={300}
              height={300}
              className="w-64 h-64 mx-auto rounded-lg mb-4"
              unoptimized
            />

            <div className="text-sm text-gray-500 uppercase tracking-wider">
              Mesa
            </div>
            <div className="text-5xl font-bold text-[#D4AF37] mb-2">
              {selectedTable.number}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              {selectedTable.location}
            </div>

            <div className="text-xs text-gray-400 mb-6 break-all">
              {getMesaUrl(selectedTable)}
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setSelectedTable(null)}
              >
                Fechar
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => window.open(getMesaUrl(selectedTable), "_blank")}
              >
                Testar
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => handlePrintSingle(selectedTable)}
              >
                Imprimir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

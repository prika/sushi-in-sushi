"use client";

import Link from "next/link";

export default function VendusPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vendus POS</h1>
        <p className="text-gray-500">Gestao da integracao com o sistema POS Vendus</p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sync Card */}
        <Link
          href="/admin/vendus/sync"
          className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-[#D4AF37] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Sincronizacao</h2>
              <p className="text-sm text-gray-500">Sincronizar produtos e categorias</p>
            </div>
          </div>
        </Link>

        {/* Invoices Card */}
        <Link
          href="/admin/vendus/invoices"
          className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-[#D4AF37] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Faturas</h2>
              <p className="text-sm text-gray-500">Ver faturas emitidas</p>
            </div>
          </div>
        </Link>

        {/* Mapping Card */}
        <Link
          href="/admin/vendus/mapping"
          className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-[#D4AF37] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Mapeamento</h2>
              <p className="text-sm text-gray-500">Mapear mesas com Vendus</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Sobre a Integracao Vendus</h3>
        <p className="text-blue-700 text-sm mb-4">
          A integracao com o Vendus POS permite sincronizar produtos, emitir faturas certificadas
          e enviar pedidos para a impressora da cozinha automaticamente.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-blue-700">Sincronizacao automatica a cada 15 minutos</span>
          </div>
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-blue-700">Faturas certificadas pela AT</span>
          </div>
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-blue-700">Impressao automatica na cozinha</span>
          </div>
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-blue-700">Fila de retry para operacoes falhadas</span>
          </div>
        </div>
      </div>
    </div>
  );
}

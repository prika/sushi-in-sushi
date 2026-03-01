"use client";

import { useState } from "react";
import Link from "next/link";
import { useCustomers } from "@/presentation/hooks/useCustomers";
import { useLocations } from "@/presentation/hooks";
import type { Customer, CustomerWithHistory } from "@/domain/entities/Customer";
import { CustomerTierService } from "@/domain/services/CustomerTierService";
import { type CustomerTier, CUSTOMER_TIER_LABELS, CUSTOMER_TIER_COLORS, getProfileCompleteness } from "@/domain/value-objects/CustomerTier";

const PROFILE_FIELD_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Telefone",
  birthDate: "Nascimento",
  preferredLocation: "Local",
  marketingConsent: "Marketing",
};

function getCustomerTier(customer: Customer): CustomerTier {
  return CustomerTierService.computeTierFromCustomer(customer);
}

export default function ClientesPage() {
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerWithHistory | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    birthDate: "",
    preferredLocation: "" as "circunvalacao" | "boavista" | "",
    marketingConsent: false,
  });

  // Use the clean architecture hooks
  const { locations } = useLocations();
  const { customers, isLoading, error, getById, create, update, remove } =
    useCustomers();

  // Helper to get location label
  const getLocationLabel = (slug: string) => {
    return locations.find((loc) => loc.slug === slug)?.name || slug;
  };

  const fetchCustomerHistory = async (customer: Customer) => {
    setSelectedCustomer({
      ...customer,
      reservations: 0,
      lastVisit: null,
    });
    const customerWithHistory = await getById(customer.id);
    if (customerWithHistory) {
      setSelectedCustomer(customerWithHistory);
    }
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        email: customer.email,
        name: customer.name,
        phone: customer.phone || "",
        birthDate: customer.birthDate || "",
        preferredLocation: (customer.preferredLocation || "") as
          | "circunvalacao"
          | "boavista"
          | "",
        marketingConsent: customer.marketingConsent,
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        email: "",
        name: "",
        phone: "",
        birthDate: "",
        preferredLocation: "",
        marketingConsent: false,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCustomer) {
      const result = await update(editingCustomer.id, {
        email: formData.email.toLowerCase(),
        name: formData.name,
        phone: formData.phone || undefined,
        birthDate: formData.birthDate || undefined,
        preferredLocation: formData.preferredLocation || undefined,
        marketingConsent: formData.marketingConsent,
      });

      if (!result) {
        alert(`Erro ao atualizar cliente: ${error}`);
        return;
      }
    } else {
      const result = await create({
        email: formData.email.toLowerCase(),
        name: formData.name,
        phone: formData.phone || undefined,
        birthDate: formData.birthDate || undefined,
        preferredLocation: formData.preferredLocation || undefined,
        marketingConsent: formData.marketingConsent,
      });

      if (!result) {
        alert(`Erro ao criar cliente: ${error}`);
        return;
      }
    }

    setShowModal(false);
  };

  const handleDelete = async (customer: Customer) => {
    if (
      !confirm(`Tem certeza que deseja eliminar o cliente "${customer.name}"?`)
    )
      return;

    const success = await remove(customer.id);
    if (!success) {
      alert(`Erro ao eliminar cliente: ${error}`);
      return;
    }

    if (selectedCustomer?.id === customer.id) {
      setSelectedCustomer(null);
    }
  };

  const handleToggleActive = async (customer: Customer) => {
    await update(customer.id, { isActive: !customer.isActive });
  };

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && customers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestão de Clientes
          </h1>
          <p className="text-gray-500">Programa de fidelização e histórico</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="text-yellow-500 text-2xl">⚠️</div>
            <div>
              <h3 className="font-semibold text-yellow-800 mb-2">
                Configuração Necessária
              </h3>
              <p className="text-yellow-700 mb-4">{error}</p>
              <p className="text-sm text-yellow-600">
                Execute o ficheiro{" "}
                <code className="bg-yellow-100 px-2 py-1 rounded">
                  supabase/migrations/001_user_management.sql
                </code>{" "}
                no SQL Editor do Supabase.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestão de Clientes
          </h1>
          <p className="text-gray-500">Programa de fidelização e histórico</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Novo Cliente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Total Clientes</p>
          <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Ativos</p>
          <p className="text-2xl font-bold text-green-600">
            {customers.filter((c) => c.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Com Marketing</p>
          <p className="text-2xl font-bold text-blue-600">
            {customers.filter((c) => c.marketingConsent).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Total Pontos</p>
          <p className="text-2xl font-bold text-[#D4AF37]">
            {customers.reduce((sum, c) => sum + c.points, 0)}
          </p>
        </div>
      </div>

      {/* Distribuição por patamar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <p className="text-sm text-gray-500 mb-3">Clientes por patamar</p>
        <div className="flex flex-wrap gap-3">
          {([1, 2, 3, 4, 5] as CustomerTier[]).map((tier) => {
            const count = customers.filter(
              (c) => getCustomerTier(c) === tier,
            ).length;
            const colors = CUSTOMER_TIER_COLORS[tier];
            return (
              <span
                key={tier}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}
              >
                <span className="font-bold">{count}</span>
                <span>{CUSTOMER_TIER_LABELS[tier]}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Pesquisar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patamar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pontos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visitas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Gasto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      {searchTerm
                        ? "Nenhum cliente encontrado"
                        : "Nenhum cliente registado"}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedCustomer?.id === customer.id
                          ? "bg-[#D4AF37]/5"
                          : ""
                      } ${!customer.isActive ? "opacity-50" : ""}`}
                      onClick={() => fetchCustomerHistory(customer)}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {customer.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {customer.email}
                          </div>
                          {customer.phone && (
                            <div className="text-xs text-gray-400">
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const tier = getCustomerTier(customer);
                          const colors = CUSTOMER_TIER_COLORS[tier];
                          const profile = getProfileCompleteness(customer);
                          return (
                            <div className="space-y-1">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}
                              >
                                {CUSTOMER_TIER_LABELS[tier]}
                              </span>
                              <div className="flex gap-0.5">
                                {["email", "phone", "birthDate", "preferredLocation", "marketingConsent"].map((field) => (
                                  <span
                                    key={field}
                                    title={`${PROFILE_FIELD_LABELS[field]}: ${profile.filled.includes(field) ? "sim" : "não"}`}
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      profile.filled.includes(field) ? "bg-emerald-400" : "bg-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-xs font-medium bg-[#D4AF37]/20 text-[#D4AF37] rounded-full">
                          {customer.points} pts
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 text-sm tabular-nums">
                        {customer.visitCount}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {customer.totalSpent.toFixed(2)}€
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(customer);
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Editar"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(customer);
                            }}
                            className={`p-2 rounded-lg ${
                              customer.isActive
                                ? "text-green-600 hover:bg-green-50"
                                : "text-gray-400 hover:bg-gray-100"
                            }`}
                            title={customer.isActive ? "Desativar" : "Ativar"}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(customer);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Eliminar"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Detail */}
        <div className="lg:col-span-1">
          {selectedCustomer ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  Detalhes do Cliente
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-center pb-4 border-b border-gray-200">
                  <div className="w-16 h-16 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-[#D4AF37]">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900">
                    {selectedCustomer.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {selectedCustomer.email}
                  </p>
                  {(() => {
                    const tier = getCustomerTier(selectedCustomer);
                    const colors = CUSTOMER_TIER_COLORS[tier];
                    return (
                      <span
                        className={`inline-flex mt-2 px-2.5 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}
                      >
                        {CUSTOMER_TIER_LABELS[tier]}
                      </span>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-4 text-center py-4 border-b border-gray-200">
                  <div>
                    <p className="text-xl font-bold text-[#D4AF37]">
                      {selectedCustomer.points}
                    </p>
                    <p className="text-xs text-gray-500">Pontos</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">
                      {selectedCustomer.visitCount}
                    </p>
                    <p className="text-xs text-gray-500">Visitas</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 shrink-0">Total Gasto</span>
                    <span className="text-gray-500 font-semibold text-right">
                      {Number(selectedCustomer.totalSpent).toFixed(2)}€
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 shrink-0">Telefone</span>
                    <span className="text-gray-500 text-right">
                      {selectedCustomer.phone?.trim() || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 shrink-0">
                      Data de Nascimento
                    </span>
                    <span className="text-gray-500 text-right">
                      {selectedCustomer.birthDate?.trim()
                        ? new Date(
                            selectedCustomer.birthDate,
                          ).toLocaleDateString("pt-PT")
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 shrink-0">
                      Localização Preferida
                    </span>
                    <span className="text-gray-500 text-right">
                      {selectedCustomer.preferredLocation
                        ? getLocationLabel(selectedCustomer.preferredLocation)
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 shrink-0">Marketing</span>
                    <span
                      className={`text-gray-500 text-right ${selectedCustomer.marketingConsent ? "text-green-600" : "text-gray-400"}`}
                    >
                      {selectedCustomer.marketingConsent ? "Sim" : "Não"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 shrink-0">Estado</span>
                    <span
                      className={`text-right ${selectedCustomer.isActive ? "text-green-600" : "text-gray-500"}`}
                    >
                      {selectedCustomer.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 shrink-0">Membro desde</span>
                    <span className="text-gray-500 text-right">
                      {selectedCustomer.createdAt instanceof Date
                        ? selectedCustomer.createdAt.toLocaleDateString("pt-PT")
                        : new Date(
                            selectedCustomer.createdAt,
                          ).toLocaleDateString("pt-PT")}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 shrink-0">
                      Última atualização
                    </span>
                    <span className="text-gray-500 text-right">
                      {selectedCustomer.updatedAt instanceof Date
                        ? selectedCustomer.updatedAt.toLocaleDateString("pt-PT")
                        : new Date(
                            selectedCustomer.updatedAt,
                          ).toLocaleDateString("pt-PT")}
                    </span>
                  </div>
                  {"reservations" in selectedCustomer && (
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500 shrink-0">Reservas</span>
                      <span className="text-gray-500 text-right font-medium">
                        {selectedCustomer.reservations}
                      </span>
                    </div>
                  )}
                  {"lastVisit" in selectedCustomer &&
                    selectedCustomer.lastVisit && (
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500 shrink-0">
                          Última visita
                        </span>
                        <span className="text-gray-500 text-right">
                          {selectedCustomer.lastVisit instanceof Date
                            ? selectedCustomer.lastVisit.toLocaleDateString(
                                "pt-PT",
                              )
                            : new Date(
                                selectedCustomer.lastVisit,
                              ).toLocaleDateString("pt-PT")}
                        </span>
                      </div>
                    )}
                </div>

                {/* Dados recolhidos */}
                {(() => {
                  const profile = getProfileCompleteness(selectedCustomer);
                  const allFields = ["email", "phone", "birthDate", "preferredLocation", "marketingConsent"];
                  return (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        Dados recolhidos ({profile.filled.length}/{allFields.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {allFields.map((field) => {
                          const isFilled = profile.filled.includes(field);
                          return (
                            <span
                              key={field}
                              className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                                isFilled
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-gray-50 text-gray-400 border border-gray-200"
                              }`}
                            >
                              {isFilled ? "✓" : "○"} {PROFILE_FIELD_LABELS[field]}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <Link
                  href={`/admin/clientes/${selectedCustomer.id}`}
                  className="w-full inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium justify-center bg-[#D4AF37] text-black rounded-lg hover:bg-[#C4A030] transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  Ver completo
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
              <div className="text-4xl mb-3">👤</div>
              <p className="text-gray-500">
                Selecione um cliente para ver os detalhes
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) =>
                    setFormData({ ...formData, birthDate: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localização Preferida
                </label>
                <select
                  value={formData.preferredLocation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferredLocation: e.target.value as
                        | "circunvalacao"
                        | "boavista"
                        | "",
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                >
                  <option value="">Sem preferência</option>
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
                  id="marketing_consent"
                  checked={formData.marketingConsent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      marketingConsent: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                />
                <label
                  htmlFor="marketing_consent"
                  className="text-sm text-gray-700"
                >
                  Aceita receber comunicações de marketing
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
                  {editingCustomer ? "Guardar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

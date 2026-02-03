"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Customer, Session, Order, Product, Table } from "@/types/database";

interface OrderWithDetails extends Order {
  product: Product;
}

interface SessionWithDetails extends Session {
  table: Table;
  orders: OrderWithDetails[];
}

interface CustomerWithHistory extends Customer {
  sessions: SessionWithDetails[];
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    birth_date: "",
    preferred_location: "",
    marketing_consent: false,
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Customers table error:", error);
        setDbError("A tabela de clientes ainda não foi criada. Execute a migração SQL no Supabase.");
        setIsLoading(false);
        return;
      }

      setCustomers(data || []);
      setDbError(null);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setDbError("Erro ao carregar clientes.");
    }
    setIsLoading(false);
  };

  const fetchCustomerHistory = async (customer: Customer) => {
    const supabase = createClient();

    // For now, we'll show a simplified view since customers aren't linked to sessions yet
    // In a full implementation, you'd have a customer_id on sessions or a separate customer_sessions table

    setSelectedCustomer({
      ...customer,
      sessions: [],
    });
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        email: customer.email,
        name: customer.name,
        phone: customer.phone || "",
        birth_date: customer.birth_date || "",
        preferred_location: customer.preferred_location || "",
        marketing_consent: customer.marketing_consent,
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        email: "",
        name: "",
        phone: "",
        birth_date: "",
        preferred_location: "",
        marketing_consent: false,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    const customerData = {
      email: formData.email.toLowerCase(),
      name: formData.name,
      phone: formData.phone || null,
      birth_date: formData.birth_date || null,
      preferred_location: formData.preferred_location || null,
      marketing_consent: formData.marketing_consent,
    };

    if (editingCustomer) {
      await supabase
        .from("customers")
        .update(customerData)
        .eq("id", editingCustomer.id);
    } else {
      await supabase.from("customers").insert(customerData);
    }

    setShowModal(false);
    fetchCustomers();
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Tem certeza que deseja eliminar o cliente "${customer.name}"?`)) return;

    const supabase = createClient();
    await supabase.from("customers").delete().eq("id", customer.id);
    fetchCustomers();
    if (selectedCustomer?.id === customer.id) {
      setSelectedCustomer(null);
    }
  };

  const handleToggleActive = async (customer: Customer) => {
    const supabase = createClient();
    await supabase
      .from("customers")
      .update({ is_active: !customer.is_active })
      .eq("id", customer.id);
    fetchCustomers();
  };

  const filteredCustomers = customers.filter(customer => {
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

  if (dbError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Clientes</h1>
          <p className="text-gray-500">Programa de fidelização e histórico</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="text-yellow-500 text-2xl">⚠️</div>
            <div>
              <h3 className="font-semibold text-yellow-800 mb-2">Configuração Necessária</h3>
              <p className="text-yellow-700 mb-4">{dbError}</p>
              <p className="text-sm text-yellow-600">
                Execute o ficheiro <code className="bg-yellow-100 px-2 py-1 rounded">supabase/migrations/001_user_management.sql</code> no SQL Editor do Supabase.
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
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Clientes</h1>
          <p className="text-gray-500">Programa de fidelização e histórico</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
          <p className="text-2xl font-bold text-green-600">{customers.filter(c => c.is_active).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Com Marketing</p>
          <p className="text-2xl font-bold text-blue-600">{customers.filter(c => c.marketing_consent).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Total Pontos</p>
          <p className="text-2xl font-bold text-[#D4AF37]">{customers.reduce((sum, c) => sum + c.points, 0)}</p>
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
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
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente registado"}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedCustomer?.id === customer.id ? "bg-[#D4AF37]/5" : ""
                      } ${!customer.is_active ? "opacity-50" : ""}`}
                      onClick={() => fetchCustomerHistory(customer)}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                          {customer.phone && (
                            <div className="text-xs text-gray-400">{customer.phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-sm font-semibold bg-[#D4AF37]/20 text-[#D4AF37] rounded-full">
                          {customer.points} pts
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {customer.visit_count}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {customer.total_spent.toFixed(2)}€
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
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(customer);
                            }}
                            className={`p-2 rounded-lg ${
                              customer.is_active
                                ? "text-green-600 hover:bg-green-50"
                                : "text-gray-400 hover:bg-gray-100"
                            }`}
                            title={customer.is_active ? "Desativar" : "Ativar"}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                <h3 className="font-semibold text-gray-900">Detalhes do Cliente</h3>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-center pb-4 border-b border-gray-200">
                  <div className="w-16 h-16 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-[#D4AF37]">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900">{selectedCustomer.name}</h4>
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center py-4 border-b border-gray-200">
                  <div>
                    <p className="text-2xl font-bold text-[#D4AF37]">{selectedCustomer.points}</p>
                    <p className="text-xs text-gray-500">Pontos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{selectedCustomer.visit_count}</p>
                    <p className="text-xs text-gray-500">Visitas</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Gasto</span>
                    <span className="font-semibold">{selectedCustomer.total_spent.toFixed(2)}€</span>
                  </div>
                  {selectedCustomer.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Telefone</span>
                      <span>{selectedCustomer.phone}</span>
                    </div>
                  )}
                  {selectedCustomer.birth_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Aniversário</span>
                      <span>{new Date(selectedCustomer.birth_date).toLocaleDateString("pt-PT")}</span>
                    </div>
                  )}
                  {selectedCustomer.preferred_location && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Localização Preferida</span>
                      <span className="capitalize">{selectedCustomer.preferred_location}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Marketing</span>
                    <span className={selectedCustomer.marketing_consent ? "text-green-600" : "text-gray-400"}>
                      {selectedCustomer.marketing_consent ? "Sim" : "Não"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Membro desde</span>
                    <span>{new Date(selectedCustomer.created_at).toLocaleDateString("pt-PT")}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 text-center">
                    Histórico de pedidos em breve
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
              <div className="text-4xl mb-3">👤</div>
              <p className="text-gray-500">Selecione um cliente para ver os detalhes</p>
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
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
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
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localização Preferida
                </label>
                <select
                  value={formData.preferred_location}
                  onChange={(e) => setFormData({ ...formData, preferred_location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                >
                  <option value="">Sem preferência</option>
                  <option value="circunvalacao">Circunvalação</option>
                  <option value="boavista">Boavista</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="marketing_consent"
                  checked={formData.marketing_consent}
                  onChange={(e) => setFormData({ ...formData, marketing_consent: e.target.checked })}
                  className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                />
                <label htmlFor="marketing_consent" className="text-sm text-gray-700">
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

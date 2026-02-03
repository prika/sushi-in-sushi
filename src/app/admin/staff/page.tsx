"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { StaffWithRole, Role, Table, RoleName, Location } from "@/types/database";

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffWithRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [waiterAssignments, setWaiterAssignments] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffWithRole | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningWaiter, setAssigningWaiter] = useState<StaffWithRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    role_id: 0,
    location: "" as Location | "",
    phone: "",
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = createClient();

    try {
      // Fetch staff with roles
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select(`
          *,
          role:roles(*)
        `)
        .order("created_at", { ascending: false });

      if (staffError) {
        console.error("Staff table error:", staffError);
        setDbError("As tabelas de gestão de funcionários ainda não foram criadas. Execute a migração SQL no Supabase.");
        setIsLoading(false);
        return;
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from("roles")
        .select("*")
        .order("id");

      // Fetch tables
      const { data: tablesData } = await supabase
        .from("tables")
        .select("*")
        .eq("is_active", true)
        .order("number");

      // Fetch waiter assignments
      const { data: assignmentsData } = await supabase
        .from("waiter_tables")
        .select("staff_id, table_id");

      // Group assignments by staff_id
      const assignments: Record<string, string[]> = {};
      assignmentsData?.forEach((a) => {
        if (!assignments[a.staff_id]) {
          assignments[a.staff_id] = [];
        }
        assignments[a.staff_id].push(a.table_id);
      });

      setDbError(null);
      setStaff((staffData || []) as StaffWithRole[]);
      setRoles((rolesData || []) as Role[]);
      setTables(tablesData || []);
      setWaiterAssignments(assignments);
    } catch (error) {
      console.error("Error fetching data:", error);
      setDbError("Erro ao carregar dados. Verifique se as tabelas foram criadas no Supabase.");
    }
    setIsLoading(false);
  };

  const handleOpenModal = (staffMember?: StaffWithRole) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setFormData({
        email: staffMember.email,
        name: staffMember.name,
        password: "",
        role_id: staffMember.role_id,
        location: staffMember.location || "",
        phone: staffMember.phone || "",
        is_active: staffMember.is_active,
      });
    } else {
      setEditingStaff(null);
      setFormData({
        email: "",
        name: "",
        password: "",
        role_id: roles[0]?.id || 0,
        location: "",
        phone: "",
        is_active: true,
      });
    }
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    if (editingStaff) {
      // Update existing staff
      const updateData: Record<string, unknown> = {
        email: formData.email.toLowerCase(),
        name: formData.name,
        role_id: formData.role_id,
        location: formData.location || null,
        phone: formData.phone || null,
        is_active: formData.is_active,
      };

      // Only update password if provided
      if (formData.password) {
        updateData.password_hash = formData.password; // TODO: Hash with bcrypt
      }

      await supabase
        .from("staff")
        .update(updateData)
        .eq("id", editingStaff.id);
    } else {
      // Create new staff
      await supabase.from("staff").insert({
        email: formData.email.toLowerCase(),
        name: formData.name,
        password_hash: formData.password, // TODO: Hash with bcrypt
        role_id: formData.role_id,
        location: formData.location || null,
        phone: formData.phone || null,
        is_active: formData.is_active,
      });
    }

    setShowModal(false);
    fetchData();
  };

  const handleDelete = async (staffMember: StaffWithRole) => {
    if (!confirm(`Tem certeza que deseja eliminar ${staffMember.name}?`)) {
      return;
    }

    const supabase = createClient();
    await supabase.from("staff").delete().eq("id", staffMember.id);
    fetchData();
  };

  const handleToggleActive = async (staffMember: StaffWithRole) => {
    const supabase = createClient();
    await supabase
      .from("staff")
      .update({ is_active: !staffMember.is_active })
      .eq("id", staffMember.id);
    fetchData();
  };

  const handleOpenAssignModal = (staffMember: StaffWithRole) => {
    setAssigningWaiter(staffMember);
    setShowAssignModal(true);
  };

  const handleToggleTableAssignment = async (tableId: string) => {
    if (!assigningWaiter) return;

    const supabase = createClient();
    const currentAssignments = waiterAssignments[assigningWaiter.id] || [];

    if (currentAssignments.includes(tableId)) {
      // Remove assignment
      await supabase
        .from("waiter_tables")
        .delete()
        .eq("staff_id", assigningWaiter.id)
        .eq("table_id", tableId);
    } else {
      // Add assignment
      await supabase.from("waiter_tables").insert({
        staff_id: assigningWaiter.id,
        table_id: tableId,
      });
    }

    fetchData();
  };

  const getRoleBadgeColor = (roleName: RoleName) => {
    switch (roleName) {
      case "admin":
        return "bg-red-500/20 text-red-400";
      case "kitchen":
        return "bg-orange-500/20 text-orange-400";
      case "waiter":
        return "bg-blue-500/20 text-blue-400";
      case "customer":
        return "bg-green-500/20 text-green-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getRoleLabel = (roleName: RoleName) => {
    switch (roleName) {
      case "admin":
        return "Administrador";
      case "kitchen":
        return "Cozinha";
      case "waiter":
        return "Empregado";
      case "customer":
        return "Cliente";
      default:
        return roleName;
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Funcionários</h1>
          <p className="text-gray-500">Gerir utilizadores e permissões do sistema</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Funcionários</h1>
          <p className="text-gray-500">Gerir utilizadores e permissões do sistema</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Funcionário
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{staff.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Administradores</p>
          <p className="text-2xl font-bold text-red-500">
            {staff.filter((s) => s.role.name === "admin").length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Cozinha</p>
          <p className="text-2xl font-bold text-orange-500">
            {staff.filter((s) => s.role.name === "kitchen").length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Empregados</p>
          <p className="text-2xl font-bold text-blue-500">
            {staff.filter((s) => s.role.name === "waiter").length}
          </p>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Funcionário
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Localização
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Último Login
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {staff.map((staffMember) => (
              <tr key={staffMember.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <Link
                      href={`/admin/staff/${staffMember.id}`}
                      className="font-medium text-gray-900 hover:text-[#D4AF37] transition-colors"
                    >
                      {staffMember.name}
                    </Link>
                    <div className="text-sm text-gray-500">{staffMember.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(staffMember.role.name)}`}>
                    {getRoleLabel(staffMember.role.name)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {staffMember.location === "circunvalacao"
                    ? "Circunvalação"
                    : staffMember.location === "boavista"
                    ? "Boavista"
                    : "-"}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleActive(staffMember)}
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      staffMember.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {staffMember.is_active ? "Ativo" : "Inativo"}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {staffMember.last_login
                    ? new Date(staffMember.last_login).toLocaleString("pt-PT")
                    : "Nunca"}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/staff/${staffMember.id}`}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Ver Detalhes"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    {staffMember.role.name === "waiter" && (
                      <button
                        onClick={() => handleOpenAssignModal(staffMember)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Atribuir Mesas"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenModal(staffMember)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Editar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(staffMember)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Eliminar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingStaff ? "Editar Funcionário" : "Novo Funcionário"}
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingStaff && "(deixe vazio para manter)"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                    required={!editingStaff}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                >
                  {roles
                    .filter((r) => r.name !== "customer")
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {getRoleLabel(role.name)}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localização
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value as Location | "" })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                >
                  <option value="">Todas as localizações</option>
                  <option value="circunvalacao">Circunvalação</option>
                  <option value="boavista">Boavista</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                />
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
                  Utilizador ativo
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
                  {editingStaff ? "Guardar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Tables Modal */}
      {showAssignModal && assigningWaiter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Atribuir Mesas
                </h2>
                <p className="text-sm text-gray-500">{assigningWaiter.name}</p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                {tables.map((table) => {
                  const isAssigned = (waiterAssignments[assigningWaiter.id] || []).includes(table.id);
                  return (
                    <button
                      key={table.id}
                      onClick={() => handleToggleTableAssignment(table.id)}
                      className={`p-4 rounded-xl border-2 text-center transition-colors ${
                        isAssigned
                          ? "border-[#D4AF37] bg-[#D4AF37]/10"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`text-xl font-bold ${isAssigned ? "text-[#D4AF37]" : "text-gray-700"}`}>
                        #{table.number}
                      </div>
                      <div className="text-xs text-gray-500">{table.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAssignModal(false)}
                className="w-full px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030]"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import StaffCalendar from "@/components/calendar/StaffCalendar";
import { useStaff } from "@/presentation/hooks/useStaff";
import { useTableManagement } from "@/presentation/hooks/useTableManagement";
import { useLocations } from "@/presentation/hooks";
import type { StaffWithRole } from "@/domain/entities/Staff";
import type { Staff, Location } from "@/types/database";

type TabId = "staff" | "calendar";
type RoleName = "admin" | "kitchen" | "waiter" | "customer";

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: "staff", label: "Funcionarios", icon: "👥" },
  { id: "calendar", label: "Calendario de Ausencias", icon: "📅" },
];

export default function StaffManagementPage() {
  const [activeTab, setActiveTab] = useState<TabId>("staff");
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffWithRole | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningWaiter, setAssigningWaiter] = useState<StaffWithRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Use the clean architecture hooks
  const { locations } = useLocations();
  const {
    staff,
    roles,
    tableAssignments,
    isLoading,
    error,
    create,
    update,
    remove,
    assignTables,
    _refresh,
  } = useStaff({ loadTableAssignments: true });

  const { tables } = useTableManagement();

  // Helper to get location label
  const getLocationLabel = (location: string | null) => {
    if (!location) return "-";
    return locations.find(loc => loc.slug === location)?.name || location;
  };

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    roleId: 0,
    location: "" as Location | "",
    phone: "",
    isActive: true,
  });

  const handleOpenModal = (staffMember?: StaffWithRole) => {
    // Ensure roles are loaded before opening modal for new staff
    const staffRoles = roles.filter((r) => r.name !== "customer");
    if (!staffMember && staffRoles.length === 0) {
      alert("Aguarde o carregamento dos dados antes de criar um novo funcionário.");
      return;
    }

    if (staffMember) {
      setEditingStaff(staffMember);
      setFormData({
        email: staffMember.email,
        name: staffMember.name,
        password: "",
        roleId: staffMember.roleId,
        location: (staffMember.location || "") as Location | "",
        phone: staffMember.phone || "",
        isActive: staffMember.isActive,
      });
    } else {
      setEditingStaff(null);
      const defaultRoleId = staffRoles[0]?.id || 0;
      setFormData({
        email: "",
        name: "",
        password: "",
        roleId: defaultRoleId,
        location: "",
        phone: "",
        isActive: true,
      });
    }
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate role_id is valid
    const validRoleIds = roles
      .filter((r) => r.name !== "customer")
      .map((r) => r.id);
    if (!formData.roleId || !validRoleIds.includes(formData.roleId)) {
      alert("Por favor, selecione um role válido para o funcionário.");
      return;
    }

    if (editingStaff) {
      // Update existing staff
      const updateData: Parameters<typeof update>[1] = {
        email: formData.email.toLowerCase(),
        name: formData.name,
        roleId: formData.roleId,
        location: formData.location || undefined,
        phone: formData.phone || undefined,
        isActive: formData.isActive,
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      const result = await update(editingStaff.id, updateData);
      if (!result) {
        alert(`Erro ao atualizar funcionário: ${error}`);
        return;
      }
    } else {
      // Create new staff
      const result = await create({
        email: formData.email.toLowerCase(),
        name: formData.name,
        password: formData.password,
        roleId: formData.roleId,
        location: formData.location || undefined,
        phone: formData.phone || undefined,
      });

      if (!result) {
        alert(`Erro ao criar funcionário: ${error}`);
        return;
      }
    }

    setShowModal(false);
  };

  const handleDelete = (staffMember: StaffWithRole) => {
    setConfirmDialog({
      isOpen: true,
      title: "Eliminar Funcionário",
      message: `Tem certeza que deseja eliminar ${staffMember.name}? Esta ação não pode ser revertida.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

        const success = await remove(staffMember.id);
        if (!success) {
          setConfirmDialog({
            isOpen: true,
            title: "Erro ao Eliminar",
            message: `Não foi possível eliminar o funcionário: ${error}`,
            onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
          });
        }
      },
    });
  };

  const handleToggleActive = async (staffMember: StaffWithRole) => {
    await update(staffMember.id, { isActive: !staffMember.isActive });
  };

  const handleOpenAssignModal = (staffMember: StaffWithRole) => {
    setAssigningWaiter(staffMember);
    setShowAssignModal(true);
  };

  const handleToggleTableAssignment = useCallback(async (tableId: string) => {
    if (!assigningWaiter) return;

    const currentAssignments = tableAssignments[assigningWaiter.id] || [];
    let newAssignments: string[];

    if (currentAssignments.includes(tableId)) {
      newAssignments = currentAssignments.filter((id) => id !== tableId);
    } else {
      newAssignments = [...currentAssignments, tableId];
    }

    await assignTables(assigningWaiter.id, newAssignments);
  }, [assigningWaiter, tableAssignments, assignTables]);

  const getRoleBadgeColor = (roleName: RoleName | string) => {
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

  const getRoleLabel = (roleName: RoleName | string) => {
    switch (roleName) {
      case "admin":
        return "Administrador";
      case "kitchen":
        return "Cozinha";
      case "waiter":
        return "Atendente";
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

  if (error && staff.length === 0) {
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

  // Map domain entity to legacy Staff type for StaffCalendar
  const staffForCalendar = staff.map((s) => ({
    id: s.id,
    email: s.email,
    name: s.name,
    password_hash: s.passwordHash,
    role_id: s.roleId,
    location: s.location,
    phone: s.phone,
    is_active: s.isActive,
    last_login: s.lastLogin?.toISOString() || null,
    created_at: s.createdAt.toISOString(),
  })) as Staff[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestao de Funcionarios</h1>
        <p className="text-gray-500">Gerir utilizadores e permissoes do sistema</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#D4AF37] text-[#D4AF37]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "staff" && (
        <div className="space-y-6">
          {/* Header with Button */}
          <div className="flex items-center justify-end">
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Funcionario
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
                {staff.filter((s) => s.role?.name === "admin").length}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500">Cozinha</p>
              <p className="text-2xl font-bold text-orange-500">
                {staff.filter((s) => s.role?.name === "kitchen").length}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500">Empregados</p>
              <p className="text-2xl font-bold text-blue-500">
                {staff.filter((s) => s.role?.name === "waiter").length}
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
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(staffMember.role?.name || "")}`}
                      >
                        {getRoleLabel(staffMember.role?.name || "")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {getLocationLabel(staffMember.location)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(staffMember)}
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          staffMember.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {staffMember.isActive ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {staffMember.lastLogin
                        ? new Date(staffMember.lastLogin).toLocaleString("pt-PT")
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
                        {staffMember.role?.name === "waiter" && (
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
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === "calendar" && <StaffCalendar staffList={staffForCalendar} />}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingStaff ? "Editar Funcionário" : "Novo Funcionário"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: parseInt(e.target.value) })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value as Location | "" })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                >
                  <option value="">Todas as localizações</option>
                  {locations.map((location) => (
                    <option key={location.slug} value={location.slug}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
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
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
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
                <h2 className="text-lg font-semibold text-gray-900">Atribuir Mesas</h2>
                <p className="text-sm text-gray-500">{assigningWaiter.name}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                {tables
                  .filter((t) => t.isActive)
                  .map((table) => {
                    const isAssigned = (tableAssignments[assigningWaiter.id] || []).includes(table.id);
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

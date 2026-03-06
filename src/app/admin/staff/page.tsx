"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Eye,
  EyeOff,
  Pencil,
  Upload,
  X,
  Users,
  Trash2,
} from "lucide-react";
import { ConfirmDialog } from "@/presentation/components/ui/ConfirmDialog";
import { useStaff } from "@/presentation/hooks/useStaff";
import { useTableManagement } from "@/presentation/hooks/useTableManagement";
import { useKitchenZones } from "@/presentation/hooks/useKitchenZones";
import { useLocations } from "@/presentation/hooks";
import { ChartCard, DonutChartWidget, CHART_COLORS } from "@/presentation/components/charts";
import type { StaffWithRole } from "@/domain/entities/Staff";
import type { Location } from "@/types/database";

type PanelTabId = "geral" | "site" | "mesas" | "zonas";
type RoleName = "admin" | "kitchen" | "waiter" | "customer";

/* ─── Sortable Staff Row ─── */
function SortableStaffRow({
  member,
  isEditing,
  siteOrder,
  onEdit,
  onEditSite,
  onToggleWebsite,
  onToggleActive,
  onDelete,
  getRoleBadgeColor,
  getRoleLabel,
  getLocationLabel,
}: {
  member: StaffWithRole;
  isEditing: boolean;
  siteOrder: number | null;
  onEdit: (_m: StaffWithRole) => void;
  onEditSite: (_m: StaffWithRole) => void;
  onToggleWebsite: (_m: StaffWithRole) => void;
  onToggleActive: (_m: StaffWithRole) => void;
  onDelete: (_m: StaffWithRole) => void;
  getRoleBadgeColor: (_role: string) => string;
  getRoleLabel: (_role: string) => string;
  getLocationLabel: (_loc: string | null) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: member.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-gray-50 ${isDragging ? "bg-amber-50 shadow-lg z-10 relative" : ""} ${isEditing ? "bg-amber-50/60 ring-1 ring-inset ring-[#D4AF37]/40" : ""}`}
    >
      {/* Drag handle */}
      <td className="px-3 py-3 w-10">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none p-1"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical size={16} />
        </button>
      </td>

      {/* Photo */}
      <td className="px-3 py-3 w-14">
        <button onClick={() => onEditSite(member)} className="block">
          <div className="relative h-9 w-9 shrink-0 rounded-full overflow-hidden bg-gray-100">
            {member.photoUrl ? (
              <Image
                src={member.photoUrl}
                alt={member.name}
                fill
                className="object-cover"
                sizes="36px"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400">
                <Users size={16} />
              </div>
            )}
          </div>
        </button>
      </td>

      {/* Name + email */}
      <td className="px-4 py-3">
        <div>
          <button
            onClick={() => onEdit(member)}
            className="font-medium text-gray-900 hover:text-[#D4AF37] transition-colors text-sm text-left"
          >
            {member.name}
          </button>
          <div className="text-xs text-gray-500">{member.email}</div>
        </div>
      </td>

      {/* Role */}
      <td className="px-4 py-3">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(member.role?.name || "")}`}>
          {getRoleLabel(member.role?.name || "")}
        </span>
      </td>

      {/* Location */}
      <td className="px-4 py-3 text-sm text-gray-500">
        {getLocationLabel(member.location)}
      </td>

      {/* Estado */}
      <td className="px-4 py-3">
        <button
          onClick={() => onToggleActive(member)}
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            member.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {member.isActive ? "Ativo" : "Inativo"}
        </button>
      </td>

      {/* Ordem no site */}
      <td className="px-4 py-3 text-center">
        {siteOrder !== null ? (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold">
            {siteOrder}
          </span>
        ) : (
          <span className="text-gray-300 text-sm">&mdash;</span>
        )}
      </td>

      {/* Website visibility */}
      <td className="px-3 py-3 text-center">
        <button
          onClick={() => onToggleWebsite(member)}
          className={`p-1.5 rounded-lg transition-colors ${
            member.showOnWebsite
              ? "text-green-600 hover:bg-green-50"
              : "text-gray-400 hover:bg-gray-100"
          }`}
          title={member.showOnWebsite ? "Visivel no site" : "Oculto do site"}
        >
          {member.showOnWebsite ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEdit(member)}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Editar colaborador"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(member)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
            title="Eliminar"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ─── Main Page ─── */
export default function StaffManagementPage() {
  // Calendar tab removed — ausencias are now in /admin/agenda
  const [showPanel, setShowPanel] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffWithRole | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTabId>("geral");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use the clean architecture hooks
  const { locations } = useLocations();
  const {
    staff,
    roles,
    tableAssignments,
    kitchenZoneAssignments,
    isLoading,
    error,
    create,
    update,
    remove,
    assignTables,
    assignKitchenZones,
    refresh,
  } = useStaff({ loadTableAssignments: true, loadKitchenZoneAssignments: true });

  const { tables } = useTableManagement();
  const { activeZones: kitchenZones } = useKitchenZones();

  // All staff sorted by display_order for the unified table
  const sortedStaff = [...staff].sort((a, b) => a.displayOrder - b.displayOrder);
  const websiteCount = staff.filter((m) => m.showOnWebsite).length;

  // Compute site order numbers (only for visible members)
  const siteOrderMap = new Map<string, number>();
  let orderCounter = 1;
  for (const s of sortedStaff) {
    if (s.showOnWebsite && s.isActive) {
      siteOrderMap.set(s.id, orderCounter++);
    }
  }

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

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

  // Unified form state
  const [formData, setFormData] = useState({
    // Geral
    email: "",
    name: "",
    password: "",
    roleId: 0,
    location: "" as Location | "",
    phone: "",
    isActive: true,
    // Site
    photoUrl: "",
    publicPosition: "",
    showOnWebsite: true,
  });

  // Baseline for change detection
  const [initialFormData, setInitialFormData] = useState(formData);
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);

  /* ─── Panel Handlers ─── */
  const handleOpenPanel = (staffMember?: StaffWithRole, tab?: PanelTabId) => {
    const staffRoles = roles.filter((r) => r.name !== "customer");
    if (!staffMember && staffRoles.length === 0) {
      alert("Aguarde o carregamento dos dados antes de criar um novo colaborador.");
      return;
    }

    if (staffMember) {
      setEditingStaff(staffMember);
      const data = {
        email: staffMember.email,
        name: staffMember.name,
        password: "",
        roleId: staffMember.roleId,
        location: (staffMember.location || "") as Location | "",
        phone: staffMember.phone || "",
        isActive: staffMember.isActive,
        photoUrl: staffMember.photoUrl || "",
        publicPosition: staffMember.publicPosition || "",
        showOnWebsite: staffMember.showOnWebsite,
      };
      setFormData(data);
      setInitialFormData(data);
    } else {
      setEditingStaff(null);
      const defaultRoleId = staffRoles[0]?.id || 0;
      const data = {
        email: "",
        name: "",
        password: "",
        roleId: defaultRoleId,
        location: "" as Location | "",
        phone: "",
        isActive: true,
        photoUrl: "",
        publicPosition: "",
        showOnWebsite: false,
      };
      setFormData(data);
      setInitialFormData(data);
    }
    setShowPassword(false);
    setPanelTab(tab ?? "geral");
    setShowPanel(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validRoleIds = roles
      .filter((r) => r.name !== "customer")
      .map((r) => r.id);
    if (!formData.roleId || !validRoleIds.includes(formData.roleId)) {
      alert("Por favor, selecione um role valido para o colaborador.");
      return;
    }

    setIsSaving(true);

    if (editingStaff) {
      const updateData: Parameters<typeof update>[1] = {
        email: formData.email.toLowerCase(),
        name: formData.name,
        roleId: formData.roleId,
        location: formData.location || undefined,
        phone: formData.phone || undefined,
        isActive: formData.isActive,
        photoUrl: formData.photoUrl || null,
        publicPosition: formData.publicPosition || null,
        showOnWebsite: formData.showOnWebsite,
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      const result = await update(editingStaff.id, updateData);
      if (!result) {
        alert(`Erro ao atualizar colaborador: ${error}`);
        setIsSaving(false);
        return;
      }

      // Keep panel open, update baseline
      setInitialFormData({ ...formData, password: "" });
      setFormData((prev) => ({ ...prev, password: "" }));
    } else {
      const result = await create({
        email: formData.email.toLowerCase(),
        name: formData.name,
        password: formData.password,
        roleId: formData.roleId,
        location: formData.location || undefined,
        phone: formData.phone || undefined,
      });

      if (!result) {
        alert(`Erro ao criar colaborador: ${error}`);
        setIsSaving(false);
        return;
      }

      // Close panel after creating
      setShowPanel(false);
    }

    setIsSaving(false);
  };

  const handleDelete = (staffMember: StaffWithRole) => {
    setConfirmDialog({
      isOpen: true,
      title: "Eliminar Colaborador",
      message: `Tem certeza que deseja eliminar ${staffMember.name}? Esta acao nao pode ser revertida.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

        const success = await remove(staffMember.id);
        if (success) {
          if (editingStaff?.id === staffMember.id) {
            setShowPanel(false);
          }
        } else {
          setConfirmDialog({
            isOpen: true,
            title: "Erro ao Eliminar",
            message: `Nao foi possivel eliminar o colaborador: ${error}`,
            onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
          });
        }
      },
    });
  };

  const handleToggleActive = async (staffMember: StaffWithRole) => {
    await update(staffMember.id, { isActive: !staffMember.isActive });
  };

  const handleToggleWebsite = async (member: StaffWithRole) => {
    await update(member.id, { showOnWebsite: !member.showOnWebsite });
  };

  const handleToggleTableAssignment = useCallback(async (tableId: string) => {
    if (!editingStaff) return;

    const currentAssignments = tableAssignments[editingStaff.id] || [];
    let newAssignments: string[];

    if (currentAssignments.includes(tableId)) {
      newAssignments = currentAssignments.filter((id) => id !== tableId);
    } else {
      newAssignments = [...currentAssignments, tableId];
    }

    await assignTables(editingStaff.id, newAssignments);
  }, [editingStaff, tableAssignments, assignTables]);

  const handleToggleZoneAssignment = useCallback(async (zoneId: string) => {
    if (!editingStaff) return;

    const currentAssignments = kitchenZoneAssignments[editingStaff.id] || [];
    let newAssignments: string[];

    if (currentAssignments.includes(zoneId)) {
      newAssignments = currentAssignments.filter((id) => id !== zoneId);
    } else {
      newAssignments = [...currentAssignments, zoneId];
    }

    await assignKitchenZones(editingStaff.id, newAssignments);
  }, [editingStaff, kitchenZoneAssignments, assignKitchenZones]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/admin/team-members/upload", {
        method: "POST",
        body,
      });

      if (res.ok) {
        const { url } = await res.json();
        setFormData((prev) => ({ ...prev, photoUrl: url }));
      }
    } catch {
      // ignore
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedStaff.findIndex((m) => m.id === active.id);
    const newIndex = sortedStaff.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(sortedStaff, oldIndex, newIndex);

    try {
      await fetch("/api/admin/team-members/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((m) => m.id) }),
      });
      await refresh();
    } catch {
      // ignore
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Gestao de Colaboradores</h1>
          <p className="text-gray-500">Gerir utilizadores e permissoes do sistema</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="text-yellow-500 text-2xl">⚠️</div>
            <div>
              <h3 className="font-semibold text-yellow-800 mb-2">Configuracao Necessaria</h3>
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

  // Panel tabs config
  const isWaiter = editingStaff?.role?.name === "waiter";
  const isKitchen = editingStaff?.role?.name === "kitchen";
  const currentRoleId = editingStaff ? formData.roleId : formData.roleId;
  const isWaiterByForm = roles.find((r) => r.id === currentRoleId)?.name === "waiter";
  const isKitchenByForm = roles.find((r) => r.id === currentRoleId)?.name === "kitchen";
  const showMesasTab = editingStaff ? (isWaiter || isWaiterByForm) : false;
  const showZonasTab = editingStaff ? (isKitchen || isKitchenByForm) : false;
  const mesasCount = editingStaff ? (tableAssignments[editingStaff.id] || []).length : 0;
  const zonasCount = editingStaff ? (kitchenZoneAssignments[editingStaff.id] || []).length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestao de Colaboradores</h1>
        <p className="text-gray-500">Gerir utilizadores e permissoes do sistema</p>
      </div>

      {/* ─── Colaboradores ─── */}
        <div className="space-y-6">
          {/* Header with stats + button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {staff.length} colaborador{staff.length !== 1 ? "es" : ""} · {websiteCount} visive{websiteCount !== 1 ? "is" : "l"} no site
            </p>
            <button
              onClick={() => handleOpenPanel()}
              className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] transition-colors flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Colaborador
            </button>
          </div>

          {/* Stats + Mini Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3">
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
            {/* Role donut */}
            <ChartCard title="Por Função">
              <DonutChartWidget
                height={180}
                data={[
                  { name: "Admin", value: staff.filter((s) => s.role?.name === "admin").length, color: "#EF4444" },
                  { name: "Cozinha", value: staff.filter((s) => s.role?.name === "kitchen").length, color: "#F97316" },
                  { name: "Empregado", value: staff.filter((s) => s.role?.name === "waiter").length, color: "#3B82F6" },
                ]}
                centerValue={String(staff.length)}
                centerLabel="total"
              />
            </ChartCard>
            {/* Location donut */}
            <ChartCard title="Por Local">
              <DonutChartWidget
                height={180}
                data={locations.map((loc, i) => ({
                  name: loc.name,
                  value: staff.filter((s) => s.location === loc.slug).length,
                  color: CHART_COLORS.palette[i % CHART_COLORS.palette.length],
                }))}
                centerValue={String(locations.length)}
                centerLabel="locais"
              />
            </ChartCard>
          </div>

          {/* Table + Side Panel */}
          <div className="flex gap-6">
            {/* LEFT: Staff Table */}
            <div className={showPanel ? "flex-1 min-w-0" : "w-full"}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-3 w-10"></th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-14">
                          Foto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Colaborador
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Local
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ordem
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-14">
                          Site
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acoes
                        </th>
                      </tr>
                    </thead>
                    <SortableContext
                      items={sortedStaff.map((m) => m.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <tbody className="divide-y divide-gray-200">
                        {sortedStaff.map((member) => (
                          <SortableStaffRow
                            key={member.id}
                            member={member}
                            isEditing={editingStaff?.id === member.id}
                            siteOrder={siteOrderMap.get(member.id) ?? null}
                            onEdit={(m) => handleOpenPanel(m, "geral")}
                            onEditSite={(m) => handleOpenPanel(m, "site")}
                            onToggleWebsite={handleToggleWebsite}
                            onToggleActive={handleToggleActive}
                            onDelete={handleDelete}
                            getRoleBadgeColor={getRoleBadgeColor}
                            getRoleLabel={getRoleLabel}
                            getLocationLabel={getLocationLabel}
                          />
                        ))}
                      </tbody>
                    </SortableContext>
                  </table>
                </DndContext>
              </div>

              {sortedStaff.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Nenhum colaborador registado.</p>
                </div>
              )}
            </div>

            {/* RIGHT: Side Panel */}
            {showPanel && (
              <div className="w-96 shrink-0">
                <div className="sticky top-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Panel Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-base font-semibold text-gray-900 truncate max-w-[260px]">
                      {editingStaff ? (
                        <>Editar <span className="text-[#D4AF37]">{editingStaff.name}</span></>
                      ) : (
                        "Novo Colaborador"
                      )}
                    </h2>
                    <button
                      onClick={() => setShowPanel(false)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Panel Tabs */}
                  <div className="flex border-b border-gray-200">
                    {([
                      { key: "geral" as const, label: "Geral" },
                      { key: "site" as const, label: "Site" },
                      ...(showMesasTab
                        ? [{ key: "mesas" as const, label: "Mesas", badge: mesasCount }]
                        : []),
                      ...(showZonasTab
                        ? [{ key: "zonas" as const, label: "Zonas", badge: zonasCount }]
                        : []),
                    ]).map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setPanelTab(tab.key)}
                        className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${
                          panelTab === tab.key
                            ? "text-[#D4AF37] border-b-2 border-[#D4AF37]"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {tab.label}
                        {"badge" in tab && (tab as { badge?: number }).badge !== null && (tab as { badge?: number }).badge !== undefined && (tab as { badge: number }).badge > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-600">
                            {(tab as { badge: number }).badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Panel Form */}
                  <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">

                    {/* Tab: Geral */}
                    {panelTab === "geral" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password {editingStaff && <span className="text-gray-400 font-normal">(deixe vazio para manter)</span>}
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                              required={!editingStaff}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                          <select
                            value={formData.roleId}
                            onChange={(e) => setFormData({ ...formData, roleId: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">Localizacao</label>
                          <select
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value as Location | "" })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                          >
                            <option value="">Todas as localizacoes</option>
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                          />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                          />
                          <span className="text-sm text-gray-700">Utilizador ativo</span>
                        </label>

                        {editingStaff && (
                          <div className="pt-2">
                            <Link
                              href={`/admin/staff/${editingStaff.id}`}
                              className="text-xs text-[#D4AF37] hover:underline"
                            >
                              Ver perfil completo e metricas →
                            </Link>
                          </div>
                        )}
                      </>
                    )}

                    {/* Tab: Site */}
                    {panelTab === "site" && (
                      <>
                        {/* Photo */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Foto</label>
                          <div className="flex items-center gap-4">
                            <div className="relative h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                              {formData.photoUrl ? (
                                <Image
                                  src={formData.photoUrl}
                                  alt="Preview"
                                  fill
                                  className="object-cover"
                                  sizes="80px"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-gray-300">
                                  <Users size={32} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handlePhotoUpload}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                              >
                                <Upload size={14} />
                                {isUploading ? "A carregar..." : "Carregar foto"}
                              </button>
                              {formData.photoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setFormData((p) => ({ ...p, photoUrl: "" }))}
                                  className="mt-1 text-xs text-red-500 hover:underline"
                                >
                                  Remover foto
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Public Position */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Posicao (exibida no site)
                          </label>
                          <input
                            type="text"
                            value={formData.publicPosition}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, publicPosition: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                            placeholder="Ex: Chef de Cozinha"
                          />
                        </div>

                        {/* Visibility */}
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.showOnWebsite}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, showOnWebsite: e.target.checked }))
                            }
                            className="h-4 w-4 rounded border-gray-300 text-[#D4AF37] focus:ring-[#D4AF37]"
                          />
                          <span className="text-sm text-gray-700">Visivel no site publico</span>
                        </label>
                      </>
                    )}

                    {/* Tab: Mesas */}
                    {panelTab === "mesas" && editingStaff && (
                      <>
                        <p className="text-sm text-gray-500">
                          {mesasCount} mesa{mesasCount !== 1 ? "s" : ""} atribuida{mesasCount !== 1 ? "s" : ""}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {tables
                            .filter((t) => t.isActive)
                            .map((table) => {
                              const isAssigned = (tableAssignments[editingStaff.id] || []).includes(table.id);
                              return (
                                <button
                                  key={table.id}
                                  type="button"
                                  onClick={() => handleToggleTableAssignment(table.id)}
                                  className={`p-3 rounded-xl border-2 text-center transition-colors ${
                                    isAssigned
                                      ? "border-[#D4AF37] bg-[#D4AF37]/10"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <div className={`text-lg font-bold ${isAssigned ? "text-[#D4AF37]" : "text-gray-700"}`}>
                                    #{table.number}
                                  </div>
                                  <div className="text-[10px] text-gray-500 truncate">{table.name}</div>
                                </button>
                              );
                            })}
                        </div>
                      </>
                    )}

                    {/* Tab: Zonas */}
                    {panelTab === "zonas" && editingStaff && (
                      <>
                        <p className="text-sm text-gray-500">
                          {zonasCount} zona{zonasCount !== 1 ? "s" : ""} atribuida{zonasCount !== 1 ? "s" : ""}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {kitchenZones.map((zone) => {
                            const isAssigned = (kitchenZoneAssignments[editingStaff.id] || []).includes(zone.id);
                            return (
                              <button
                                key={zone.id}
                                type="button"
                                onClick={() => handleToggleZoneAssignment(zone.id)}
                                className={`p-3 rounded-xl border-2 text-center transition-colors ${
                                  isAssigned
                                    ? "border-2"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                                style={isAssigned ? { borderColor: zone.color, backgroundColor: `${zone.color}15` } : undefined}
                              >
                                <div
                                  className="w-3 h-3 rounded-full mx-auto mb-1"
                                  style={{ backgroundColor: zone.color }}
                                />
                                <div className={`text-sm font-bold ${isAssigned ? "" : "text-gray-700"}`} style={isAssigned ? { color: zone.color } : undefined}>
                                  {zone.name}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {kitchenZones.length === 0 && (
                          <p className="text-sm text-gray-400 text-center py-4">
                            Nenhuma zona de cozinha configurada.
                          </p>
                        )}
                      </>
                    )}

                    {/* Submit Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setShowPanel(false)}
                        className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        Cancelar
                      </button>
                      {panelTab !== "mesas" && panelTab !== "zonas" && (
                        <button
                          type="submit"
                          disabled={isSaving || (editingStaff ? !hasChanges : false)}
                          className="flex-1 px-3 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving
                            ? "A guardar..."
                            : editingStaff
                              ? hasChanges
                                ? "Guardar"
                                : "Sem alteracoes"
                              : "Criar"}
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* ─── Confirm Dialog ─── */}
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

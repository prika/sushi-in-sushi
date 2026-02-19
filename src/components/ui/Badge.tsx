"use client";

interface BadgeProps {
  status: "pending" | "preparing" | "ready" | "delivered" | "cancelled";
  size?: "sm" | "md";
  className?: string;
}

const STATUS_CONFIG = {
  pending: {
    bg: "bg-yellow-500/20",
    text: "text-yellow-500",
    border: "border-yellow-500/30",
    label: "Pendente",
  },
  preparing: {
    bg: "bg-orange-500/20",
    text: "text-orange-500",
    border: "border-orange-500/30",
    label: "A Preparar",
  },
  ready: {
    bg: "bg-green-500/20",
    text: "text-green-500",
    border: "border-green-500/30",
    label: "Pronto para servir",
  },
  delivered: {
    bg: "bg-gray-500/20",
    text: "text-gray-400",
    border: "border-gray-500/30",
    label: "Entregue",
  },
  cancelled: {
    bg: "bg-red-500/20",
    text: "text-red-500",
    border: "border-red-500/30",
    label: "Cancelado",
  },
};

export function Badge({ status, size = "md", className = "" }: BadgeProps) {
  const config = STATUS_CONFIG[status];

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${config.bg}
        ${config.text}
        ${config.border}
        ${sizes[size]}
        ${className}
      `}
    >
      {config.label}
    </span>
  );
}

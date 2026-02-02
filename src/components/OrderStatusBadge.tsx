"use client";

import { useEffect, useState } from "react";
import type { OrderStatus } from "@/types/database";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  createdAt: string;
  showTime?: boolean;
  size?: "sm" | "md" | "lg";
}

const STATUS_CONFIG: Record<OrderStatus, { icon: string; label: string; color: string; bgColor: string }> = {
  pending: {
    icon: "⏳",
    label: "Pendente",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  preparing: {
    icon: "🔥",
    label: "A Preparar",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  ready: {
    icon: "✅",
    label: "Pronto",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  delivered: {
    icon: "✓",
    label: "Entregue",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
  cancelled: {
    icon: "✕",
    label: "Cancelado",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
};

function formatElapsedTime(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}min`;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h${mins > 0 ? ` ${mins}min` : ""}`;
}

export function OrderStatusBadge({
  status,
  createdAt,
  showTime = true,
  size = "md",
}: OrderStatusBadgeProps) {
  const [elapsed, setElapsed] = useState(formatElapsedTime(createdAt));
  const config = STATUS_CONFIG[status];

  // Update elapsed time every minute
  useEffect(() => {
    if (!showTime) return;

    const interval = setInterval(() => {
      setElapsed(formatElapsedTime(createdAt));
    }, 60000);

    return () => clearInterval(interval);
  }, [createdAt, showTime]);

  const sizes = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-sm gap-1.5",
    lg: "px-4 py-1.5 text-base gap-2",
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${config.bgColor} ${config.color}
        ${sizes[size]}
      `}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
      {showTime && status !== "delivered" && status !== "cancelled" && (
        <span className="opacity-70">• {elapsed}</span>
      )}
    </span>
  );
}

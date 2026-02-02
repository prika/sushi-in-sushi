"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  variant?: "dark" | "light";
  padding?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Card({
  children,
  variant = "dark",
  padding = true,
  header,
  footer,
  className = "",
}: CardProps) {
  const variants = {
    dark: "bg-gray-900 border-gray-800",
    light: "bg-white border-gray-200 text-gray-900",
  };

  return (
    <div
      className={`
        rounded-xl border
        ${variants[variant]}
        ${className}
      `}
    >
      {header && (
        <div
          className={`
            border-b px-4 py-3 font-semibold
            ${variant === "dark" ? "border-gray-800" : "border-gray-200"}
          `}
        >
          {header}
        </div>
      )}
      <div className={padding ? "p-4" : ""}>{children}</div>
      {footer && (
        <div
          className={`
            border-t px-4 py-3
            ${variant === "dark" ? "border-gray-800" : "border-gray-200"}
          `}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

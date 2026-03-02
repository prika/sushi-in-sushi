"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children: React.ReactNode;
}

export const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "#D4AF37",
      shimmerSize: _shimmerSize = "0.1em",
      shimmerDuration: _shimmerDuration = "2s",
      borderRadius = "100px",
      background = "rgba(0, 0, 0, 0.9)",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap px-8 py-4 font-sans text-sm font-medium tracking-wider uppercase transition-all duration-300",
          "hover:scale-105",
          className
        )}
        style={{
          borderRadius,
          background,
        }}
        {...props}
      >
        <div
          className="absolute inset-0 z-0 overflow-hidden"
          style={{ borderRadius }}
        >
          <div
            className="absolute inset-[-100%] animate-shimmer"
            style={{
              background: `linear-gradient(90deg, transparent 25%, ${shimmerColor}40 50%, transparent 75%)`,
              backgroundSize: "200% 100%",
            }}
          />
        </div>
        <div
          className="absolute inset-0 z-0 border-2 border-gold/50 group-hover:border-gold transition-colors duration-300"
          style={{ borderRadius }}
        />
        <span className="relative z-10 flex items-center text-white group-hover:text-gold transition-colors duration-300">
          {children}
        </span>
      </button>
    );
  }
);

ShimmerButton.displayName = "ShimmerButton";

interface ShimmerLinkProps {
  href: string;
  shimmerColor?: string;
  borderRadius?: string;
  background?: string;
  className?: string;
  children: React.ReactNode;
}

export function ShimmerLink({
  href,
  shimmerColor = "#D4AF37",
  borderRadius = "100px",
  background = "rgba(0, 0, 0, 0.9)",
  className,
  children,
}: ShimmerLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap px-8 py-4 font-sans text-sm font-medium tracking-wider uppercase transition-all duration-300",
        "hover:scale-105",
        className
      )}
      style={{ borderRadius, background }}
    >
      <div className="absolute inset-0 z-0 overflow-hidden" style={{ borderRadius }}>
        <div
          className="absolute inset-[-100%] animate-shimmer"
          style={{
            background: `linear-gradient(90deg, transparent 25%, ${shimmerColor}40 50%, transparent 75%)`,
            backgroundSize: "200% 100%",
          }}
        />
      </div>
      <div
        className="absolute inset-0 z-0 border-2 border-gold/50 group-hover:border-gold transition-colors duration-300"
        style={{ borderRadius }}
      />
      <span className="relative z-10 flex items-center text-white group-hover:text-gold transition-colors duration-300">
        {children}
      </span>
    </Link>
  );
}

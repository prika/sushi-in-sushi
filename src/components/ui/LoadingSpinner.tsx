"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "primary" | "white" | "gray";
  fullscreen?: boolean;
  text?: string;
}

export function LoadingSpinner({
  size = "md",
  color = "primary",
  fullscreen = false,
  text,
}: LoadingSpinnerProps) {
  const sizes = {
    sm: "w-5 h-5 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-3",
  };

  const colors = {
    primary: "border-[#D4AF37]",
    white: "border-white",
    gray: "border-gray-600",
  };

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`
          animate-spin rounded-full border-t-transparent
          ${sizes[size]}
          ${colors[color]}
        `}
      />
      {text && (
        <p className={`text-sm ${color === "white" ? "text-white" : "text-gray-600"}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        {spinner}
      </div>
    );
  }

  return spinner;
}
